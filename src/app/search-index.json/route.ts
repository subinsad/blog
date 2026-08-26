import { posts } from '@/lib/content'
import type { SearchDoc } from '@/lib/search'

/**
 * 검색 인덱스를 정적 파일로 굽는다.
 *
 * 페이지 번들에 심으면 모든 방문자가 전체 글 메타데이터를 받는다.
 * 검색을 처음 열 때만 가져오도록 분리한다.
 */
export const dynamic = 'force-static'

export function GET() {
  const docs: SearchDoc[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    category: p.category,
    tags: p.tags,
    date: p.date,
  }))

  return Response.json(docs, {
    headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
  })
}
