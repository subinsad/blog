'use client'

import type { Editor } from '@tiptap/core'

/** 크기는 임의 px이 아니라 타입 스케일의 항목이다. (DESIGN.md §13.9) */
const SIZES = [
  { label: '제목 1', px: 32, run: (e: Editor) => e.chain().focus().setNode('heading', { level: 1 }).run() },
  { label: '제목 2', px: 24, run: (e: Editor) => e.chain().focus().setNode('heading', { level: 2 }).run() },
  { label: '제목 3', px: 20, run: (e: Editor) => e.chain().focus().setNode('heading', { level: 3 }).run() },
  { label: '본문', px: 17, run: (e: Editor) => e.chain().focus().setParagraph().updateAttributes('paragraph', { caption: false }).run() },
  { label: '작은 글씨', px: 15, run: (e: Editor) => e.chain().focus().setParagraph().updateAttributes('paragraph', { caption: true }).run() },
]

export function SizePicker({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  return (
    <>
      {SIZES.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => {
            s.run(editor)
            onDone()
          }}
          style={{ fontSize: Math.min(s.px, 20) }}
          className="flex h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 text-fg-body hover:bg-bg-hover"
        >
          {s.label}
          <span className="ml-auto font-mono text-[11px] text-fg-subtle tabular-nums">
            {s.px}
          </span>
        </button>
      ))}
    </>
  )
}
