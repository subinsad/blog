'use client'

import { useEffect, useState } from 'react'

type TocItem = { title: string; url: string; items?: TocItem[] }

const flatten = (items: TocItem[], depth = 0): { title: string; id: string; depth: number }[] =>
  items.flatMap((i) => [
    { title: i.title, id: i.url.replace('#', ''), depth },
    ...flatten(i.items ?? [], depth + 1),
  ])

export function Toc({ toc }: { toc: TocItem[] }) {
  const items = flatten(toc)
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (items.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    for (const { id } of items) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toc])

  if (items.length === 0) return null

  return (
    <nav aria-label="목차" className="text-[13px] leading-relaxed">
      <p className="mb-3 font-medium text-fg">목차</p>
      <ul>
        {items.map(({ title, id, depth }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              className={[
                'block border-l-2 py-1 transition-colors',
                depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : 'pl-9',
                active === id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-fg-muted hover:text-fg-body',
              ].join(' ')}
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
