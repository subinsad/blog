'use client'

import { useMemo, useRef, useState } from 'react'
import { CATEGORIES, type Category } from '@/lib/site'
import type { Draft } from '@/lib/editor/frontmatter'
import { findSimilar, suggestTags, type KnownTag } from '@/lib/tags'

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
  knownTags,
}: {
  draft: Draft
  onChange: (patch: Partial<Draft>) => void
  seriesOptions: { id: string; title: string }[]
  stats: { chars: number; minutes: number }
  knownTags: KnownTag[]
}) {
  const [tagInput, setTagInput] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const typed = tagInput.trim().replace(/^#/, '')

  const suggestions = useMemo(
    () => suggestTags(typed, knownTags, draft.tags),
    [typed, knownTags, draft.tags],
  )

  /**
   * 이미 있는 태그와 사실상 같은 이름인지 본다.
   * 태그가 잘게 쪼개지는 원인이 바로 이 입력창의 자유 텍스트다.
   */
  const similar = typed
    ? findSimilar(typed, knownTags.map((t) => t.name).filter((n) => !draft.tags.includes(n)))
    : null

  const commitTag = (name: string) => {
    const t = name.trim().replace(/^#/, '')
    if (!t || draft.tags.includes(t)) {
      setTagInput('')
      setOpen(false)
      return
    }
    onChange({ tags: [...draft.tags, t] })
    setTagInput('')
    setHighlight(0)
    setOpen(false)
  }

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => (h + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        commitTag(suggestions[highlight]?.name ?? typed)
        return
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTag(typed)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
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
          <div className="relative">
            <input
              ref={inputRef}
              className={`${field} mt-1.5`}
              placeholder="태그 입력 후 Enter"
              value={tagInput}
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-autocomplete="list"
              aria-controls="tag-suggestions"
              onChange={(e) => {
                setTagInput(e.target.value)
                setHighlight(0)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={onTagKeyDown}
            />

            {open && suggestions.length > 0 && (
              <ul
                id="tag-suggestions"
                role="listbox"
                className="absolute inset-x-0 top-[calc(100%+4px)] z-[70] max-h-[200px] overflow-y-auto rounded-lg border border-border bg-bg-elevated p-1"
              >
                {suggestions.map((t, i) => (
                  <li key={t.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === highlight}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        commitTag(t.name)
                      }}
                      onMouseEnter={() => setHighlight(i)}
                      className={[
                        'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-fg-body',
                        i === highlight ? 'bg-bg-hover' : '',
                      ].join(' ')}
                    >
                      <span className="min-w-0 flex-1 truncate">#{t.name}</span>
                      <span className="shrink-0 text-[11px] text-fg-subtle tabular-nums">
                        {t.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {similar && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
              <button
                type="button"
                onClick={() => commitTag(similar)}
                className="font-medium text-accent hover:underline"
              >
                #{similar}
              </button>{' '}
              태그가 이미 있습니다. 같은 뜻이면 그걸 쓰세요.
            </p>
          )}
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
