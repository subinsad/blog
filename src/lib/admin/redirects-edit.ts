/**
 * src/config/redirects.ts 에 줄을 넣고 고친다.
 *
 * 사람이 읽는 파일이라 통째로 다시 만들지 않는다. 아래 형식과 정확히
 * 같은 줄만 건드리고 주석·빈 줄은 그대로 둔다.
 */

/** 새 항목은 이 표식 바로 위에 쌓인다. 주석 문구가 아니라 표식을 찾는다. */
const ANCHOR = '/* @redirects-end */'
const ENTRY = /^\s*\{ source: '([^']*)', destination: '([^']*)' \},\s*$/

const line = (source: string, destination: string) =>
  `  { source: '${source}', destination: '${destination}' },`

export type Move = { from: string; to: string }

/**
 * 주소 이동을 반영한다.
 *
 * 이미 있는 항목의 목적지가 이번에 옮기는 주소라면 그 항목도 함께 새 주소를
 * 가리키게 한다. 안 그러면 A→B→C 로 두 번 튕기고, 한 번 더 바꾸면 세 번이
 * 된다. 자기 자신을 가리키게 된 항목은 무한 루프라서 지운다.
 */
export function applyMoves(raw: string, moves: Move[]): { next: string; added: number } | null {
  const at = raw.indexOf(ANCHOR)
  if (at === -1) throw new Error('src/config/redirects.ts 형태가 예상과 다릅니다')

  const head = raw.slice(0, at)
  const tail = raw.slice(at)
  const lines = head.split('\n')
  // 표식 앞의 들여쓰기. 마지막에 되돌려 놓아야 표식이 제 줄에 남는다.
  const indent = lines.pop() ?? '  '

  const dest = new Map(moves.map((m) => [m.from, m.to]))
  let changed = false

  // 1. 이미 있는 항목 갱신 — 목적지가 옮겨졌거나, 같은 출발지를 다시 옮기는 경우
  const kept: string[] = []
  const seen = new Set<string>()
  for (const l of lines) {
    const m = l.match(ENTRY)
    if (!m) {
      kept.push(l)
      continue
    }
    const [, source] = m
    const to = dest.get(m[2]) ?? dest.get(source) ?? m[2]
    if (source === to) {
      changed = true
      continue // 자기 자신으로 가는 항목은 버린다
    }
    seen.add(source)
    if (to !== m[2]) changed = true
    kept.push(line(source, to))
  }

  // 2. 새 항목 추가
  let added = 0
  for (const m of moves) {
    if (m.from === m.to || seen.has(m.from)) continue
    kept.push(line(m.from, m.to))
    added += 1
  }

  if (added === 0 && !changed) return null
  return { next: [...kept, indent].join('\n') + tail, added }
}
