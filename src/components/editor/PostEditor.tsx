'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import type { KnownTag } from '@/lib/tags'
import { saveLocal, clearLocal, sinceLabel } from '@/lib/editor/local-draft'

import { Toolbar } from './Toolbar'
import { SlashMenu, type SlashMenuState } from './SlashMenu'
import { BlockMenu } from './BlockMenu'
import { SettingsPanel } from './SettingsPanel'
import { PublishOverlay } from './PublishOverlay'
import { Popover } from './Popover'
import { ColorPicker } from './ColorPicker'

type SaveState =
  | { kind: 'clean' }
  /** 브라우저에만 있고 저장소에는 아직 없음 */
  | { kind: 'local'; at: number }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number; commitUrl?: string }
  | { kind: 'error'; message: string }

const EMPTY_SLASH: SlashMenuState = {
  open: false, items: [], index: 0, rect: null, command: () => {},
}

export function PostEditor({
  initial,
  initialBody,
  seriesOptions,
  knownTags,
}: {
  initial: Draft
  initialBody: string
  seriesOptions: { id: string; title: string }[]
  knownTags: KnownTag[]
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug))
  const [save, setSave] = useState<SaveState>({ kind: 'clean' })
  const [slash, setSlash] = useState<SlashMenuState>(EMPTY_SLASH)
  const [blockMenu, setBlockMenu] = useState<{ left: number; top: number } | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null)
  const [bubbleColor, setBubbleColor] = useState(false)
  // 에디터 내용이 바뀔 때마다 올려서 파생값(글자 수 등)을 다시 계산시킨다
  const [version, setVersion] = useState(0)
  const [published, setPublished] = useState<{ slug: string; commitUrl?: string } | null>(null)
  const router = useRouter()

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

  /** 저장소에 쓴다. 사람이 저장·발행을 눌렀을 때만 호출된다. */
  const commit = useCallback(
    async (override?: Partial<Draft>) => {
      const d = { ...latest.current, ...override }
      const md = editor ? docToMarkdown(editor.getJSON()) : ''
      if (!d.slug) {
        setSave({ kind: 'error', message: 'slug이 필요합니다' })
        return null
      }
      setSave({ kind: 'saving' })
      try {
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d, body: md }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '저장 실패')
        clearLocal(d.slug)
        setSave({ kind: 'saved', at: Date.now(), commitUrl: json.commit?.url })
        return { slug: d.slug, commitUrl: json.commit?.url as string | undefined }
      } catch (e) {
        setSave({ kind: 'error', message: e instanceof Error ? e.message : '저장 실패' })
        return null
      }
    },
    [editor],
  )

  /**
   * 타이핑 중에는 브라우저에만 쌓는다. 네트워크로 나가지 않는다.
   * 프로덕션에서 저장은 곧 커밋이라, 3초 debounce로 커밋하면 글 하나에
   * 커밋이 수십 개 쌓이고 히스토리가 못 쓰게 된다.
   */
  const scheduleLocal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const d = latest.current
      const md = editor ? docToMarkdown(editor.getJSON()) : ''
      saveLocal(d.slug, d, md)
      setSave({ kind: 'local', at: Date.now() })
    }, 600)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const onUpdate = () => {
      setVersion((v) => v + 1)
      scheduleLocal()
    }
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
    }
  }, [editor, scheduleLocal])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  /** 저장소에 없는 변경을 들고 탭을 닫으려 하면 막는다. */
  const uncommitted = save.kind === 'local' || save.kind === 'error'
  useEffect(() => {
    if (!uncommitted) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [uncommitted])


  const patch = (p: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...p }
      if ('slug' in p) setSlugTouched(true)
      return next
    })
    scheduleLocal()
  }

  const setTitle = (title: string) => {
    setDraft((d) => ({ ...d, title, slug: slugTouched ? d.slug : slugify(title) }))
    scheduleLocal()
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
        void commit()
      } else if (e.key === '/') {
        e.preventDefault()
        setRaw((r) => (r === null ? buildMdx({ ...latest.current, body: editor ? docToMarkdown(editor.getJSON()) : '' }) : null))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [commit, editor])

  const status = (() => {
    switch (save.kind) {
      case 'saving':
        return { text: '저장 중…', tone: 'muted' as const }
      case 'saved':
        return { text: `저장소에 저장됨 · ${sinceLabel(save.at)}`, tone: 'muted' as const }
      case 'local':
        // 브라우저에만 있다는 걸 분명히 해야 한다. 저장됐다고 믿고 탭을 닫으면 잃는다.
        return { text: '브라우저에만 저장됨', tone: 'warn' as const }
      case 'error':
        return { text: save.message, tone: 'error' as const }
      default:
        return { text: draft.slug ? '' : 'slug이 필요합니다', tone: 'muted' as const }
    }
  })()


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
          <span className="ml-auto flex items-center gap-2" aria-live="polite">
            {save.kind === 'local' && (
              <span className="size-1.5 rounded-full bg-[var(--m-orange)]" aria-hidden="true" />
            )}
            <span
              className={
                status.tone === 'error'
                  ? 'text-xs text-[var(--m-red)]'
                  : status.tone === 'warn'
                    ? 'text-xs text-fg-muted'
                    : 'text-xs text-fg-subtle'
              }
            >
              {status.text}
            </span>
            {save.kind === 'saved' && save.commitUrl && (
              <a
                href={save.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-accent hover:underline"
              >
                커밋 보기
              </a>
            )}
          </span>
          <button
            type="button"
            onClick={() => void commit()}
            disabled={save.kind === 'saving'}
            className="h-[34px] rounded-lg border border-border-strong px-3.5 text-[13px] font-medium text-fg-body hover:bg-bg-hover disabled:opacity-50"
          >
            저장
          </button>
          <button
            type="button"
            onClick={async () => {
              patch({ draft: false })
              const r = await commit({ draft: false })
              if (r) setPublished(r)
            }}
            disabled={save.kind === 'saving'}
            className="h-[34px] rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
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

        <SettingsPanel
          draft={draft}
          onChange={patch}
          seriesOptions={seriesOptions}
          stats={stats}
          knownTags={knownTags}
        />
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

      {published && (
        <PublishOverlay
          slug={published.slug}
          commitUrl={published.commitUrl}
          onNavigate={() => router.push(`/posts/${published.slug}`)}
          onDismiss={() => setPublished(null)}
        />
      )}

      <SlashMenu state={slash} />

      {blockMenu && (
        <BlockMenu editor={editor} pos={blockMenu} onClose={() => setBlockMenu(null)} />
      )}
    </>
  )
}


export type { Editor }
