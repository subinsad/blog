import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { postsBySeries, seriesList } from '@/lib/content'
import { formatDate, readingTime } from '@/lib/format'
import { Shell } from '@/components/layout/Shell'

export const dynamicParams = false

export function generateStaticParams() {
  return seriesList.map((s) => ({ id: s.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const s = seriesList.find((x) => x.id === id)
  return { title: s?.title ?? '시리즈' }
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const meta = seriesList.find((s) => s.id === id)
  if (!meta) notFound()
  const list = postsBySeries(id)

  return (
    <Shell active={`series:${id}`}>
      <header className="mb-7 border-b border-border pb-5">
        <p className="text-[13px] text-fg-muted">시리즈</p>
        <h1 className="mt-1.5 text-[32px] leading-[1.35] font-bold tracking-[-0.02em] text-fg">
          {meta.title}
        </h1>
        {meta.description && (
          <p className="mt-2 text-[15px] text-fg-muted">{meta.description}</p>
        )}
        <p className="mt-3 text-[13px] text-fg-subtle tabular-nums">전 {list.length}편</p>
      </header>

      <ol className="border-t border-border">
        {list.map((p, i) => (
          <li key={p.slug}>
            <Link
              href={p.permalink}
              className="group flex items-center gap-4 border-b border-border px-2 py-4 transition-colors hover:bg-bg-hover"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bg-subtle font-mono text-xs text-fg-muted tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-fg transition-colors group-hover:text-accent">
                  {p.title}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-fg-muted">
                  {p.summary}
                </span>
              </span>
              <span className="shrink-0 text-[13px] text-fg-subtle tabular-nums max-[768px]:hidden">
                {formatDate(p.date)} · {readingTime(p.metadata.readingTime)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Shell>
  )
}
