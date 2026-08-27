'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Plan, Operation } from '@/lib/admin/plan'
import { MAX_CATEGORIES } from '@/config/categories'
import { PlanPanel, ResultStrip } from './PlanPanel'

export type CategoryRow = {
  name: string
  slug: string
  light: string
  dark: string
  count: number
}

type Stage =
  | { at: 'idle' }
  | { at: 'plan'; op: Operation; plan: Plan }
  | { at: 'done'; plan: Plan; written: string[]; commit?: { sha: string; url: string } }

/** 액센트(인디고)와 겹치지 않고 라이트/다크 대비가 확보된 쌍만 둔다. */
const PALETTE = [
  { light: '#0b7285', dark: '#66d9e8' },
  { light: '#087f5b', dark: '#63e6be' },
  { light: '#5f3dc4', dark: '#9775fa' },
  { light: '#a61e4d', dark: '#f783ac' },
  { light: '#d9480f', dark: '#ffa94d' },
  { light: '#5c940d', dark: '#a9e34b' },
  { light: '#862e9c', dark: '#da77f2' },
  { light: '#364fc7', dark: '#748ffc' },
]

const field =
  'h-[34px] w-full rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg-body outline-none hover:border-border-strong focus:border-accent'

export function CategoriesClient({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter()
  const [form, setForm] = useState<null | { mode: 'add' } | { mode: 'edit'; from: string }>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [color, setColor] = useState(0)
  const [stage, setStage] = useState<Stage>({ at: 'idle' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const used = new Set(rows.map((r) => r.light))
  const palette = PALETTE.filter((p) => !used.has(p.light))
  const full = rows.length >= MAX_CATEGORIES
  const adding = form?.mode === 'add'

  const openAdd = () => {
    setName('')
    setSlug('')
    setError(null)
    setStage({ at: 'idle' })
    setForm({ mode: 'add' })
  }

  const openEdit = (r: CategoryRow) => {
    setName(r.name)
    setSlug(r.slug)
    setError(null)
    setStage({ at: 'idle' })
    setForm({ mode: 'edit', from: r.name })
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
        setStage({ at: 'done', plan: json.plan, written: json.written, commit: json.commit })
        setForm(null)
        setName('')
        setSlug('')
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '작업 실패')
    } finally {
      setBusy(false)
    }
  }

  const chosen = palette[color] ?? PALETTE[0]

  return (
    <>
      <div className="border-t border-border">
        {rows.map((r) => (
          <div
            key={r.slug}
            className="group flex h-[52px] items-center gap-3 border-b border-border px-1"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: `var(--c-${r.slug})` }}
            />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">
              {r.name}
            </span>
            <Link
              href={`/categories/${r.slug}`}
              className="shrink-0 font-mono text-[12px] text-fg-subtle hover:text-accent max-[768px]:hidden"
            >
              /{r.slug}
            </Link>
            <span className="w-12 shrink-0 text-right text-[13px] text-fg-muted tabular-nums">
              {r.count}개
            </span>
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="h-[30px] shrink-0 rounded-lg px-2.5 text-[13px] text-fg-muted opacity-0 transition-opacity hover:bg-bg-elevated hover:text-fg-body group-hover:opacity-100 focus-visible:opacity-100"
            >
              수정
            </button>
            <button
              type="button"
              disabled={busy || r.count > 0 || rows.length <= 1}
              title={
                r.count > 0
                  ? `글 ${r.count}개가 아직 이 카테고리에 있습니다. 먼저 옮겨주세요.`
                  : rows.length <= 1
                    ? '마지막 카테고리는 지울 수 없습니다'
                    : undefined
              }
              onClick={() => void run({ kind: 'category.delete', name: r.name }, 'plan')}
              className="h-[30px] shrink-0 rounded-lg px-2.5 text-[13px] text-fg-muted opacity-0 transition-opacity hover:bg-bg-elevated hover:text-[var(--m-red)] group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:group-hover:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-muted"
            >
              삭제
            </button>
          </div>
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

      <div className="mt-5">
        {form ? (
          <div className="max-w-[420px] rounded-xl border border-border p-4">
            <p className="mb-3 text-[13px] font-medium text-fg">
              {adding ? '새 카테고리' : `'${form.mode === 'edit' ? form.from : ''}' 수정`}
            </p>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs text-fg-muted">이름</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slug) setSlug('')
                }}
                placeholder="예: Infra"
                className={field}
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs text-fg-muted">
                slug <span className="text-fg-subtle">— 주소에 쓰입니다</span>
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="infra"
                className={`${field} font-mono`}
              />
              {!adding && (
                <span className="mt-1.5 block text-[11px] leading-relaxed text-fg-subtle">
                  이름을 바꾸면 이 카테고리 글의 frontmatter 가 전부 함께 바뀝니다. slug 를 바꾸면
                  옛 주소는 새 주소로 넘어갑니다.
                </span>
              )}
            </label>

            <div className={adding ? 'mb-4' : 'hidden'}>
              <span className="mb-1.5 block text-xs text-fg-muted">색</span>
              <div className="flex flex-wrap gap-1.5">
                {palette.map((p, i) => (
                  <button
                    key={p.light}
                    type="button"
                    onClick={() => setColor(i)}
                    aria-label={`색 ${i + 1}`}
                    aria-pressed={color === i}
                    style={{ background: p.light }}
                    className={[
                      'size-8 rounded-lg transition-shadow',
                      color === i ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg)]' : '',
                    ].join(' ')}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-fg-subtle">
                라이트/다크 대비가 확보된 조합만 고를 수 있습니다. 임의 색을 넣으면 다크 모드에서
                안 보입니다.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="h-[34px] rounded-lg px-3.5 text-[13px] text-fg-muted hover:bg-bg-hover"
              >
                취소
              </button>
              <button
                type="button"
                disabled={busy || !name.trim() || !slug.trim()}
                onClick={() =>
                  void run(
                    adding
                      ? {
                          kind: 'category.add',
                          name: name.trim(),
                          slug: slug.trim(),
                          light: chosen.light,
                          dark: chosen.dark,
                        }
                      : {
                          // 색은 그대로 둔다. 계획 단계가 파일에서 읽어 옮긴다.
                          kind: 'category.rename',
                          from: form.mode === 'edit' ? form.from : '',
                          name: name.trim(),
                          slug: slug.trim(),
                        },
                    'plan',
                  )
                }
                className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              >
                계속
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={full}
            title={full ? `카테고리는 ${MAX_CATEGORIES}개까지입니다` : undefined}
            onClick={openAdd}
            className="h-[34px] rounded-lg border border-border px-3.5 text-[13px] text-fg-body hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {full ? `카테고리 ${MAX_CATEGORIES}개를 다 썼습니다` : '새 카테고리'}
          </button>
        )}
      </div>
    </>
  )
}
