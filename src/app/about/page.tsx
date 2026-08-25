import type { Metadata } from 'next'
import { site } from '@/lib/site'
import { posts, categoryCounts, tagCounts } from '@/lib/content'
import { CATEGORIES, CATEGORY_META } from '@/lib/site'
import { Shell } from '@/components/layout/Shell'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  const counts = categoryCounts()
  const tags = tagCounts()

  return (
    <Shell>
      <div className="max-w-[720px]">
        <h1 className="text-[32px] leading-[1.35] font-bold tracking-[-0.02em] text-fg">
          About
        </h1>
        <div className="prose mt-6">
          <p>{site.description}</p>
          <p>
            프론트엔드를 주로 하고, 필요하면 백엔드와 인프라도 만집니다. 여기에는
            해결한 문제와 그 과정에서 틀렸던 판단을 함께 적습니다.
          </p>
          <h2>기록</h2>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-4 max-[768px]:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <dt className="text-[13px] text-fg-muted">전체 글</dt>
            <dd className="mt-1 text-2xl font-bold text-fg tabular-nums">{posts.length}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-[13px] text-fg-muted">카테고리</dt>
            <dd className="mt-1 text-2xl font-bold text-fg tabular-nums">
              {CATEGORIES.filter((c) => counts[c] > 0).length}
            </dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-[13px] text-fg-muted">태그</dt>
            <dd className="mt-1 text-2xl font-bold text-fg tabular-nums">{tags.length}</dd>
          </div>
        </dl>

        <ul className="mt-6 space-y-2">
          {CATEGORIES.filter((c) => counts[c] > 0).map((c) => {
            const pct = (counts[c] / posts.length) * 100
            return (
              <li key={c} className="flex items-center gap-3 text-[13px]">
                <span className="w-24 shrink-0 text-fg-body">{c}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${pct}%`, background: CATEGORY_META[c].color }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-fg-subtle tabular-nums">
                  {counts[c]}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Shell>
  )
}
