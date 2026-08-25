'use client'

import type { Editor } from '@tiptap/core'

const TURN = [
  { type: 'paragraph', label: '텍스트', icon: 'T' },
  { type: 'heading1', label: '제목 1', icon: 'H1' },
  { type: 'heading2', label: '제목 2', icon: 'H2' },
  { type: 'heading3', label: '제목 3', icon: 'H3' },
  { type: 'blockquote', label: '인용', icon: '"' },
  { type: 'codeBlock', label: '코드 블록', icon: '</>' },
] as const

const isActive = (e: Editor, t: (typeof TURN)[number]['type']) =>
  t.startsWith('heading')
    ? e.isActive('heading', { level: Number(t.slice(-1)) })
    : e.isActive(t)

const turn = (e: Editor, t: (typeof TURN)[number]['type']) => {
  const c = e.chain().focus()
  if (t === 'paragraph') c.setParagraph().run()
  else if (t.startsWith('heading')) c.setNode('heading', { level: Number(t.slice(-1)) }).run()
  else if (t === 'blockquote') c.toggleBlockquote().run()
  else if (t === 'codeBlock') c.toggleCodeBlock().run()
}

export function BlockMenu({
  editor,
  pos,
  onClose,
}: {
  editor: Editor
  pos: { left: number; top: number }
  onClose: () => void
}) {
  const width = 224
  const left = Math.min(pos.left, document.documentElement.clientWidth - width - 16)

  const act = (fn: () => void) => {
    fn()
    onClose()
  }

  return (
    <div
      style={{ left, top: pos.top, width }}
      className="fixed z-[85] rounded-xl border border-border bg-bg-elevated p-1.5"
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="px-2.5 pt-1.5 pb-1 text-[11px] text-fg-subtle">전환</p>
      {/* 현재 블록 타입은 목록에서 뺀다. "제목 2인 블록을 제목 2로 전환"은 잘못 읽힌다 */}
      {TURN.filter((t) => !isActive(editor, t.type)).map((t) => (
        <button
          key={t.type}
          type="button"
          onClick={() => act(() => turn(editor, t.type))}
          className="flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-fg-body hover:bg-bg-hover"
        >
          <span className="w-5 shrink-0 font-mono text-[11px] text-fg-subtle">{t.icon}</span>
          {t.label}
        </button>
      ))}

      <div className="my-1.5 border-t border-border" />

      <button
        type="button"
        onClick={() =>
          act(() => {
            const { state, view } = editor
            const { $from } = state.selection
            const depth = $from.depth > 0 ? 1 : 0
            const node = $from.node(depth)
            const start = $from.before(depth)
            view.dispatch(state.tr.insert(start + node.nodeSize, node.copy(node.content)))
          })
        }
        className="flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-fg-body hover:bg-bg-hover"
      >
        <span className="w-5 shrink-0 text-fg-subtle">⧉</span>복제
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">⌘D</span>
      </button>
      <button
        type="button"
        onClick={() => act(() => editor.chain().focus().deleteNode('paragraph').run())}
        className="group flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-fg-body hover:bg-bg-hover hover:text-[#e03131]"
      >
        <span className="w-5 shrink-0 text-fg-subtle group-hover:text-[#e03131]">✕</span>삭제
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">⌘⌫</span>
      </button>

      <p className="mt-1.5 border-t border-border px-2.5 pt-2 pb-1 text-[11px] leading-relaxed text-fg-subtle">
        ⇧ + 우클릭 → 브라우저 기본 메뉴
      </p>
    </div>
  )
}
