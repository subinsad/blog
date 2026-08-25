import Link from 'next/link'
import { categoryCounts, posts, postsBySeries, seriesList } from '@/lib/content'
import { CATEGORY_META, CATEGORIES } from '@/lib/site'

function Item({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: string | number
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={[
        'relative mb-1 flex h-10 items-center justify-between rounded-lg px-3.5 text-[13px] transition-colors',
        active
          ? 'bg-accent-subtle text-accent before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:bg-accent'
          : 'text-fg-body hover:bg-bg-hover',
      ].join(' ')}
    >
      <span className="truncate">{label}</span>
      <span
        className={`ml-2 shrink-0 text-xs tabular-nums ${active ? 'text-accent' : 'text-fg-subtle'}`}
      >
        {count}
      </span>
    </Link>
  )
}

export function Sidebar({ active }: { active?: string }) {
  const counts = categoryCounts()

  return (
    <aside className="sticky top-[88px] self-start pt-6 max-[1024px]:static max-[1024px]:pt-5">
      <nav
        aria-label="카테고리"
        className="max-[1024px]:flex max-[1024px]:gap-2 max-[1024px]:overflow-x-auto max-[1024px]:pb-1.5 [&::-webkit-scrollbar]:hidden max-[1024px]:[scrollbar-width:none] max-[1024px]:[&_a]:mb-0 max-[1024px]:[&_a]:h-[34px] max-[1024px]:[&_a]:shrink-0 max-[1024px]:[&_a]:gap-2 max-[1024px]:[&_a]:rounded-full max-[1024px]:[&_a]:border max-[1024px]:[&_a]:border-border max-[1024px]:[&_a]:before:hidden"
      >
        <Item href="/posts" label="전체 글" count={posts.length} active={!active} />
        {CATEGORIES.map((c) => (
          <Item
            key={c}
            href={`/categories/${CATEGORY_META[c].slug}`}
            label={c}
            count={counts[c]}
            active={active === CATEGORY_META[c].slug}
          />
        ))}
        <div className="my-5 border-t border-border max-[1024px]:hidden" />
        <div className="px-3.5 pb-2.5 text-[11px] font-medium tracking-wide text-fg-subtle max-[1024px]:hidden">
          시리즈
        </div>
        {seriesList.map((s) => {
          const list = postsBySeries(s.id)
          if (list.length === 0) return null
          return (
            <Item
              key={s.id}
              href={`/series/${s.id}`}
              label={s.title}
              count={`${list.length}/${list.length}`}
              active={active === `series:${s.id}`}
            />
          )
        })}
      </nav>
    </aside>
  )
}
