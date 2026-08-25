'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/admin', label: '개요' },
  { href: '/admin/posts', label: '글' },
  { href: '/admin/tags', label: '태그' },
  { href: '/admin/series', label: '시리즈' },
  { href: '/admin/categories', label: '카테고리' },
] as const

export function Rail({ counts }: { counts: Record<string, number | undefined> }) {
  const pathname = usePathname()

  return (
    <nav aria-label="관리 메뉴" className="sticky top-12 h-fit self-start pt-6">
      {ITEMS.map((it) => {
        const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'relative mb-1 flex h-10 items-center justify-between rounded-lg px-3.5 text-[13px] transition-colors',
              active
                ? 'bg-accent-subtle text-accent before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:bg-accent'
                : 'text-fg-body hover:bg-bg-hover',
            ].join(' ')}
          >
            <span>{it.label}</span>
            <span
              className={`text-xs tabular-nums ${active ? 'text-accent' : 'text-fg-subtle'}`}
            >
              {counts[it.label] ?? ''}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
