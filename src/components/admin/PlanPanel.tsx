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

      {plan.deadUrls.length > 0 && (
        <div className="border-b border-border px-4 py-2.5 text-[13px] text-fg-muted">
          사라지는 URL{' '}
          <span className="font-mono text-[11px] text-fg-subtle">
            {plan.deadUrls.join('  ')}
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
          {busy ? '적용 중…' : `글 ${plan.changes.length}개 수정`}
        </button>
      </div>
    </div>
  )
}

/** 실행 후 남기는 결과 줄. 토스트는 사라지는데 그 안에 되돌리는 방법이 들어간다. */
export function ResultStrip({ written }: { written: string[] }) {
  const [copied, setCopied] = useState(false)
  // git checkout . 이 아니라 건드린 파일만 지정한다. 다른 초안을 날리지 않기 위해서다.
  const cmd = `git checkout -- ${written.map((p) => `'${p}'`).join(' ')}`

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
      <p className="text-[13px] text-fg-body">글 {written.length}개를 수정했습니다.</p>
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
