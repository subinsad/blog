'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { VIEW_MODES, isViewMode, type ViewMode } from './PostViews'

const LABEL: Record<ViewMode, string> = {
  card: '카드 보기',
  list: '목록 보기',
  category: '카테고리 보기',
}

const ICON: Record<ViewMode, React.ReactNode> = {
  card: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  category: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <path d="M14 4h7M14 9h7M14 15h7M14 20h7" />
    </>
  ),
}

const STORAGE_KEY = 'subbi.view'

/** URL 쿼리가 정본, localStorage는 취향 기억용. 쿼리가 없을 때만 한 번 복원한다. */
export function ViewToggle({
  view,
  defaultView = 'card',
}: {
  view: ViewMode
  defaultView?: ViewMode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('view')) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && isViewMode(saved) && saved !== defaultView) {
      router.replace(`${pathname}?view=${saved}`, { scroll: false })
    }
  }, [params, pathname, router, defaultView])

  const select = (v: ViewMode) => {
    localStorage.setItem(STORAGE_KEY, v)
    const next = new URLSearchParams(params.toString())
    if (v === defaultView) next.delete('view')
    else next.set('view', v)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="flex gap-1" role="group" aria-label="보기 방식">
      {VIEW_MODES.map((v) => {
        const active = v === view
        return (
          <button
            key={v}
            type="button"
            onClick={() => select(v)}
            aria-pressed={active}
            aria-label={LABEL[v]}
            title={LABEL[v]}
            className={[
              'relative grid size-8 place-items-center rounded-md transition-colors',
              active
                ? 'text-accent after:absolute after:inset-x-[7px] after:-bottom-[11px] after:h-0.5 after:bg-accent'
                : 'text-fg-subtle hover:text-fg-body',
            ].join(' ')}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {ICON[v]}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
