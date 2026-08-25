import Image from 'next/image'
import Link from 'next/link'
import type { PostCardData } from '@/lib/view-model'
import { CATEGORY_META } from '@/lib/site'
import { formatDateShort, readingTime } from '@/lib/format'
import { CategoryBadge, Tag } from './Badge'

export function PostCard({ post }: { post: PostCardData }) {
  const color = CATEGORY_META[post.category].color
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
      <Link href={post.permalink} className="flex flex-1 flex-col">
        <div
          className="relative grid aspect-video place-items-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 26%, transparent), color-mix(in srgb, ${color} 8%, transparent))`,
          }}
        >
          {post.thumbnail ? (
            <Image
              src={post.thumbnail}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          ) : (
            <span
              className="text-[22px] font-bold tracking-tight opacity-15"
              style={{ color }}
            >
              {post.category}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <CategoryBadge category={post.category} />
          <h2 className="mt-2 mb-1.5 line-clamp-2 text-[17px] leading-[1.45] font-semibold tracking-[-0.01em] text-fg transition-colors group-hover:text-accent">
            {post.title}
          </h2>
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
            {post.summary}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {post.tags.slice(0, 2).map((t) => (
                <Tag key={t} name={t} />
              ))}
            </div>
            <span className="shrink-0 text-[13px] text-fg-subtle tabular-nums">
              {formatDateShort(post.date)} · {readingTime(post.readingTime)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
