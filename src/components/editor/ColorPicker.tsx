'use client'

import type { Editor } from '@tiptap/core'
import { MARK_COLORS, MARK_LABEL, markAlpha } from '@/lib/editor/marks'

export function ColorPicker({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const apply = (fn: () => void) => {
    fn()
    onDone()
  }

  return (
    <>
      <p className="px-1.5 pt-1 pb-2 text-[11px] text-fg-subtle">글자 색</p>
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          title="기본"
          onClick={() => apply(() => editor.chain().focus().setTextColor(null).run())}
          className="grid size-8 place-items-center rounded-lg border border-border text-sm font-medium text-fg hover:border-border-strong"
        >
          A
        </button>
        {MARK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={MARK_LABEL[c]}
            onClick={() => apply(() => editor.chain().focus().setTextColor(c).run())}
            style={{ color: `var(--m-${c})` }}
            className="grid size-8 place-items-center rounded-lg border border-border text-sm font-medium hover:border-border-strong"
          >
            A
          </button>
        ))}
      </div>

      <div className="my-2.5 border-t border-border" />
      <p className="px-1.5 pb-2 text-[11px] text-fg-subtle">배경 색</p>
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          title="없음"
          onClick={() => apply(() => editor.chain().focus().setBgColor(null).run())}
          className="grid size-8 place-items-center rounded-lg border border-border text-xs text-fg-subtle hover:border-border-strong"
        >
          ⊘
        </button>
        {MARK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={MARK_LABEL[c]}
            onClick={() => apply(() => editor.chain().focus().setBgColor(c).run())}
            style={{
              background: `color-mix(in srgb, var(--m-${c}) ${markAlpha(c)}, transparent)`,
            }}
            className="size-8 rounded-lg border border-border hover:border-border-strong"
          />
        ))}
      </div>
    </>
  )
}
