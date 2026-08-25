import { loadPosts } from '@/lib/admin/scan'
import { tagCounts, similarTagPairs, HIDE_BELOW } from '@/lib/admin/findings'
import { TagsClient, type TagRow } from '@/components/admin/TagsClient'

export default async function AdminTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const posts = await loadPosts()
  const counts = tagCounts(posts)
  const pairs = similarTagPairs(counts.map(([t]) => t))

  const rows: TagRow[] = counts.map(([name, count]) => ({
    name,
    count,
    hidden: count < HIDE_BELOW,
    similarTo: pairs
      .filter(([a, b]) => a === name || b === name)
      .map(([a, b]) => (a === name ? b : a)),
  }))

  const initialFilter =
    filter === 'hidden' || filter === 'similar' ? filter : 'all'

  return (
    <>
      <h1 className="text-xl font-bold tracking-[-0.015em] text-fg">태그</h1>
      <p className="mt-1.5 mb-6 text-[13px] text-fg-muted">
        글 {HIDE_BELOW}개 미만인 태그는 사이트 목록에 노출되지 않습니다. 사용 수가 적은 순으로
        정렬됩니다.
      </p>
      <TagsClient rows={rows} initialFilter={initialFilter} />
    </>
  )
}
