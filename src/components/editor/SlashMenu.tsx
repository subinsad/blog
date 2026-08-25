'use client'

import type { SlashItem } from '@/lib/editor/slash-items'

export type SlashMenuState = {
  open: boolean
  items: SlashItem[]
  index: number
  rect: { left: number; top: number; bottom: number } | null
  command: (item: SlashItem) => void
}

export function SlashMenu({ state }: { state: SlashMenuState }) {
  if (!state.open || !state.rect) return null

  const width = 280
  const left = Math.min(state.rect.left, document.documentElement.clientWidth - width - 16)
  const spaceBelow = window.innerHeight - state.rect.bottom
  const top = spaceBelow < 340 ? undefined : state.rect.bottom + 8
  const bottom = spaceBelow < 340 ? window.innerHeight - state.rect.top + 8 : undefined

  // 그룹 헤더는 렌더 중 변수를 갱신하지 않고 미리 계산한다
  const rows = state.items.map((item, i) => ({
    item,
    i,
    header: i === 0 || state.items[i - 1].group !== item.group ? item.group : null,
  }))

  return (
    <div
      style={{ left, top, bottom, width }}
      className="fixed z-[80] max-h-[320px] overflow-y-auto rounded-xl border border-border bg-bg-elevated p-1.5"
    >
      {rows.map(({ item, i, header }) => (
        <div key={item.title}>
          {header && (
            <p className="px-2.5 pt-2 pb-1 text-[11px] text-fg-subtle">{header}</p>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              state.command(item)
            }}
            className={[
              'flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-fg-body',
              i === state.index ? 'bg-bg-hover' : '',
            ].join(' ')}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-bg-subtle font-mono text-[11px] text-fg-muted">
              {item.icon}
            </span>
            {item.title}
            {item.hint && (
              <span className="ml-auto font-mono text-[11px] text-fg-subtle">
                {item.hint}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
