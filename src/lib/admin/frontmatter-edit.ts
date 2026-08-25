/**
 * frontmatter를 통째로 다시 직렬화하지 않고 **바꾸는 필드의 줄만** 갈아끼운다.
 *
 * 전체 재직렬화는 키 순서가 뒤바뀌고 주석·따옴표 스타일이 날아간다.
 * 이 도구는 사람이 손으로 쓴 글 파일을 여러 개 동시에 건드리므로,
 * diff에 의도한 줄만 나타나는 것이 신뢰의 전제다.
 */

/** 편집 대상 필드 */
export type FieldName = 'tags' | 'category' | 'pinned' | 'series' | 'seriesOrder'
/** 삽입 위치 기준으로만 쓰는 필드까지 포함 */
export type AnyField = FieldName | 'title' | 'date' | 'summary'

const FM = /^(---\r?\n)([\s\S]*?)(\r?\n---)(\r?\n[\s\S]*)?$/

export function splitFrontmatter(raw: string) {
  const m = raw.match(FM)
  if (!m) return null
  return { open: m[1], body: m[2], close: m[3], rest: m[4] ?? '' }
}

/** YAML 스칼라 인용 규칙 — frontmatter.ts와 같은 규칙을 쓴다. */
export const yamlScalar = (s: string) => {
  if (s === '' || /^[\s>|&*!%@`[{]|[:#]\s|["']|\s$/.test(s)) return JSON.stringify(s)
  return s
}

export const yamlList = (items: string[]) =>
  `[${items.map(yamlScalar).join(', ')}]`

/** 해당 필드가 차지하는 줄 범위를 찾는다. 블록 리스트(- 로 시작하는 여러 줄)도 포함. */
function findField(lines: string[], field: AnyField) {
  const head = new RegExp(`^${field}\\s*:`)
  const start = lines.findIndex((l) => head.test(l))
  if (start === -1) return null
  let end = start
  for (let i = start + 1; i < lines.length; i++) {
    // 들여쓰기된 줄이거나 블록 리스트 항목이면 같은 필드에 속한다
    if (/^\s+\S/.test(lines[i]) || /^\s*-\s/.test(lines[i])) end = i
    else break
  }
  return { start, end }
}

export function readField(raw: string, field: FieldName): string | null {
  const fm = splitFrontmatter(raw)
  if (!fm) return null
  const lines = fm.body.split(/\r?\n/)
  const range = findField(lines, field)
  if (!range) return null
  return lines.slice(range.start, range.end + 1).join('\n')
}

export type FieldEdit = {
  /** 새 줄. null이면 필드를 통째로 삭제한다. */
  next: string | null
}

/**
 * 필드 한 개를 교체한다. 필드가 없고 next가 있으면 지정한 앵커 뒤에 삽입한다.
 * 반환값이 null이면 바뀔 내용이 없다는 뜻이다.
 */
export function editField(
  raw: string,
  field: FieldName,
  edit: FieldEdit,
  insertAfter: AnyField[] = ['category', 'date', 'title'],
): { next: string; beforeLine: string; afterLine: string } | null {
  const fm = splitFrontmatter(raw)
  if (!fm) return null

  const lines = fm.body.split(/\r?\n/)
  const range = findField(lines, field)
  const beforeLine = range ? lines.slice(range.start, range.end + 1).join('\n') : ''

  if (range) {
    if (edit.next === null) lines.splice(range.start, range.end - range.start + 1)
    else lines.splice(range.start, range.end - range.start + 1, edit.next)
  } else {
    if (edit.next === null) return null
    let at = lines.length
    for (const anchor of insertAfter) {
      const r = findField(lines, anchor)
      if (r) {
        at = r.end + 1
        break
      }
    }
    lines.splice(at, 0, edit.next)
  }

  const afterLine = edit.next ?? ''
  if (beforeLine === afterLine) return null

  return {
    next: fm.open + lines.join('\n') + fm.close + fm.rest,
    beforeLine,
    afterLine,
  }
}
