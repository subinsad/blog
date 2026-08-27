'use client'

import { useState } from 'react'
import type { Plan } from '@/lib/admin/plan'

/**
 * 드라이런 패널. 태그·시리즈·카테고리가 모두 이걸 재사용한다.
 *
 * 원칙:
 * - "외 N건" 축약 금지. 전부 못 보는 벌크 편집은 confirm을 눌러선 안 된다.
 * - 변경되지 않는 글도 이유와 함께 보여준다. 숫자가 안 맞아 보이면 못 누른다.
 * - 확인 버튼에 목적어와 개수를 넣는다. "확인" 아님.
 */
type Changes = Plan['changes']

/** 주소는 퍼센트 인코딩된 채로 저장된다. 화면에는 읽을 수 있게 되돌린다. */
function readable(url: string): string {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

/** 확인 버튼과 결과 줄에 쓰는 목적어. 무엇을 누르는지 알아야 누를 수 있다. */
function subject(changes: Changes): string {
  return changes.every((c) => c.path.startsWith('content/posts/')) ? '글' : '파일'
}

function confirmLabel(changes: Changes): string {
  const n = changes.length
  if (n > 0 && changes.every((c) => c.op === 'create')) return `파일 ${n}개 만들기`
  if (n > 0 && changes.every((c) => c.op === 'delete')) return `파일 ${n}개 지우기`
  return `${subject(changes)} ${n}개 수정`
}

export function PlanPanel({
  plan,
  busy,
  onCancel,
  onConfirm,
}: {
  plan: Plan
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const empty = plan.changes.length === 0

  const toggle = (path: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(path)) n.delete(path)
      else n.add(path)
      return n
    })

  return (
    <div className="rounded-xl border border-border bg-bg-elevated">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[15px] text-fg">{plan.headline}</p>
        <p className="mt-0.5 text-[13px] text-fg-muted">{plan.detail}</p>
      </div>

      {!empty && (
        <div className="max-h-[60vh] overflow-y-auto">
          {plan.changes.map((c) => {
            const isOpen = open.has(c.path)
            return (
              <div key={c.path} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => toggle(c.path)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-bg-hover"
                >
                  <span
                    className={`mt-1 shrink-0 text-fg-subtle transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg">{c.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-fg-subtle">
                      {c.path}
                    </span>
                  </span>
                </button>
                {isOpen && (
                  <pre className="mx-4 mb-3 overflow-x-auto rounded-lg border border-border bg-[var(--code-bg)] p-3 font-mono text-[12px] leading-relaxed">
                    <span className="block text-fg-subtle">- {c.before || '(없음)'}</span>
                    <span className="block text-fg-body">+ {c.after || '(삭제)'}</span>
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}

      {plan.skipped.length > 0 && (
        <details className="border-b border-border">
          <summary className="cursor-pointer px-4 py-2.5 text-[13px] text-fg-subtle hover:bg-bg-hover">
            변경 없음 · 글 {plan.skipped.length}개
          </summary>
          <ul className="px-4 pb-3">
            {plan.skipped.map((s) => (
              <li key={s.slug} className="py-1 text-[13px] text-fg-muted">
                {s.title} <span className="text-fg-subtle">— {s.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.dirty.length > 0 && (
        <div className="border-b border-border px-4 py-2.5 text-[13px] text-fg-muted">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[var(--m-orange)] align-middle" />
          수정 대상 중 커밋되지 않은 변경이 있는 파일 {plan.dirty.length}개 — 되돌릴 때 함께 사라집니다
        </div>
      )}

      {plan.moved.length > 0 && (
        <div className="border-b border-border px-4 py-2.5 text-[13px] text-fg-muted">
          옮겨지는 URL — 옛 주소는 새 주소로 넘어갑니다
          <span className="mt-1 block font-mono text-[11px] text-fg-subtle">
            {plan.moved.map((m) => (
              <span key={m.from} className="block truncate">
                {readable(m.from)} → {readable(m.to)}
              </span>
            ))}
          </span>
        </div>
      )}

      {plan.deadUrls.length > 0 && (
        <div className="border-b border-border px-4 py-2.5 text-[13px] text-fg-muted">
          사라지는 URL{' '}
          <span className="font-mono text-[11px] text-fg-subtle">
            {plan.deadUrls.map(readable).join('  ')}
          </span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-[34px] rounded-lg px-3.5 text-[13px] text-fg-muted hover:bg-bg-hover disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || empty}
          className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? '적용 중…' : confirmLabel(plan.changes)}
        </button>
      </div>
    </div>
  )
}

/** 실행 후 남기는 결과 줄. 토스트는 사라지는데 그 안에 되돌리는 방법이 들어간다. */
export function ResultStrip({
  plan,
  written,
  commit,
}: {
  plan: Plan
  written: string[]
  commit?: { sha: string; url: string }
}) {
  const [copied, setCopied] = useState(false)

  const quote = (paths: string[]) => paths.map((p) => `'${p}'`).join(' ')
  // 없던 파일은 checkout 으로 되돌아오지 않는다. 지워야 한다.
  const created = plan.changes.filter((c) => c.op === 'create').map((c) => c.path)
  const restored = written.filter((p) => !created.includes(p))
  // git checkout . 이 아니라 건드린 파일만 지정한다. 다른 초안을 날리지 않기 위해서다.
  const cmd = [
    restored.length > 0 ? `git checkout -- ${quote(restored)}` : '',
    created.length > 0 ? `rm ${quote(created)}` : '',
  ]
    .filter(Boolean)
    .join(' && ')

  const done = `${subject(plan.changes)} ${written.length}개`

  // 프로덕션은 커밋으로 쓰므로 로컬 되돌리기 명령이 의미가 없다. 커밋을 보여준다.
  if (commit) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
        <p className="text-[13px] text-fg-body">{done}를 저장하고 커밋했습니다.</p>
        <a
          href={commit.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto font-mono text-[11px] text-accent hover:underline"
        >
          {commit.sha.slice(0, 7)}
        </a>
        <span className="text-[11px] text-fg-subtle">사이트 반영까지 1~2분</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
      <p className="text-[13px] text-fg-body">{done}를 저장했습니다.</p>
      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-subtle">{cmd}</code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(cmd)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="h-[30px] shrink-0 rounded-lg border border-border px-2.5 text-[13px] text-fg-body hover:bg-bg-hover"
      >
        {copied ? '복사됨' : '되돌리기 명령 복사'}
      </button>
    </div>
  )
}
