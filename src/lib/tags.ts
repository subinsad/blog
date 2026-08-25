import { matches } from './hangul'

/**
 * 태그 비교용 정규화.
 * `Next.js` / `nextjs` / `next-js` 를 같은 것으로 본다.
 */
export const normalizeTag = (s: string) => s.toLowerCase().replace(/[.\-_\s]/g, '')

/** 사실상 같은 이름의 태그를 찾는다. */
export const findSimilar = (name: string, known: string[]) => {
  const n = normalizeTag(name)
  if (!n) return null
  return known.find((k) => normalizeTag(k) === n && k !== name) ?? null
}

export type KnownTag = { name: string; count: number }

/**
 * 자동완성 후보.
 * 많이 쓴 태그를 위로 올린다. 새 태그를 만들기보다 기존 걸 고르게 하려는 것.
 */
export const suggestTags = (query: string, known: KnownTag[], exclude: string[]) =>
  known
    .filter((t) => !exclude.includes(t.name) && matches(t.name, query))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8)
