'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Plan, Operation } from '@/lib/admin/plan'
import { CATEGORY_META, CATEGORIES, type Category } from '@/lib/site'
import { formatDate } from '@/lib/format'
import { matches } from '@/lib/hangul'
import { PlanPanel, ResultStrip } from './PlanPanel'

export type PostRow = {
  slug: string
  title: string
  date: string
  category: string
  tags: string[]
  pinned: boolean
  draft: boolean
}

type Stage =
  | { at: 'idle' }
  | { at: 'tag' }
  | { at: 'category' }
  | { at: 'plan'; op: Operation; plan: Plan }
  | { at: 'done'; plan: Plan; written: string[]; commit?: { sha: string; url: string } }

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'pinned', label: '고정' },
] as const
type FilterId = (typeof FILTERS)[number]['id']

const field =
  'h-[34px] rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg-body outline-none hover:border-border-strong focus:border-accent'

export function PostsClient({ rows, knownTags }: { rows: PostRow[]; knownTags: string[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [stage, setStage] = useState<Stage>({ at: 'idle' })
  const [tagValue, setTagValue] = useState('')
  const [newTag, setNewTag] = useState('')
  const [category, setCategory] = useState<Category>(CATEGORIES[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastIndex = useRef<number | null>(null)

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === 'draft' && !r.draft) return false
        if (filter === 'pinned' && !r.pinned) return false
        if (query && !matches(r.title, query) && !r.tags.some((t) => matches(t, query)))
          return false
        return true
      }),
    [rows, filter, query],
  )

  const toggle = (slug: string, index: number, shift: boolean) => {
    setSelected((prev) => {
      if (shift && lastIndex.current !== null) {
        const [a, b] = [lastIndex.current, index].sort((x, y) => x - y)
        return [...new Set([...prev, ...visible.slice(a, b + 1).map((r) => r.slug)])]
      }
      return prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    })
    lastIndex.current = index
  }

  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.includes(r.slug))

  const run = async (op: Operation, mode: 'plan' | 'apply') => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, operation: op }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '작업 실패')
      if (mode === 'plan') setStage({ at: 'plan', op, plan: json.plan })
      else {
        setStage({ at: 'done', plan: json.plan, written: json.written, commit: json.commit })
        setSelected([])
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '작업 실패')
    } finally {
      setBusy(false)
    }
  }

  const resolvedTag = newTag.trim() || tagValue

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const n =
            f.id === 'all'
              ? rows.length
              : f.id === 'draft'
                ? rows.filter((r) => r.draft).length
                : rows.filter((r) => r.pinned).length
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                'h-[30px] rounded-lg px-3 text-[13px] transition-colors',
                filter === f.id ? 'bg-accent-subtle text-accent' : 'text-fg-muted hover:bg-bg-hover',
              ].join(' ')}
            >
              {f.label} <span className="tabular-nums">{n}</span>
            </button>
          )
        })}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·태그 검색"
          className={`${field} ml-auto w-[200px]`}
        />
      </div>

      <div className="border-t border-border">
        <label className="flex h-9 items-center gap-3 border-b border-border px-1 text-[13px] text-fg-subtle">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(e) =>
              setSelected(e.target.checked ? visible.map((r) => r.slug) : [])
            }
            className="size-4 shrink-0"
          />
          보이는 글 전체 선택
        </label>

        {visible.length === 0 && (
          <p className="py-10 text-center text-[13px] text-fg-muted">해당하는 글이 없습니다.</p>
        )}

        {visible.map((r, i) => (
          <label
            key={r.slug}
            className="flex h-[52px] cursor-pointer items-center gap-3 border-b border-border px-1 transition-colors hover:bg-bg-hover"
          >
            <input
              type="checkbox"
              checked={selected.includes(r.slug)}
              onChange={(e) => toggle(r.slug, i, (e.nativeEvent as MouseEvent).shiftKey ?? false)}
              className="size-4 shrink-0"
            />
            <span className="w-[88px] shrink-0 text-[13px] text-fg-muted tabular-nums">
              {r.date ? formatDate(r.date) : '—'}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {r.pinned && (
                <span title="고정됨" aria-label="고정됨" className="shrink-0 text-fg-subtle">
                  ★
                </span>
              )}
              <Link
                href={`/write/${r.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-[15px] font-semibold text-fg hover:text-accent"
              >
                {r.title}
              </Link>
              {r.draft && (
                <span className="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-[11px] text-fg-subtle">
                  초안
                </span>
              )}
            </span>
            <span
              className="w-[92px] shrink-0 truncate text-[13px] max-[900px]:hidden"
              style={{ color: CATEGORY_META[r.category as Category]?.color ?? 'var(--fg-muted)' }}
            >
              {r.category}
            </span>
            <span className="w-[160px] shrink-0 truncate text-[13px] text-fg-subtle max-[1100px]:hidden">
              {r.tags.map((t) => `#${t}`).join(' ')}
            </span>
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-[13px] text-[var(--m-red)]" role="alert">
          {error}
        </p>
      )}

      {stage.at === 'plan' && (
        <div className="mt-4">
          <PlanPanel
            plan={stage.plan}
            busy={busy}
            onCancel={() => setStage({ at: 'idle' })}
            onConfirm={() => void run(stage.op, 'apply')}
          />
        </div>
      )}

      {stage.at === 'done' && (
        <div className="mt-4">
          <ResultStrip plan={stage.plan} written={stage.written} commit={stage.commit} />
        </div>
      )}

      {selected.length > 0 && stage.at !== 'plan' && (
        <div className="sticky bottom-0 mt-4 flex min-h-14 flex-wrap items-center gap-2 border-t border-border bg-bg py-3">
          {stage.at === 'tag' ? (
            <>
              <span className="text-[13px] text-fg-body">추가할 태그</span>
              <select
                value={newTag ? '__new' : tagValue}
                onChange={(e) => {
                  if (e.target.value === '__new') setNewTag(' ')
                  else {
                    setNewTag('')
                    setTagValue(e.target.value)
                  }
                }}
                className={field}
              >
                <option value="">선택하세요</option>
                {knownTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__new">새 태그 입력…</option>
              </select>
              {newTag !== '' && (
                <input
                  autoFocus
                  value={newTag.trim()}
                  onChange={(e) => setNewTag(e.target.value || ' ')}
                  placeholder="새 태그"
                  className={`${field} w-[160px]`}
                />
              )}
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => setStage({ at: 'idle' })} className="h-[34px] rounded-lg px-3.5 text-[13px] text-fg-muted hover:bg-bg-hover">
                  취소
                </button>
                <button
                  type="button"
                  disabled={busy || !resolvedTag}
                  onClick={() => void run({ kind: 'post.addTag', slugs: selected, tag: resolvedTag }, 'plan')}
                  className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
                >
                  계속
                </button>
              </span>
            </>
          ) : stage.at === 'category' ? (
            <>
              <span className="text-[13px] text-fg-body">옮길 카테고리</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={field}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => setStage({ at: 'idle' })} className="h-[34px] rounded-lg px-3.5 text-[13px] text-fg-muted hover:bg-bg-hover">
                  취소
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run({ kind: 'post.setCategory', slugs: selected, category }, 'plan')}
                  className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
                >
                  계속
                </button>
              </span>
            </>
          ) : (
            <>
              <span className="text-[13px] text-fg-body tabular-nums">{selected.length}개 선택됨</span>
              <button type="button" onClick={() => setSelected([])} className="h-[34px] rounded-lg px-3 text-[13px] text-fg-muted hover:bg-bg-hover">
                선택 해제
              </button>
              <span className="ml-auto flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void run({ kind: 'post.setPinned', slugs: selected, pinned: false }, 'plan')} className="h-[34px] rounded-lg border border-border px-3 text-[13px] text-fg-body hover:bg-bg-hover">
                  고정 해제
                </button>
                <button type="button" disabled={busy} onClick={() => void run({ kind: 'post.setPinned', slugs: selected, pinned: true }, 'plan')} className="h-[34px] rounded-lg border border-border px-3 text-[13px] text-fg-body hover:bg-bg-hover">
                  고정
                </button>
                <button type="button" onClick={() => setStage({ at: 'category' })} className="h-[34px] rounded-lg border border-border px-3 text-[13px] text-fg-body hover:bg-bg-hover">
                  카테고리 변경
                </button>
                <button type="button" onClick={() => setStage({ at: 'tag' })} className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover">
                  태그 추가
                </button>
              </span>
            </>
          )}
        </div>
      )}
    </>
  )
}
