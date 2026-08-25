'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan, Operation } from '@/lib/admin/plan'
import { PlanPanel, ResultStrip } from './PlanPanel'

export type TagRow = { name: string; count: number; hidden: boolean; similarTo: string[] }

type Stage =
  | { at: 'idle' }
  | { at: 'target'; from: string[] }
  | { at: 'plan'; op: Operation; plan: Plan }
  | { at: 'done'; written: string[]; commit?: { sha: string; url: string } }

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'hidden', label: '노출 안 됨' },
  { id: 'similar', label: '비슷한 이름' },
] as const
type FilterId = (typeof FILTERS)[number]['id']

export function TagsClient({
  rows,
  initialFilter,
}: {
  rows: TagRow[]
  initialFilter: FilterId
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterId>(initialFilter)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [stage, setStage] = useState<Stage>({ at: 'idle' })
  const [target, setTarget] = useState('')
  const [customName, setCustomName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastIndex = useRef<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'hidden' && !r.hidden) return false
      if (filter === 'similar' && r.similarTo.length === 0) return false
      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, filter, query])

  const toggle = (name: string, index: number, shift: boolean) => {
    setSelected((prev) => {
      if (shift && lastIndex.current !== null) {
        const [a, b] = [lastIndex.current, index].sort((x, y) => x - y)
        const range = visible.slice(a, b + 1).map((r) => r.name)
        return [...new Set([...prev, ...range])]
      }
      return prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    })
    lastIndex.current = index
  }

  const startMerge = (names: string[]) => {
    // 기본 대상은 선택된 것 중 사용 수가 가장 많은 태그
    const best = [...names]
      .map((n) => rows.find((r) => r.name === n)!)
      .sort((a, b) => b.count - a.count)[0]
    setTarget(best?.name ?? names[0])
    setCustomName('')
    setError(null)
    setStage({ at: 'target', from: names })
  }

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
        setStage({ at: 'done', written: json.written, commit: json.commit })
        setSelected([])
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '작업 실패')
    } finally {
      setBusy(false)
    }
  }

  const resolvedTarget = customName.trim() || target

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const n =
            f.id === 'all'
              ? rows.length
              : f.id === 'hidden'
                ? rows.filter((r) => r.hidden).length
                : rows.filter((r) => r.similarTo.length > 0).length
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                'h-[30px] rounded-lg px-3 text-[13px] transition-colors',
                filter === f.id
                  ? 'bg-accent-subtle text-accent'
                  : 'text-fg-muted hover:bg-bg-hover',
              ].join(' ')}
            >
              {f.label} <span className="tabular-nums">{n}</span>
            </button>
          )
        })}
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="태그 검색"
          className="ml-auto h-[34px] w-[200px] rounded-lg border border-border bg-bg px-3 text-[13px] text-fg-body outline-none transition-colors hover:border-border-strong focus:border-accent"
        />
      </div>

      <div className="border-t border-border">
        {visible.length === 0 && (
          <p className="py-10 text-center text-[13px] text-fg-muted">해당하는 태그가 없습니다.</p>
        )}
        {visible.map((r, i) => (
          <label
            key={r.name}
            className="flex h-[52px] cursor-pointer items-center gap-3 border-b border-border px-1 transition-colors hover:bg-bg-hover"
          >
            <input
              type="checkbox"
              checked={selected.includes(r.name)}
              onChange={(e) =>
                toggle(r.name, i, (e.nativeEvent as MouseEvent).shiftKey ?? false)
              }
              className="size-4 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">
              {r.name}
            </span>
            <span className="w-8 shrink-0 text-right text-[13px] text-fg-muted tabular-nums">
              {r.count}
            </span>
            <span className="w-[88px] shrink-0 text-[13px] text-fg-subtle">
              {r.hidden ? '노출 안 됨' : ''}
            </span>
            {r.similarTo.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  startMerge([r.name, ...r.similarTo])
                }}
                className="h-[30px] shrink-0 rounded-lg border border-border px-2.5 text-[13px] text-fg-body hover:bg-bg-elevated"
              >
                비슷한 태그와 합치기
              </button>
            )}
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
          <ResultStrip written={stage.written} commit={stage.commit} />
        </div>
      )}

      {selected.length > 0 && stage.at !== 'plan' && (
        <div className="sticky bottom-0 mt-4 flex min-h-14 flex-wrap items-center gap-2 border-t border-border bg-bg py-3">
          {stage.at === 'target' ? (
            <>
              <span className="text-[13px] text-fg-body">다음 이름으로 합치기</span>
              <select
                value={customName ? '__new' : target}
                onChange={(e) => {
                  if (e.target.value === '__new') setCustomName(' ')
                  else {
                    setCustomName('')
                    setTarget(e.target.value)
                  }
                }}
                className="h-[34px] rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg-body"
              >
                {stage.from.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                <option value="__new">새 이름 입력…</option>
              </select>
              {customName !== '' && (
                <input
                  autoFocus
                  value={customName.trim()}
                  onChange={(e) => setCustomName(e.target.value || ' ')}
                  placeholder="새 태그 이름"
                  className="h-[34px] w-[180px] rounded-lg border border-border bg-bg px-3 text-[13px] text-fg-body outline-none focus:border-accent"
                />
              )}
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setStage({ at: 'idle' })}
                  className="h-[34px] rounded-lg px-3.5 text-[13px] text-fg-muted hover:bg-bg-hover"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={busy || !resolvedTarget}
                  onClick={() =>
                    void run(
                      { kind: 'tag.merge', from: stage.from, to: resolvedTarget },
                      'plan',
                    )
                  }
                  className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
                >
                  계속
                </button>
              </span>
            </>
          ) : (
            <>
              <span className="text-[13px] text-fg-body tabular-nums">
                {selected.length}개 선택됨
              </span>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="h-[34px] rounded-lg px-3 text-[13px] text-fg-muted hover:bg-bg-hover"
              >
                선택 해제
              </button>
              <span className="ml-auto flex gap-2">
                {selected.length === 1 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run({ kind: 'tag.delete', tag: selected[0] }, 'plan')
                    }
                    className="h-[34px] rounded-lg border border-border px-3.5 text-[13px] text-fg-body hover:bg-bg-hover hover:text-[var(--m-red)]"
                  >
                    삭제
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy || selected.length < 1}
                  onClick={() => startMerge(selected)}
                  className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
                >
                  {selected.length === 1 ? '이름 변경' : '병합'}
                </button>
              </span>
            </>
          )}
        </div>
      )}
    </>
  )
}
