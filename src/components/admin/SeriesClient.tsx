'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Plan, Operation } from '@/lib/admin/plan'
import { formatDate } from '@/lib/format'
import { slugify, isSafeSlug } from '@/lib/slugify'
import { PlanPanel, ResultStrip } from './PlanPanel'

export type SeriesItem = { id: string; title: string; description?: string }
export type SeriesPost = { slug: string; title: string; date: string; order: number | null }
export type FreePost = { slug: string; title: string; date: string }

const field =
  'h-[34px] w-full rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg-body outline-none hover:border-border-strong focus:border-accent'

type Stage =
  | { at: 'idle' }
  | { at: 'plan'; op: Operation; plan: Plan }
  | { at: 'done'; plan: Plan; written: string[]; commit?: { sha: string; url: string } }

export function SeriesClient({
  series,
  postsBySeries,
  freePosts,
}: {
  series: SeriesItem[]
  postsBySeries: Record<string, SeriesPost[]>
  freePosts: FreePost[]
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState(series[0]?.id ?? '')
  /**
   * 드래그 중 순서는 여기서만 바뀐다. 저장을 눌러야 파일에 반영된다.
   * 시리즈 id 를 함께 들고 있어서, 다른 시리즈로 옮기면 자동으로 무효가 된다.
   * 이펙트로 초기화하면 렌더 한 번을 더 태우고 깜빡인다.
   */
  const [draft, setDraft] = useState<{ id: string; slugs: string[] } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [addingFor, setAddingFor] = useState<string | null>(null)
  /** 시리즈 자체를 만들거나 고치는 폼. 글 목록과 동시에 열지 않는다. */
  const [form, setForm] = useState<null | { mode: 'add' } | { mode: 'edit'; id: string }>(null)
  const [meta, setMeta] = useState({ id: '', title: '', description: '' })
  // id 를 한 번이라도 직접 건드리면 제목을 따라가지 않는다
  const [idTouched, setIdTouched] = useState(false)
  const [stage, setStage] = useState<Stage>({ at: 'idle' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = postsBySeries[openId] ?? []
  const order = draft && draft.id === openId ? draft.slugs : null
  const view = order ?? current.map((p) => p.slug)
  const dirty = order !== null && order.join() !== current.map((p) => p.slug).join()
  const adding = addingFor === openId
  const openMeta = series.find((s) => s.id === openId)
  const renaming = form?.mode === 'edit' && form.id !== meta.id

  // 저장하지 않은 순서를 들고 떠나려 하면 막는다
  useEffect(() => {
    if (!dirty) return
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  const openAdd = () => {
    setMeta({ id: '', title: '', description: '' })
    setIdTouched(false)
    setStage({ at: 'idle' })
    setError(null)
    setForm({ mode: 'add' })
  }

  const openEdit = (s: SeriesItem) => {
    setMeta({ id: s.id, title: s.title, description: s.description ?? '' })
    setIdTouched(true)
    setStage({ at: 'idle' })
    setError(null)
    setForm({ mode: 'edit', id: s.id })
  }

  const move = (slug: string, delta: number) => {
    const list = [...view]
    const i = list.indexOf(slug)
    const j = i + delta
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    setDraft({ id: openId, slugs: list })
  }

  const dropOn = (target: string) => {
    if (!dragging || dragging === target) return
    const list = [...view]
    list.splice(list.indexOf(target), 0, ...list.splice(list.indexOf(dragging), 1))
    setDraft({ id: openId, slugs: list })
    setDragging(null)
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
        setDraft(null)
        setForm(null)
        setAddingFor(null)
        // 지운 시리즈를 계속 열어두면 빈 목록만 남는다
        if (op.kind === 'series.delete') {
          setOpenId(series.find((x) => x.id !== op.id)?.id ?? '')
        }
        if (op.kind === 'series.rename') setOpenId(op.to)
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '작업 실패')
    } finally {
      setBusy(false)
    }
  }

  const byslug = (s: string) => current.find((p) => p.slug === s)

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className={[
              'h-[34px] rounded-lg px-3 text-[13px] transition-colors',
              openId === s.id ? 'bg-accent-subtle text-accent' : 'text-fg-muted hover:bg-bg-hover',
            ].join(' ')}
          >
            {s.title}{' '}
            <span className="tabular-nums">{(postsBySeries[s.id] ?? []).length}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={openAdd}
          className="h-[34px] rounded-lg border border-dashed border-border px-3 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg-body"
        >
          + 새 시리즈
        </button>
      </div>

      {series.length === 0 && !form && (
        <p className="py-10 text-center text-[13px] text-fg-muted">
          아직 시리즈가 없습니다. 위의 <b className="font-medium text-fg-body">새 시리즈</b> 로 하나
          만드세요.
        </p>
      )}

      {form && (
        <div className="max-w-[460px] rounded-xl border border-border p-4">
          <p className="mb-3 text-[13px] font-medium text-fg">
            {form.mode === 'add' ? '새 시리즈' : '시리즈 정보'}
          </p>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-fg-muted">제목</span>
            <input
              autoFocus
              value={meta.title}
              onChange={(e) => {
                const title = e.target.value
                setMeta((m) => ({
                  ...m,
                  title,
                  id: form.mode === 'add' && !idTouched ? slugify(title) : m.id,
                }))
              }}
              placeholder="예: React 훅 파헤치기"
              className={field}
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-fg-muted">
              설명 <span className="text-fg-subtle">— 비워도 됩니다</span>
            </span>
            <input
              value={meta.description}
              onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
              placeholder="이 연재가 무엇을 다루는지 한 줄로"
              className={field}
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs text-fg-muted">
              id <span className="text-fg-subtle">— 주소에 쓰입니다</span>
            </span>
            <input
              value={meta.id}
              onChange={(e) => {
                setIdTouched(true)
                setMeta((m) => ({ ...m, id: e.target.value.toLowerCase() }))
              }}
              placeholder="react-hukeul-pahechigi"
              className={`${field} font-mono`}
            />
            <span className="mt-1.5 block text-[11px] leading-relaxed text-fg-subtle">
              {form.mode === 'add'
                ? '제목에서 자동으로 만들어집니다.'
                : renaming
                  ? `주소가 /series/${meta.id} 로 바뀝니다. 소속 글과 옛 주소도 같이 옮겨집니다.`
                  : '바꾸면 주소가 함께 바뀝니다. 옛 주소는 새 주소로 넘어갑니다.'}
            </span>
          </label>

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
              disabled={busy || !meta.title.trim() || !isSafeSlug(meta.id)}
              onClick={() =>
                void run(
                  renaming
                    ? {
                        // id 가 바뀌면 파일·소속 글·주소가 함께 움직인다.
                        // 제목·설명도 같이 실어 한 커밋으로 끝낸다.
                        kind: 'series.rename',
                        from: form.mode === 'edit' ? form.id : '',
                        to: meta.id,
                        title: meta.title.trim(),
                        description: meta.description.trim(),
                      }
                    : {
                        kind: form.mode === 'add' ? 'series.add' : 'series.edit',
                        id: meta.id,
                        title: meta.title.trim(),
                        description: meta.description.trim(),
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
      )}

      {openId && !form && (
        <>
          <div className="mb-4 flex items-start gap-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-fg">
                {openMeta?.title ?? openId}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-fg-muted">
                {openMeta?.description || '설명 없음'}
              </span>
            </span>
            <Link
              href={`/series/${openId}`}
              className="shrink-0 pt-1 font-mono text-[12px] text-fg-subtle hover:text-accent max-[768px]:hidden"
            >
              /series/{openId}
            </Link>
            <button
              type="button"
              onClick={() => openMeta && openEdit(openMeta)}
              className="h-[30px] shrink-0 rounded-lg border border-border px-2.5 text-[13px] text-fg-body hover:bg-bg-hover"
            >
              수정
            </button>
            <button
              type="button"
              disabled={busy || current.length > 0}
              title={
                current.length > 0
                  ? `글 ${current.length}개가 아직 이 시리즈에 있습니다. 먼저 빼주세요.`
                  : undefined
              }
              onClick={() => void run({ kind: 'series.delete', id: openId }, 'plan')}
              className="h-[30px] shrink-0 rounded-lg px-2.5 text-[13px] text-fg-muted hover:bg-bg-elevated hover:text-[var(--m-red)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg-muted"
            >
              삭제
            </button>
          </div>

          <div className="border-t border-border">
            {view.length === 0 && (
              <p className="py-10 text-center text-[13px] text-fg-muted">
                이 시리즈에 글이 없습니다.
              </p>
            )}
            {view.map((slug, i) => {
              const p = byslug(slug)
              if (!p) return null
              return (
                <div
                  key={slug}
                  tabIndex={0}
                  draggable
                  onDragStart={() => setDragging(slug)}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(slug)}
                  onKeyDown={(e) => {
                    if (!(e.metaKey || e.ctrlKey)) return
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      move(slug, -1)
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      move(slug, 1)
                    }
                  }}
                  className={[
                    'group flex h-[52px] items-center gap-3 border-b border-border px-1 transition-colors',
                    dragging === slug ? 'bg-bg-elevated opacity-60' : 'hover:bg-bg-hover',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    title="끌어서 순서 변경 · ⌘↑ ⌘↓"
                    className="w-4 shrink-0 cursor-grab text-center text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ⠿
                  </span>
                  <span className="w-6 shrink-0 text-[13px] text-fg-subtle tabular-nums">
                    {i + 1}
                  </span>
                  <Link
                    href={`/write/${p.slug}`}
                    className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg hover:text-accent"
                  >
                    {p.title}
                  </Link>
                  <span className="shrink-0 text-[13px] text-fg-subtle tabular-nums max-[768px]:hidden">
                    {p.date ? formatDate(p.date) : '—'}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run({ kind: 'series.removePosts', slugs: [slug] }, 'plan')}
                    className="h-[30px] shrink-0 rounded-lg px-2.5 text-[13px] text-fg-muted opacity-0 transition-opacity hover:bg-bg-elevated hover:text-[var(--m-red)] group-hover:opacity-100"
                  >
                    빼기
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            {adding ? (
              <div className="rounded-xl border border-border bg-bg-elevated p-2">
                <p className="px-2 py-1.5 text-[11px] text-fg-subtle">
                  어느 시리즈에도 없는 글
                </p>
                {freePosts.length === 0 && (
                  <p className="px-2 py-3 text-[13px] text-fg-muted">추가할 글이 없습니다.</p>
                )}
                {freePosts.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run({ kind: 'series.addPosts', id: openId, slugs: [p.slug] }, 'plan')
                    }
                    className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] text-fg-body hover:bg-bg-hover"
                  >
                    <span className="w-[88px] shrink-0 text-fg-subtle tabular-nums">
                      {formatDate(p.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAddingFor(null)}
                  className="mt-1 h-8 w-full rounded-lg text-[13px] text-fg-muted hover:bg-bg-hover"
                >
                  닫기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingFor(openId)}
                className="h-[34px] rounded-lg border border-border px-3.5 text-[13px] text-fg-body hover:bg-bg-hover"
              >
                글 추가
              </button>
            )}
          </div>
        </>
      )}

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
          {/* 시리즈 목록은 빌드 산출물에서 읽는다. 파일만 써서는 화면이 안 바뀐다. */}
          {stage.plan.changes.some((c) => c.op === 'create') && (
            <p className="mt-2 text-[11px] text-fg-subtle">
              새 시리즈는 사이트가 다시 빌드된 뒤 이 목록과 글쓰기 화면의 시리즈 선택에 나타납니다.
            </p>
          )}
        </div>
      )}

      {/*
        드래그할 때마다 파일을 쓰면 커밋이 순서 변경 횟수만큼 쌓이고
        되돌릴 경계가 사라진다. 화면에서 먼저 정리하고 한 번에 저장한다.
      */}
      {dirty && stage.at !== 'plan' && (
        <div className="sticky bottom-0 mt-4 flex min-h-14 items-center gap-2 border-t border-border bg-bg py-3">
          <span className="text-[13px] text-fg-body">순서가 변경되었습니다</span>
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="h-[34px] rounded-lg px-3.5 text-[13px] text-fg-muted hover:bg-bg-hover"
            >
              되돌리기
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run({ kind: 'series.setOrder', id: openId, slugs: view }, 'plan')}
              className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
            >
              저장
            </button>
          </span>
        </div>
      )}
    </>
  )
}
