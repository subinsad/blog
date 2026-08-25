'use client'

import { useState } from 'react'
import { CATEGORIES, type Category } from '@/lib/site'
import type { Draft } from '@/lib/editor/frontmatter'

const Row = ({ label, children, top }: { label: string; children: React.ReactNode; top?: boolean }) => (
  <div className={`mb-3 grid grid-cols-[64px_minmax(0,1fr)] gap-3 ${top ? 'items-start' : 'items-center'}`}>
    <span className={`text-xs text-fg-muted ${top ? 'pt-2' : ''}`}>{label}</span>
    {children}
  </div>
)

const field =
  'h-8 w-full rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg-body outline-none transition-colors hover:border-border-strong focus:border-accent'

export function SettingsPanel({
  draft,
  onChange,
  seriesOptions,
  stats,
}: {
  draft: Draft
  onChange: (patch: Partial<Draft>) => void
  seriesOptions: { id: string; title: string }[]
  stats: { chars: number; minutes: number }
}) {
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (!t || draft.tags.includes(t)) return setTagInput('')
    onChange({ tags: [...draft.tags, t] })
    setTagInput('')
  }

  return (
    <aside className="sticky top-[116px] h-fit self-start pt-14 max-[1200px]:static max-[1200px]:mx-auto max-[1200px]:w-full max-[1200px]:max-w-[720px] max-[1200px]:pt-0 max-[1200px]:pb-20">
      <p className="mb-4 text-[13px] font-medium text-fg">발행 설정</p>

      <Row label="카테고리">
        <select
          className={field}
          value={draft.category}
          onChange={(e) => onChange({ category: e.target.value as Category })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Row>

      <Row label="태그" top>
        <div>
          <div className="flex flex-wrap gap-1.5">
            {draft.tags.map((t) => (
              <button
                key={t}
                type="button"
                title="클릭하면 삭제"
                onClick={() => onChange({ tags: draft.tags.filter((x) => x !== t) })}
                className="inline-flex h-6 items-center rounded-full bg-bg-subtle px-2.5 text-[13px] text-fg-muted hover:text-[#e03131]"
              >
                #{t}
              </button>
            ))}
          </div>
          <input
            className={`${field} mt-1.5`}
            placeholder="태그 입력 후 Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
          />
        </div>
      </Row>

      <Row label="시리즈">
        <select
          className={field}
          value={draft.series}
          onChange={(e) => onChange({ series: e.target.value, seriesOrder: e.target.value ? (draft.seriesOrder ?? 1) : null })}
        >
          <option value="">없음</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </Row>

      {draft.series && (
        <Row label="회차">
          <input
            type="number"
            min={1}
            className={field}
            value={draft.seriesOrder ?? 1}
            onChange={(e) => onChange({ seriesOrder: Number(e.target.value) || 1 })}
          />
        </Row>
      )}

      <Row label="발행일">
        <input
          type="date"
          className={field}
          value={draft.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
      </Row>

      <Row label="요약" top>
        <textarea
          className={`${field} h-auto min-h-16 py-2 leading-relaxed`}
          placeholder="카드·목록·OG·RSS에 함께 쓰입니다"
          value={draft.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
        />
      </Row>

      <Row label="초안">
        <label className="flex h-8 items-center gap-2 text-[13px] text-fg-body">
          <input
            type="checkbox"
            checked={draft.draft}
            onChange={(e) => onChange({ draft: e.target.checked })}
          />
          draft: true (프로덕션에서 숨김)
        </label>
      </Row>

      <div className="my-5 border-t border-border" />

      <Row label="slug">
        <input
          className={`${field} font-mono text-xs`}
          value={draft.slug}
          onChange={(e) => onChange({ slug: e.target.value })}
        />
      </Row>

      <div className="mt-3 flex justify-between text-xs text-fg-subtle tabular-nums">
        <span>읽기 시간</span>
        <span className="font-mono text-fg-muted">약 {stats.minutes}분</span>
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-fg-subtle tabular-nums">
        <span>글자 수</span>
        <span className="font-mono text-fg-muted">{stats.chars.toLocaleString()}</span>
      </div>
    </aside>
  )
}
