import type { Draft } from './frontmatter'

/**
 * 초안은 타이핑 중에는 브라우저에만 쌓인다.
 *
 * 프로덕션에서 저장은 곧 저장소 커밋이다. 3초 debounce로 커밋하면
 * 글 하나 쓰는 동안 커밋이 수십 개 쌓이고 히스토리가 못 쓰게 된다.
 * 그래서 자동 저장은 로컬에만 하고, 커밋은 사람이 누를 때만 한다.
 */
const KEY = (slug: string) => `subbi.draft.${slug || '__new'}`

export type LocalDraft = { draft: Draft; body: string; at: number }

export function saveLocal(slug: string, draft: Draft, body: string) {
  try {
    localStorage.setItem(KEY(slug), JSON.stringify({ draft, body, at: Date.now() }))
  } catch {
    // 용량 초과 등은 조용히 넘긴다. 저장소 커밋이 정본이다.
  }
}

export function loadLocal(slug: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(KEY(slug))
    return raw ? (JSON.parse(raw) as LocalDraft) : null
  } catch {
    return null
  }
}

export function clearLocal(slug: string) {
  try {
    localStorage.removeItem(KEY(slug))
  } catch {
    // 무시
  }
}

export const sinceLabel = (at: number) => {
  const s = Math.floor((Date.now() - at) / 1000)
  if (s < 10) return '방금'
  if (s < 60) return `${s}초 전`
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  return `${Math.floor(s / 3600)}시간 전`
}
