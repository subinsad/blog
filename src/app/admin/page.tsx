import Link from 'next/link'
import { loadPosts } from '@/lib/admin/posts'
import { buildFindings, tagCounts } from '@/lib/admin/findings'
import { CATEGORY_META, type Category } from '@/lib/site'
import { formatDate } from '@/lib/format'
import { checkStorage } from '@/lib/storage'

export default async function AdminOverview() {
  const posts = await loadPosts()
  const findings = buildFindings(posts)
  const storage = await checkStorage()
  const series = new Set(posts.map((p) => p.series).filter(Boolean))
  const pinned = posts.filter((p) => p.pinned).length

  return (
    <>
      <p className="text-[15px] text-fg-body">
        글 {posts.length} · 카테고리 {new Set(posts.map((p) => p.category)).size} · 태그{' '}
        {tagCounts(posts).length} · 시리즈 {series.size} · 고정 {pinned}
      </p>

      {!storage.ok && (
        <div
          role="alert"
          className="mt-6 rounded-lg border-l-[3px] border-[var(--m-red)] bg-[color-mix(in_srgb,var(--m-red)_7%,transparent)] px-4 py-3.5"
        >
          <p className="text-[13px] font-medium text-fg">저장소에 글을 쓸 수 없습니다</p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-body">{storage.message}</p>
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[13px] text-accent hover:underline"
          >
            토큰 설정 열기 →
          </a>
        </div>
      )}

      {findings.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-1 text-[13px] font-medium text-fg">점검</h2>
          <div className="border-t border-border">
            {findings.map((f) => (
              <div
                key={f.id}
                className="flex min-h-[52px] items-center gap-4 border-b border-border py-2.5"
              >
                {f.level === 'error' && (
                  <span
                    title="오류"
                    aria-label="오류"
                    className="size-1.5 shrink-0 rounded-full bg-[var(--m-red)]"
                  />
                )}
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-body">
                  {f.message}
                </p>
                <span className="shrink-0 text-xs text-fg-subtle tabular-nums">{f.count}</span>
                <Link
                  href={f.href}
                  className="inline-flex h-[30px] shrink-0 items-center rounded-lg border border-border px-3 text-[13px] text-fg-body transition-colors hover:bg-bg-hover"
                >
                  {f.action}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="mt-8 flex h-[52px] items-center text-[13px] text-fg-muted">
          점검할 항목이 없습니다.
        </p>
      )}

      <section className="mt-10">
        <h2 className="mb-1 text-[13px] font-medium text-fg">최근 글</h2>
        <div className="border-t border-border">
          {posts.slice(0, 5).map((p) => (
            <Link
              key={p.file.path}
              href={`/write/${p.file.slug}`}
              className="group flex h-[52px] items-center gap-3 border-b border-border px-1"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  background:
                    CATEGORY_META[p.category as Category]?.color ?? 'var(--fg-subtle)',
                }}
              />
              <span className="w-[92px] shrink-0 text-[13px] text-fg-muted tabular-nums">
                {p.date ? formatDate(p.date) : '—'}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg transition-colors group-hover:text-accent">
                {p.title}
              </span>
              {p.draft && (
                <span className="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-[11px] text-fg-subtle">
                  초안
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
