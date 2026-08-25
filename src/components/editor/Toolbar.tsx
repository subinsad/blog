'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { Popover } from './Popover'
import { ColorPicker } from './ColorPicker'
import { SizePicker } from './SizePicker'

const BLOCK_LABEL = (e: Editor) => {
  if (e.isActive('heading', { level: 1 })) return '제목 1'
  if (e.isActive('heading', { level: 2 })) return '제목 2'
  if (e.isActive('heading', { level: 3 })) return '제목 3'
  if (e.isActive('codeBlock')) return '코드 블록'
  if (e.isActive('blockquote')) return '인용'
  if (e.isActive('bulletList')) return '불릿 목록'
  if (e.isActive('orderedList')) return '번호 목록'
  if (e.isActive('paragraph', { caption: true })) return '작은 글씨'
  return '텍스트'
}

function Btn({
  onClick,
  tip,
  active,
  children,
  refCb,
}: {
  onClick: () => void
  tip: string
  active?: boolean
  children: React.ReactNode
  refCb?: (el: HTMLButtonElement | null) => void
}) {
  return (
    <button
      ref={refCb}
      type="button"
      title={tip}
      aria-label={tip}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        'relative inline-flex h-[30px] min-w-[30px] items-center justify-center gap-1.5 rounded-md px-1.5 text-[13px] transition-colors',
        active ? 'bg-accent-subtle text-accent' : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const Sep = () => <span className="mx-1.5 h-[18px] w-px shrink-0 bg-border" />
const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export function Toolbar({ editor, onToggleRaw }: { editor: Editor; onToggleRaw: () => void }) {
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null)
  const [sizeAnchor, setSizeAnchor] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState<'color' | 'size' | null>(null)

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      block: BLOCK_LABEL(e),
    }),
  })

  return (
    <div className="sticky top-14 z-[49] h-11 border-b border-border bg-bg">
      <div className="mx-auto flex h-full max-w-[var(--container)] items-center gap-0.5 overflow-x-auto px-[var(--gutter)]">
        <Btn
          refCb={setSizeAnchor}
          tip="글자 크기"
          onClick={() => setOpen(open === 'size' ? null : 'size')}
        >
          <span className="min-w-[70px] text-left text-fg-body">{s.block}</span>
          <Chevron />
        </Btn>
        <Sep />

        <Btn tip="굵게  ⌘B" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </Btn>
        <Btn tip="기울임  ⌘I" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="font-serif italic">I</span>
        </Btn>
        <Btn tip="밑줄  ⌘U" active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </Btn>
        <Btn tip="취소선  ⌘⇧X" active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </Btn>
        <Btn tip="인라인 코드  ⌘E" active={s.code} onClick={() => editor.chain().focus().toggleCode().run()}>
          <span className="font-mono text-xs">&lt;&gt;</span>
        </Btn>

        <Btn
          refCb={setColorAnchor}
          tip="글자 색 · 배경 색"
          onClick={() => setOpen(open === 'color' ? null : 'color')}
        >
          <span className="grid size-4 place-items-center rounded bg-bg-subtle text-xs font-medium">A</span>
          <Chevron />
        </Btn>
        <Sep />

        <Btn tip="불릿 목록  -" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</Btn>
        <Btn tip="번호 목록  1." active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</Btn>
        <Btn tip="인용  &gt;" active={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>&quot;</Btn>
        <Sep />

        <Btn tip="코드 블록  ```" active={s.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <span className="font-mono text-[11px]">```</span>
        </Btn>
        <Btn
          tip="링크  ⌘K"
          onClick={() => {
            const prev = editor.getAttributes('link').href as string | undefined
            const url = window.prompt('링크 주소', prev ?? 'https://')
            if (url === null) return
            if (url === '') editor.chain().focus().unsetLink().run()
            else editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
        </Btn>
        <Btn tip="구분선  ---" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</Btn>
        <Sep />

        <Btn tip="실행 취소  ⌘Z" onClick={() => editor.chain().focus().undo().run()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </Btn>
        <Btn tip="다시 실행  ⌘⇧Z" onClick={() => editor.chain().focus().redo().run()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </Btn>

        <span className="ml-auto" />
        <Btn tip="원문(MDX) 보기  ⌘/" onClick={onToggleRaw}>
          <span className="font-mono text-[11px]">MD</span>
        </Btn>
      </div>

      {open === 'color' && (
        <Popover anchor={colorAnchor} width={220} onClose={() => setOpen(null)}>
          <ColorPicker editor={editor} onDone={() => setOpen(null)} />
        </Popover>
      )}
      {open === 'size' && (
        <Popover anchor={sizeAnchor} width={196} onClose={() => setOpen(null)}>
          <SizePicker editor={editor} onDone={() => setOpen(null)} />
        </Popover>
      )}
    </div>
  )
}
