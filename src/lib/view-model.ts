import type { Post } from './content'
import type { Category } from './site'

/**
 * 목록 뷰가 실제로 쓰는 필드만 추린 모양.
 * Post에는 컴파일된 MDX 문자열이 통째로 들어 있어서,
 * 그대로 클라이언트 컴포넌트에 넘기면 번들에 본문 전체가 실린다.
 */
export type PostCardData = {
  slug: string
  permalink: string
  title: string
  summary: string
  category: Category
  tags: string[]
  date: string
  readingTime: number
  thumbnail: string | null
}

export const toCardData = (p: Post): PostCardData => ({
  slug: p.slug,
  permalink: p.permalink,
  title: p.title,
  summary: p.summary,
  category: p.category as Category,
  tags: p.tags,
  date: p.date,
  readingTime: p.metadata.readingTime,
  thumbnail: p.thumbnail?.src ?? null,
})
