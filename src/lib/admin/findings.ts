import type { PostMeta } from './scan'

export type Finding = {
  id: string
  level: 'error' | 'suggest'
  message: string
  count: number
  href: string
  action: string
}

/** 태그 목록에서 사이트에 노출되지 않는 것 (DESIGN.md — 글 3개 미만은 숨김) */
export const HIDE_BELOW = 3

const norm = (s: string) => s.toLowerCase().replace(/[.\-_\s]/g, '')

export function tagCounts(posts: PostMeta[]) {
  const m = new Map<string, number>()
  for (const p of posts) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
}

/** 이름이 사실상 같은 태그 쌍 (React / react / React.js) */
export function similarTagPairs(tags: string[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      if (norm(tags[i]) === norm(tags[j])) pairs.push([tags[i], tags[j]])
    }
  }
  return pairs
}

/**
 * 전체의 90% 이상에 해당하는 항목은 발견이 아니라 그 사람의 결정이다.
 * (썸네일이 0/9인 것은 "할 일"이 아니라 "이 블로그는 썸네일을 안 쓴다"는 뜻)
 */
const isDecision = (count: number, total: number) => total > 0 && count / total >= 0.9

export function buildFindings(posts: PostMeta[]): Finding[] {
  const out: Finding[] = []
  const counts = tagCounts(posts)

  // ── 오류: 렌더가 실제로 깨지는 것 ──
  const seriesGroups = new Map<string, PostMeta[]>()
  for (const p of posts) {
    if (!p.series) continue
    seriesGroups.set(p.series, [...(seriesGroups.get(p.series) ?? []), p])
  }
  let orderProblems = 0
  for (const [, list] of seriesGroups) {
    const orders = list.map((p) => p.seriesOrder)
    if (orders.some((o) => o === null)) orderProblems++
    else if (new Set(orders).size !== orders.length) orderProblems++
  }
  if (orderProblems > 0) {
    out.push({
      id: 'series-order',
      level: 'error',
      message: '시리즈 순서 번호가 비었거나 중복입니다',
      count: orderProblems,
      href: '/admin/series',
      action: '시리즈 열기',
    })
  }

  const noSummary = posts.filter((p) => !p.title || !p.date).length
  if (noSummary > 0) {
    out.push({
      id: 'missing-fields',
      level: 'error',
      message: '필수 프론트매터가 빠진 글이 있습니다',
      count: noSummary,
      href: '/admin/posts',
      action: '글 열기',
    })
  }

  // ── 제안 ──
  const hidden = counts.filter(([, n]) => n < HIDE_BELOW)
  if (hidden.length > 0 && !isDecision(hidden.length, counts.length)) {
    out.push({
      id: 'hidden-tags',
      level: 'suggest',
      message: `태그 ${hidden.length}개가 글 ${HIDE_BELOW}개 미만이라 사이트에 노출되지 않습니다`,
      count: hidden.length,
      href: '/admin/tags?filter=hidden',
      action: '정리하기',
    })
  } else if (hidden.length > 0) {
    // 90% 이상이면 "정리 대상"이 아니라 이 블로그의 태그 운용 방식이다
    out.push({
      id: 'hidden-tags-many',
      level: 'suggest',
      message: `태그 ${hidden.length}개가 노출되지 않습니다. 태그를 잘게 쓰고 계신다면 노출 기준을 낮추는 것도 방법입니다`,
      count: hidden.length,
      href: '/admin/tags?filter=hidden',
      action: '정리하기',
    })
  }

  const pairs = similarTagPairs(counts.map(([t]) => t))
  if (pairs.length > 0) {
    out.push({
      id: 'similar-tags',
      level: 'suggest',
      message: `이름이 사실상 같은 태그 쌍이 있습니다 · ${pairs.map((p) => p.join(' / ')).join(', ')}`,
      count: pairs.length,
      href: '/admin/tags?filter=similar',
      action: '확인하기',
    })
  }

  const lonelySeries = [...seriesGroups.values()].filter((l) => l.length === 1).length
  if (lonelySeries > 0) {
    out.push({
      id: 'lonely-series',
      level: 'suggest',
      message: '글이 1개뿐인 시리즈가 있습니다',
      count: lonelySeries,
      href: '/admin/series',
      action: '시리즈 열기',
    })
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
}
