import type { Metadata } from 'next'
import Link from 'next/link'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { requireOwner } from '@/lib/auth/require'
import { loadPosts } from '@/lib/admin/posts'
import { tagCounts } from '@/lib/admin/findings'
import { CATEGORIES } from '@/lib/site'
import { Rail } from '@/components/admin/Rail'
import { GitChip } from '@/components/admin/GitChip'

export const metadata: Metadata = { title: '관리' }

const exec = promisify(execFile)

async function dirtyCount() {
  try {
    const { stdout } = await exec('git', ['status', '--porcelain'], { cwd: process.cwd() })
    return stdout.split('\n').filter(Boolean).length
  } catch {
    return 0
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOwner()

  const posts = await loadPosts()
  const series = new Set(posts.map((p) => p.series).filter(Boolean))
  const counts: Record<string, number | undefined> = {
    개요: undefined,
    글: posts.length,
    태그: tagCounts(posts).length,
    시리즈: series.size,
    카테고리: CATEGORIES.length,
  }

  return (
    <>
      <header className="sticky top-0 z-50 h-12 border-b border-border bg-bg">
        <div className="mx-auto flex h-full max-w-[1200px] items-center gap-3 px-8">
          <Link href="/" className="font-mono text-[13px] text-fg">
            subbi<span className="text-accent">.log</span>
          </Link>
          <span className="text-[13px] text-fg-muted">관리</span>
          <span className="ml-auto flex items-center gap-3">
            <GitChip dirtyCount={await dirtyCount()} />
            {session && (
              <>
                <span className="text-xs text-fg-subtle">@{session.login}</span>
                <a
                  href="/api/auth/logout"
                  className="text-xs text-fg-muted hover:text-fg-body"
                >
                  로그아웃
                </a>
              </>
            )}
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] grid-cols-[220px_minmax(0,1fr)] gap-10 px-8 max-[900px]:grid-cols-[minmax(0,1fr)] max-[900px]:gap-0">
        <Rail counts={counts} />
        <main className="max-w-[880px] pt-6 pb-24">{children}</main>
      </div>
    </>
  )
}
