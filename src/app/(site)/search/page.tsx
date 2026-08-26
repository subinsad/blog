import type { Metadata } from 'next'
import Link from 'next/link'
import { posts } from '@/lib/content'
import { toCardData } from '@/lib/view-model'
import { searchPosts, type SearchDoc } from '@/lib/search'
import { Shell } from '@/components/layout/Shell'
import { PostRow } from '@/components/post/PostRow'

export const metadata: Metadata = { title: '검색', robots: { index: false } }

/**
 * 팔레트(⌘K)가 주된 검색이고 이 페이지는 뒷받침이다.
 * JS 없이도 동작하고, 검색 결과 주소를 공유할 수 있다.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams

  const docs: SearchDoc[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    category: p.category,
    tags: p.tags,
    date: p.date,
  }))

  const hits = searchPosts(docs, q, 30)
  const found = hits
    .map((h) => posts.find((p) => p.slug === h.doc.slug))
    .filter((p): p is (typeof posts)[number] => Boolean(p))
    .map(toCardData)

  return (
    <Shell>
      <h1 className="text-xl font-bold tracking-[-0.015em] text-fg">검색</h1>

      <form action="/search" className="mt-4 mb-7 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="제목·태그·요약 · 초성도 됩니다"
          className="h-11 flex-1 rounded-lg border border-border bg-bg px-3.5 text-[15px] text-fg outline-none transition-colors hover:border-border-strong focus:border-accent"
        />
        <button
          type="submit"
          className="h-11 rounded-lg bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-hover"
        >
          찾기
        </button>
      </form>

      {q.trim() === '' ? (
        <p className="text-[13px] text-fg-muted">
          검색어를 입력하세요. 어디서든{' '}
          <kbd className="rounded border border-border-strong px-1.5 font-mono text-[11px]">⌘K</kbd>{' '}
          로도 열 수 있습니다.
        </p>
      ) : found.length === 0 ? (
        <div>
          <p className="text-[15px] text-fg-body">&lsquo;{q}&rsquo;에 대한 결과가 없어요.</p>
          <p className="mt-2 text-[13px] text-fg-muted">
            <Link href="/posts" className="text-accent hover:text-accent-hover">
              전체 글
            </Link>{' '}
            에서 찾아보세요.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-1 text-[13px] text-fg-muted tabular-nums">{found.length}개</p>
          <div className="border-t border-border">
            {found.map((p) => (
              <PostRow key={p.slug} post={p} />
            ))}
          </div>
        </>
      )}
    </Shell>
  )
}
