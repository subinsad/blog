import { loadPosts } from '@/lib/admin/posts'
import { tagCounts } from '@/lib/admin/findings'
import { PostsClient, type PostRow } from '@/components/admin/PostsClient'

export default async function AdminPostsPage() {
  const posts = await loadPosts()

  const rows: PostRow[] = posts.map((p) => ({
    slug: p.file.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    tags: p.tags,
    pinned: p.pinned,
    draft: p.draft,
  }))

  return (
    <>
      <h1 className="text-xl font-bold tracking-[-0.015em] text-fg">글</h1>
      <p className="mt-1.5 mb-6 text-[13px] leading-relaxed text-fg-muted">
        여러 글을 골라 태그를 붙이거나 카테고리를 옮기고, 고정 여부를 바꿉니다. 제목을 누르면
        편집기로 갑니다.
      </p>
      <PostsClient rows={rows} knownTags={tagCounts(posts).map(([t]) => t)} />
    </>
  )
}
