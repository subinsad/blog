import Link from 'next/link'
import type { PostCardData } from '@/lib/view-model'
import { formatDate, readingTime } from '@/lib/format'
import { CategoryBadge, Tag } from './Badge'

/**
 * 목록 뷰 한 행. 컬럼은 전부 고정 폭이다 — auto를 쓰면 배지·태그 폭이
 * 행마다 달라져 세로로 훑을 때 축이 흔들린다. (DESIGN.md §4.3)
 */
export function PostRow({ post, compact = false }: { post: PostCardData; compact?: boolean }) {
  return (
    <Link
      href={post.permalink}
      className={[
        'group relative grid h-[52px] items-center gap-4 border-b border-border px-2',
        'transition-colors hover:bg-bg-hover',
        'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent before:opacity-0 hover:before:opacity-100',
        compact
          ? 'grid-cols-[92px_minmax(0,1fr)_116px_52px] max-[1024px]:grid-cols-[92px_minmax(0,1fr)_52px] max-[768px]:grid-cols-[76px_minmax(0,1fr)]'
          : 'grid-cols-[92px_minmax(0,1fr)_96px_116px_52px] max-[1024px]:grid-cols-[92px_minmax(0,1fr)_96px_52px] max-[768px]:grid-cols-[76px_minmax(0,1fr)_96px] max-[480px]:grid-cols-[70px_minmax(0,1fr)]',
      ].join(' ')}
    >
      <span className="self-center text-[13px] text-fg-muted tabular-nums">
        {formatDate(post.date)}
      </span>
      <span className="self-center truncate text-[15px] font-semibold tracking-[-0.01em] text-fg transition-colors group-hover:text-accent">
        {post.title}
      </span>
      {!compact && (
        <span className="justify-self-start self-center max-[480px]:hidden">
          <CategoryBadge category={post.category} />
        </span>
      )}
      <span className="justify-self-start self-center max-[1024px]:hidden">
        {post.tags[0] && <Tag name={post.tags[0]} />}
      </span>
      <span className="justify-self-end self-center text-[13px] text-fg-subtle tabular-nums max-[768px]:hidden">
        {readingTime(post.readingTime)}
      </span>
    </Link>
  )
}
