import Link from 'next/link'
import type { PostCardData } from '@/lib/view-model'
import { CATEGORY_META, CATEGORIES } from '@/lib/site'
import { PostCard } from './PostCard'
import { PostRow } from './PostRow'

export type ViewMode = 'card' | 'list' | 'category'
export const VIEW_MODES: ViewMode[] = ['card', 'list', 'category']
export const isViewMode = (v: unknown): v is ViewMode =>
  typeof v === 'string' && (VIEW_MODES as string[]).includes(v)

export function CardView({ posts }: { posts: PostCardData[] }) {
  return (
    <div className="grid grid-cols-3 gap-6 max-[1120px]:grid-cols-2 max-[768px]:grid-cols-1">
      {posts.map((p) => (
        <PostCard key={p.slug} post={p} />
      ))}
    </div>
  )
}

export function ListView({ posts }: { posts: PostCardData[] }) {
  return (
    <div className="border-t border-border">
      {posts.map((p) => (
        <PostRow key={p.slug} post={p} />
      ))}
    </div>
  )
}

export function CategoryView({ posts }: { posts: PostCardData[] }) {
  return (
    <div>
      {CATEGORIES.map((category) => {
        const list = posts.filter((p) => p.category === category)
        if (list.length === 0) return null
        const { slug, color } = CATEGORY_META[category]
        return (
          <section key={category} className="mb-10">
            <div className="mb-1 flex items-center gap-2.5 border-b border-border-strong pb-2.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <h2 className="text-xl font-bold tracking-[-0.015em] text-fg">{category}</h2>
              <span className="ml-auto text-[13px] text-fg-muted tabular-nums">
                {list.length}개
              </span>
            </div>
            <div>
              {list.slice(0, 5).map((p) => (
                <PostRow key={p.slug} post={p} compact />
              ))}
            </div>
            {list.length > 5 && (
              <Link
                href={`/categories/${slug}`}
                className="block pt-3.5 text-right text-[13px] text-accent hover:text-accent-hover"
              >
                전체 {list.length}개 보기 →
              </Link>
            )}
          </section>
        )
      })}
    </div>
  )
}

export function PostViews({ posts, view }: { posts: PostCardData[]; view: ViewMode }) {
  if (posts.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-fg-muted">아직 글이 없습니다.</p>
    )
  }
  if (view === 'list') return <ListView posts={posts} />
  if (view === 'category') return <CategoryView posts={posts} />
  return <CardView posts={posts} />
}
