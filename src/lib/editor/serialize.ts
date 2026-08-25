import type { JSONContent } from '@tiptap/core'
import { isMarkColor } from './marks'

/**
 * TipTap 문서 → 마크다운(MDX).
 * tiptap-markdown 대신 직접 쓴 이유: <Mark>·<Caption> 같은 커스텀 컴포넌트로
 * 나가야 하는데, 범용 직렬화기에 그 규칙을 끼워 넣는 게 더 번거롭다.
 */

const escapeText = (s: string) =>
  s.replace(/([\\`*_[\]])/g, '\\$1')

function inline(node: JSONContent): string {
  if (node.type === 'hardBreak') return '  \n'
  if (node.type !== 'text') return ''

  let out = escapeText(node.text ?? '')
  const marks = node.marks ?? []

  // code는 다른 마크와 겹칠 수 없으므로 먼저 처리하고 이스케이프를 되돌린다
  if (marks.some((m) => m.type === 'code')) {
    return `\`${node.text ?? ''}\``
  }

  for (const m of marks) {
    if (m.type === 'bold') out = `**${out}**`
    else if (m.type === 'italic') out = `*${out}*`
    else if (m.type === 'strike') out = `~~${out}~~`
    else if (m.type === 'underline') out = `<u>${out}</u>`
    else if (m.type === 'link') out = `[${out}](${m.attrs?.href ?? ''})`
    else if (m.type === 'textColor' && isMarkColor(m.attrs?.color))
      out = `<Mark c="${m.attrs.color}">${out}</Mark>`
    else if (m.type === 'bgColor' && isMarkColor(m.attrs?.color))
      out = `<Mark bg="${m.attrs.color}">${out}</Mark>`
  }
  return out
}

const inlines = (nodes?: JSONContent[]) => (nodes ?? []).map(inline).join('')

function block(node: JSONContent, depth = 0): string {
  const indent = '  '.repeat(depth)

  switch (node.type) {
    case 'paragraph': {
      const text = inlines(node.content)
      if (!text.trim()) return ''
      // 캡션은 문단에 클래스를 달아 구분한다
      if (node.attrs?.caption) return `<Caption>${text}</Caption>`
      return text
    }
    case 'heading':
      return `${'#'.repeat(Number(node.attrs?.level ?? 2))} ${inlines(node.content)}`
    case 'blockquote':
      return (node.content ?? [])
        .map((c: JSONContent) => block(c, depth))
        .filter(Boolean)
        .join('\n\n')
        .split('\n')
        .map((l: string) => `> ${l}`.trimEnd())
        .join('\n')
    case 'codeBlock': {
      const lang = node.attrs?.language ?? ''
      const body = (node.content ?? []).map((c: JSONContent) => c.text ?? '').join('')
      return `\`\`\`${lang}\n${body}\n\`\`\``
    }
    case 'horizontalRule':
      return '---'
    case 'bulletList':
    case 'orderedList': {
      const ordered = node.type === 'orderedList'
      const start = Number(node.attrs?.start ?? 1)
      return (node.content ?? [])
        .map((li: JSONContent, i: number) => {
          const bullet = ordered ? `${start + i}. ` : '- '
          const inner = (li.content ?? [])
            .map((c: JSONContent) => block(c, depth + 1))
            .filter(Boolean)
            .join('\n\n')
          const [first, ...rest] = inner.split('\n')
          const pad = ' '.repeat(bullet.length)
          return [
            `${indent}${bullet}${first}`,
            ...rest.map((l: string) => (l ? `${indent}${pad}${l}` : '')),
          ].join('\n')
        })
        .join('\n')
    }
    case 'image':
      return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''})`
    default:
      return inlines(node.content)
  }
}

export function docToMarkdown(doc: JSONContent): string {
  return (doc.content ?? [])
    .map((n: JSONContent) => block(n))
    .filter((s: string) => s.trim().length > 0)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
