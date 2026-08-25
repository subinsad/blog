import { posts as allPosts, series as allSeries } from '#site/content'
import { CATEGORIES, type Category } from './site'

export type Post = (typeof allPosts)[number]
export type Series = (typeof allSeries)[number]

/** draft는 프로덕션에서 제외. 고정글 우선, 그다음 최신순. */
export const posts: Post[] = allPosts
  .filter((p) => process.env.NODE_ENV === 'development' || !p.draft)
  .sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.date.localeCompare(a.date)
  })

export const seriesList: Series[] = [...allSeries]

export const postsByCategory = (category: Category) =>
  posts.filter((p) => p.category === category)

export const postsByTag = (tag: string) =>
  posts.filter((p) => p.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))

export const postsBySeries = (id: string) =>
  posts
    .filter((p) => p.series === id)
    .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0))

export const postBySlug = (slug: string) => posts.find((p) => p.slug === slug)

export const categoryCounts = (): Record<Category, number> =>
  Object.fromEntries(
    CATEGORIES.map((c) => [c, posts.filter((p) => p.category === c).length]),
  ) as Record<Category, number>

export const tagCounts = () => {
  const map = new Map<string, number>()
  for (const p of posts) for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1)
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/** 같은 카테고리 +2점, 태그 일치 +1점. 상위 3개. */
export const relatedPosts = (post: Post, limit = 3) =>
  posts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      post: p,
      score:
        (p.category === post.category ? 2 : 0) +
        p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((x) => x.post)

export const seriesNav = (post: Post) => {
  if (!post.series) return null
  const list = postsBySeries(post.series)
  const i = list.findIndex((p) => p.slug === post.slug)
  const meta = seriesList.find((s) => s.id === post.series)
  return { meta, list, index: i, prev: list[i - 1] ?? null, next: list[i + 1] ?? null }
}
