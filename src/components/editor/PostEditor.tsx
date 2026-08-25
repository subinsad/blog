'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Editor } from '@tiptap/core'
import { marked } from 'marked'

import { CaptionParagraph } from '@/lib/editor/caption'
import { TextColor, BgColor } from '@/lib/editor/color-marks'
import { SlashCommand } from '@/lib/editor/slash-extension'
import { docToMarkdown } from '@/lib/editor/serialize'
import { buildMdx, slugify, type Draft } from '@/lib/editor/frontmatter'

import { Toolbar } from './Toolbar'
import { SlashMenu, type SlashMenuState } from './SlashMenu'
import { BlockMenu } from './BlockMenu'
import { SettingsPanel } from './SettingsPanel'
import { Popover } from './Popover'
import { ColorPicker } from './ColorPicker'

type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string }

const EMPTY_SLASH: SlashMenuState = {
  open: false, items: [], index: 0, rect: null, command: () => {},
}

export function PostEditor({
  initial,
  initialBody,
  seriesOptions,
}: {
  initial: Draft
  initialBody: string
  seriesOptions: { id: string; title: string }[]
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug))
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })
  const [slash, setSlash] = useState<SlashMenuState>(EMPTY_SLASH)
  const [blockMenu, setBlockMenu] = useState<{ left: number; top: number } | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null)
  const [bubbleColor, setBubbleColor] = useState(false)
  // 에디터 내용이 바뀔 때마다 올려서 파생값(글자 수 등)을 다시 계산시킨다
  const [version, setVersion] = useState(0)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 저장 타이머가 최신 draft를 읽어야 한다. 렌더 중에 ref를 쓰면 안 되므로 이펙트로 동기화한다.
  const latest = useRef(draft)
  useEffect(() => {
    latest.current = draft
  }, [draft])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        link: { openOnClick: false, autolink: true },
      }),
      CaptionParagraph,
      TextColor,
      BgColor,
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'paragraph' ? "'/' 를 눌러 블록을 추가하세요" : '',
      }),
      SlashCommand.configure({
        onUpdate: (s) => setSlash({ ...s }),
      }),
    ],
    content: initialBody ? marked.parse(initialBody, { async: false }) : '',
    editorProps: {
      attributes: { class: 'wbody outline-none min-h-[420px]' },
    },
  })

  const stats = useMemo(() => {
    const text = editor?.getText() ?? ''
    const chars = text.replace(/\s/g, '').length
    return { chars, minutes: Math.max(1, Math.round(chars / 500)) }
    // editor.getText()는 ProseMirror 내부 상태라 린터가 추적하지 못한다.
    // version이 바뀔 때 다시 계산하는 것이 의도된 동작이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, version])

  const persist = useCallback(async () => {
    const d = latest.current
    const md = editor ? docToMarkdown(editor.getJSON()) : ''
    if (!d.slug) return
    setSave({ kind: 'saving' })
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, body: md }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '저장 실패')
      setSave({ kind: 'saved' })
    } catch (e) {
      setSave({ kind: 'error', message: e instanceof Error ? e.message : '저장 실패' })
    }
  }, [editor])

  /** 입력이 멈추고 3초 뒤 저장. (DESIGN.md §13.12) */
  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(persist, 3000)
  }, [persist])

  useEffect(() => {
    if (!editor) return
    const onUpdate = () => {
      setVersion((v) => v + 1)
      setSave((s) => (s.kind === 'saving' ? s : { kind: 'idle' }))
      scheduleSave()
    }
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
    }
  }, [editor, scheduleSave])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...p }
      if ('slug' in p) setSlugTouched(true)
      return next
    })
    scheduleSave()
  }

  const setTitle = (title: string) => {
    setDraft((d) => ({ ...d, title, slug: slugTouched ? d.slug : slugify(title) }))
    scheduleSave()
  }

  // 우클릭 → 블록 메뉴. ⇧+우클릭이면 브라우저 기본 메뉴를 통과시킨다
  useEffect(() => {
    const el = document.querySelector('.wbody')
    if (!el) return
    const onCtx = (e: Event) => {
      const me = e as MouseEvent
      if (me.shiftKey) return
      me.preventDefault()
      setBlockMenu({ left: me.clientX, top: me.clientY })
    }
    el.addEventListener('contextmenu', onCtx)
    return () => el.removeEventListener('contextmenu', onCtx)
  }, [editor])

  // ⌘S 즉시 저장, ⌘/ 원문 토글
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 's') {
        e.preventDefault()
        void persist()
      } else if (e.key === '/') {
        e.preventDefault()
        setRaw((r) => (r === null ? buildMdx({ ...latest.current, body: editor ? docToMarkdown(editor.getJSON()) : '' }) : null))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [persist, editor])

  const status =
    save.kind === 'saving' ? '저장 중…'
    : save.kind === 'saved' ? '저장됨'
    : save.kind === 'error' ? `저장 실패 — ${save.message}`
    : draft.slug ? '변경됨' : 'slug이 필요합니다'

  if (!editor) return <div className="p-14 text-sm text-fg-muted">에디터를 불러오는 중…</div>

  return (
    <>
      <div className="sticky top-0 z-50 h-14 border-b border-border bg-bg">
        <div className="mx-auto flex h-full max-w-[var(--container)] items-center gap-4 px-[var(--gutter)]">
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-fg-muted hover:bg-bg-hover hover:text-fg-body"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            나가기
          </Link>
          <span
            className={`ml-auto text-xs tabular-nums ${save.kind === 'error' ? 'text-[#e03131]' : 'text-fg-subtle'}`}
            aria-live="polite"
          >
            {status}
          </span>
          <button
            type="button"
            onClick={() => void persist()}
            className="h-[34px] rounded-lg border border-border-strong px-3.5 text-[13px] font-medium text-fg-body hover:bg-bg-hover"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => {
              patch({ draft: false })
              void persist()
            }}
            className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover"
          >
            발행
          </button>
        </div>
      </div>

      <Toolbar
        editor={editor}
        onToggleRaw={() =>
          setRaw((r) => (r === null ? buildMdx({ ...draft, body: docToMarkdown(editor.getJSON()) }) : null))
        }
      />

      <div className="mx-auto grid max-w-[var(--container)] grid-cols-[minmax(0,1fr)_320px] gap-14 px-[var(--gutter)] max-[1200px]:grid-cols-[minmax(0,1fr)] max-[1200px]:gap-0">
        <div className="mx-auto w-full max-w-[720px] pt-14 pb-40">
          <input
            value={draft.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="mb-2 w-full bg-transparent text-[32px] leading-[1.35] font-bold tracking-[-0.02em] text-fg outline-none placeholder:text-fg-subtle"
          />
          <p className="mb-7 border-b border-border pb-5 text-[13px] text-fg-subtle">
            {draft.date} · {draft.category} · {draft.draft ? '초안' : '발행'}
          </p>

          {raw !== null ? (
            <pre className="overflow-x-auto rounded-lg border border-border bg-[var(--code-bg)] p-4 font-mono text-[13px] leading-relaxed text-fg-body">
              {raw}
            </pre>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>

        <SettingsPanel draft={draft} onChange={patch} seriesOptions={seriesOptions} stats={stats} />
      </div>

      <BubbleMenu editor={editor} className="flex h-9 items-center gap-0.5 rounded-lg border border-border bg-bg-elevated px-1">
        {([
          ['bold', 'B', '굵게', 'font-bold'],
          ['italic', 'I', '기울임', 'italic font-serif'],
          ['underline', 'U', '밑줄', 'underline'],
          ['strike', 'S', '취소선', 'line-through'],
        ] as const).map(([mark, label, tip, cls]) => (
          <button
            key={mark}
            type="button"
            title={tip}
            aria-label={tip}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleMark(mark).run()}
            className={[
              'grid h-7 w-[30px] place-items-center rounded-md text-[13px]',
              editor.isActive(mark) ? 'bg-accent-subtle text-accent' : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
              cls,
            ].join(' ')}
          >
            {label}
          </button>
        ))}
        <button
          ref={setColorAnchor}
          type="button"
          title="글자 색"
          aria-label="글자 색"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setBubbleColor((v) => !v)}
          className="grid h-7 w-[30px] place-items-center rounded-md text-[13px] text-fg-muted hover:bg-bg-hover hover:text-fg"
        >
          <span className="border-b-2 border-[var(--m-red)] leading-none">A</span>
        </button>
      </BubbleMenu>

      {bubbleColor && (
        <Popover anchor={colorAnchor} width={220} onClose={() => setBubbleColor(false)}>
          <ColorPicker editor={editor} onDone={() => setBubbleColor(false)} />
        </Popover>
      )}

      <SlashMenu state={slash} />

      {blockMenu && (
        <BlockMenu editor={editor} pos={blockMenu} onClose={() => setBlockMenu(null)} />
      )}
    </>
  )
}


export type { Editor }
