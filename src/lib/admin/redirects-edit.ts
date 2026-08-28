/**
 * src/config/redirects.ts 에 줄을 넣고 고친다.
 *
 * 사람이 읽는 파일이라 통째로 다시 만들지 않는다. 아래 형식과 정확히
 * 같은 줄만 건드리고 주석·빈 줄은 그대로 둔다.
 */

/** 새 항목은 이 표식 바로 위에 쌓인다. 주석 문구가 아니라 표식을 찾는다. */
const ANCHOR = '/* @redirects-end */'
const ENTRY =
  /^\s*\{ source: '([^']*)', destination: '([^']*)'(?:, permanent: (true|false))? \},\s*$/

/**
 * 여기서 만든 문자열은 next.config.ts 가 import 하는 TS 소스가 된다.
 * 따옴표 하나만 섞여도 빌드가 통째로 죽으므로, 이스케이프하는 대신
 * **인코딩을 마친 경로만 받는다**고 못박고 아니면 여기서 멈춘다.
 *
 * JSON.stringify 로 이스케이프하지 않는 이유: 그러면 ENTRY 가 역슬래시를
 * 해석해야 하고, 손으로 고칠 수 있어야 한다는 이 파일의 전제가 무너진다.
 * encodeSeg(@/lib/slugify) 를 지난 값은 이 문자 집합을 벗어날 수 없다.
 */
const SAFE_PATH = /^\/[A-Za-z0-9\-._~%/]*$/

const line = (source: string, destination: string, permanent?: boolean) => {
  for (const v of [source, destination]) {
    if (!SAFE_PATH.test(v)) throw new Error(`리다이렉트에 쓸 수 없는 주소입니다: ${v}`)
  }
  const flag = permanent === false ? ', permanent: false' : ''
  return `  { source: '${source}', destination: '${destination}'${flag} },`
}

/**
 * 옛 주소 → 새 주소.
 *
 * permanent 를 생략하면 308 이다. 다시 살아날 수 있는 주소만 false(307) 로
 * 둔다 — 근거는 src/config/redirects.ts 주석에 있다.
 */
export type Move = { from: string; to: string; permanent?: boolean }

/**
 * 주소 이동을 반영한다.
 *
 * 이미 있는 항목의 목적지가 이번에 옮기는 주소라면 그 항목도 함께 새 주소를
 * 가리키게 한다. 안 그러면 A→B→C 로 두 번 튕기고, 한 번 더 바꾸면 세 번이
 * 된다. 자기 자신을 가리키게 된 항목은 무한 루프라서 지운다.
 *
 * claim 은 이번 작업으로 **다시 살아나는** 주소다. redirects() 는 라우팅보다
 * 먼저 돌기 때문에, 비워둔 주소를 재사용하면 옛 항목이 새 페이지를 통째로
 * 가린다. 그런 항목은 회수한다. 모든 move 의 to 는 자동으로 claim 이라,
 * 이름 변경 계열은 호출부가 아무것도 안 해도 처리된다.
 */
export function applyMoves(
  raw: string,
  moves: Move[],
  claim: string[] = [],
): { next: string; added: number; removed: number } | null {
  const at = raw.indexOf(ANCHOR)
  if (at === -1) throw new Error('src/config/redirects.ts 형태가 예상과 다릅니다')

  const head = raw.slice(0, at)
  const tail = raw.slice(at)
  const lines = head.split('\n')
  // 표식 앞의 들여쓰기. 마지막에 되돌려 놓아야 표식이 제 줄에 남는다.
  const indent = lines.pop() ?? '  '

  const dest = new Map(moves.map((m) => [m.from, m.to]))
  const claimed = new Set([...claim, ...moves.map((m) => m.to)])
  let changed = false
  let removed = 0

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
    // 되살아나는 주소를 가리고 있던 항목. dest 조회보다 먼저 걸러야 한다.
    if (claimed.has(source)) {
      changed = true
      removed += 1
      continue
    }
    const to = dest.get(m[2]) ?? dest.get(source) ?? m[2]
    if (source === to) {
      changed = true
      removed += 1
      continue // 자기 자신으로 가는 항목은 버린다
    }
    seen.add(source)
    if (to !== m[2]) changed = true
    // 수명은 그 항목이 원래 갖고 있던 것을 지킨다. 태그였던 주소는 목적지가
    // 어디로 따라가든 여전히 태그라서, 다시 살아날 수 있다.
    kept.push(line(source, to, m[3] === 'false' ? false : undefined))
  }

  // 2. 새 항목 추가
  let added = 0
  for (const m of moves) {
    if (m.from === m.to || seen.has(m.from)) continue
    kept.push(line(m.from, m.to, m.permanent))
    added += 1
  }

  if (added === 0 && !changed) return null
  return { next: [...kept, indent].join('\n') + tail, added, removed }
}
