import { loadPosts } from '@/lib/admin/posts'
import { seriesList } from '@/lib/content'
import {
  SeriesClient,
  type SeriesPost,
  type FreePost,
} from '@/components/admin/SeriesClient'

export default async function AdminSeriesPage() {
  const posts = await loadPosts()

  const postsBySeries: Record<string, SeriesPost[]> = {}
  for (const s of seriesList) {
    postsBySeries[s.id] = posts
      .filter((p) => p.series === s.id)
      .map((p) => ({
        slug: p.file.slug,
        title: p.title,
        date: p.date,
        order: p.seriesOrder,
      }))
      // 번호가 비어 있으면 맨 뒤로 보낸다. 저장하면 1부터 다시 매겨진다.
      .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
  }

  const freePosts: FreePost[] = posts
    .filter((p) => !p.series)
    .map((p) => ({ slug: p.file.slug, title: p.title, date: p.date }))

  return (
    <>
      <h1 className="text-xl font-bold tracking-[-0.015em] text-fg">시리즈</h1>
      <p className="mt-1.5 mb-6 text-[13px] leading-relaxed text-fg-muted">
        시리즈를 만들고, 제목·설명을 고치고, 글을 넣고 뺍니다. 끌어서 순서를 바꾸고 저장하면 1부터
        다시 매겨집니다. 번호가 비었거나 겹친 것도 함께 정리됩니다. 행에 포커스를 두고{' '}
        <kbd className="font-mono">⌘↑</kbd> <kbd className="font-mono">⌘↓</kbd> 로도 옮길 수
        있습니다.
      </p>
      <SeriesClient
        series={seriesList.map((s) => ({ id: s.id, title: s.title, description: s.description }))}
        postsBySeries={postsBySeries}
        freePosts={freePosts}
      />
    </>
  )
}
