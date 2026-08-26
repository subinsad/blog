import Link from 'next/link'
import { site } from '@/lib/site'
import { OwnerMenu } from './OwnerMenu'
import { SearchTrigger } from '@/components/search/SearchTrigger'
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
          <SearchTrigger>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="max-[768px]:hidden">검색</span>
            <kbd className="ml-auto rounded border border-border-strong px-1.5 font-mono text-[11px] max-[768px]:hidden">
              ⌘K
            </kbd>
          </SearchTrigger>

          <OwnerMenu />

          <ThemeToggle />
        </div>
      </div>
      <span className="sr-only">{site.name}</span>
    </header>
  )
}
