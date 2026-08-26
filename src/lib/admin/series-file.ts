/**
 * 시리즈 하나 = `content/series/<id>.yml` 파일 하나.
 *
 * frontmatter-edit 과 같은 원칙을 쓴다 — 파일을 통째로 다시 만들지 않고
 * 바꾸는 줄만 갈아끼운다. 손으로 쓴 주석이나 velite 가 무시하는 여분의
 * 키가 있어도 그대로 남는다.
 */
import { fieldLines, yamlScalar } from './frontmatter-edit'

export const seriesPath = (id: string) => `content/series/${id}.yml`

export const seriesUrl = (id: string) => `/series/${id}`

export function buildSeriesYml(id: string, title: string, description: string): string {
  const lines = [`id: ${id}`, `title: ${yamlScalar(title)}`]
  if (description) lines.push(`description: ${yamlScalar(description)}`)
  return lines.join('\n') + '\n'
}

export type SeriesPatch = { title: string; description: string }

/**
 * title·description 을 갈아끼운다. 설명이 비면 그 줄을 지운다.
 * 바뀔 내용이 없으면 null.
 */
export function editSeriesYml(
  raw: string,
  patch: SeriesPatch,
): { next: string; fields: string[]; before: string; after: string } | null {
  // 마지막 개행은 join 뒤에 되살린다. 안 그러면 편집할 때마다 빈 줄이 는다.
  const trailing = /\n$/.test(raw) ? '\n' : ''
  const lines = raw.replace(/\n$/, '').split(/\r?\n/)

  const fields: string[] = []
  const before: string[] = []
  const after: string[] = []

  const put = (field: 'title' | 'description', line: string | null) => {
    const range = fieldLines(lines, field)
    const was = range ? lines.slice(range.start, range.end + 1).join('\n') : ''
    const will = line ?? ''
    if (was === will) return

    if (range) {
      if (line === null) lines.splice(range.start, range.end - range.start + 1)
      else lines.splice(range.start, range.end - range.start + 1, line)
    } else {
      if (line === null) return
      // id 바로 뒤가 자연스러운 자리다. id 가 없으면 맨 끝.
      const id = fieldLines(lines, 'id')
      lines.splice(id ? id.end + 1 : lines.length, 0, line)
    }

    fields.push(field)
    before.push(was || `(${field} 없음)`)
    after.push(will || `(${field} 삭제)`)
  }

  put('title', `title: ${yamlScalar(patch.title)}`)
  put('description', patch.description ? `description: ${yamlScalar(patch.description)}` : null)

  if (fields.length === 0) return null
  return {
    next: lines.join('\n') + trailing,
    fields,
    before: before.join('\n'),
    after: after.join('\n'),
  }
}
