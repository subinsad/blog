import Link from 'next/link'
import { site } from '@/lib/site'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-full max-w-[var(--container)] items-center justify-between px-[var(--gutter)]">
        <Link
          href="/"
          className="font-mono text-[17px] font-medium tracking-[-0.02em] text-fg"
        >
          subbi<span className="text-accent">.log</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="flex h-[34px] min-w-[200px] items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 text-[13px] text-fg-subtle transition-colors hover:border-border-strong max-[768px]:min-w-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="max-[768px]:hidden">검색</span>
            <kbd className="ml-auto rounded border border-border-strong px-1.5 font-mono text-[11px] max-[768px]:hidden">
              ⌘K
            </kbd>
          </Link>

          {process.env.NODE_ENV === 'development' && (
            <Link
              href="/write"
              title="dev 모드에서만 노출"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <span className="max-[768px]:hidden">글쓰기</span>
            </Link>
          )}

          <ThemeToggle />
        </div>
      </div>
      <span className="sr-only">{site.name}</span>
    </header>
  )
}
