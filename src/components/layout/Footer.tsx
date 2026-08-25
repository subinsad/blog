import Link from 'next/link'
import { site } from '@/lib/site'

export function Footer() {
  return (
    <footer className="mt-6 flex justify-between border-t border-border py-8 text-[13px] text-fg-subtle">
      <span>© {new Date().getFullYear()} {site.name}</span>
      <span className="flex gap-3">
        <Link href="/rss.xml" className="hover:text-accent">RSS</Link>
        <a href={site.github} className="hover:text-accent" rel="me">GitHub</a>
        <Link href="/about" className="hover:text-accent">About</Link>
      </span>
    </footer>
  )
}
