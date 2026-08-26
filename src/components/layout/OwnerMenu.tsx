'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { OWNER_HINT_COOKIE, OWNER_RETURN_COOKIE } from '@/lib/auth/config'

/**
 * 소유자 전용 컨트롤. 독자에게는 렌더되지 않는다.
 *
 * 서버에서 세션을 읽으면 cookies() 때문에 공개 페이지 전체가 동적 렌더링으로
 * 떨어진다. 그래서 권한이 전혀 없는 표시용 쿠키를 클라이언트에서 읽는다.
 * 위조해봐야 버튼만 보이고, 실제 접근은 미들웨어가 막는다.
 *
 * 배치: 글쓰기는 자주 쓰므로 버튼으로 한 번에 닿게 두고,
 * 가끔 쓰는 관리와 로그아웃은 메뉴로 접어 헤더를 조용하게 유지한다.
 */
const has = (name: string) => document.cookie.split('; ').some((c) => c === `${name}=1`)

/**
 * 0 = 독자, 1 = 세션이 끊긴 소유자, 2 = 로그인된 소유자.
 * 하나의 스냅샷으로 읽어야 useSyncExternalStore 가 매번 같은 값을 돌려준다.
 */
const readState = () => (has(OWNER_HINT_COOKIE) ? 2 : has(OWNER_RETURN_COOKIE) ? 1 : 0)

const subscribe = () => () => {}

export function OwnerMenu() {
  const state = useSyncExternalStore(subscribe, readState, () => 0)
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (state === 0) return null

  // 세션만 끊긴 상태. 다시 들어올 길을 준다. 독자에게는 보이지 않는다.
  if (state === 1) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-border-strong px-3.5 text-[13px] font-medium text-fg-body transition-colors hover:bg-bg-hover"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="m10 17 5-5-5-5M15 12H3" />
        </svg>
        로그인
      </a>
    )
  }

  const item =
    'flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-fg-body transition-colors hover:bg-bg-hover'

  return (
    <>
      <Link
        href="/write"
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span className="max-[768px]:hidden">글쓰기</span>
      </Link>

      <div className="relative" ref={wrap}>
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="소유자 메뉴"
          title="소유자 메뉴"
          className={[
            'grid size-[34px] place-items-center rounded-lg transition-colors',
            open ? 'bg-bg-hover text-fg' : 'text-fg-muted hover:bg-bg-hover hover:text-fg-body',
          ].join(' ')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            aria-label="소유자 메뉴"
            className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[176px] rounded-xl border border-border bg-bg-elevated p-1.5"
          >
            <Link href="/admin" role="menuitem" className={item} onClick={() => setOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                <circle cx="7" cy="18" r="2" fill="currentColor" stroke="none" />
              </svg>
              관리
            </Link>

            <div className="my-1.5 border-t border-border" />

            <form action="/api/auth/logout" method="post">
              <button type="submit" role="menuitem" className={`${item} w-full`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5M21 12H9" />
                </svg>
                로그아웃
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
