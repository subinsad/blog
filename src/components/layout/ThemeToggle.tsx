'use client'

import { useTheme } from 'next-themes'

/**
 * mounted 플래그를 쓰지 않는다. 아이콘 두 개를 모두 렌더하고 CSS로 감춰야
 * 이펙트에서 setState 하는 캐스케이딩 렌더가 사라지고, next-themes가
 * 페인트 전에 심는 인라인 스크립트 덕에 깜빡임도 없다.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="테마 전환"
      title="테마 전환"
      className="grid size-[34px] place-items-center rounded-lg text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg-body"
    >
      <svg
        width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" className="dark:hidden"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
      </svg>
      <svg
        width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" className="hidden dark:block"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  )
}
