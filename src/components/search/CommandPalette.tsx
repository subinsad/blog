'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchPosts, highlightRange, type SearchDoc, type SearchHit } from '@/lib/search'
import { CATEGORY_META } from '@/lib/site'
import { formatDate } from '@/lib/format'

/** 맞은 구간만 강조한다. 초성으로 맞았을 때는 강조할 구간이 없다. */
function Marked({ text, query }: { text: string; query: string }) {
  const r = highlightRange(text, query)
  if (!r) return <>{text}</>
  return (
    <>
      {text.slice(0, r[0])}
      <mark className="bg-transparent font-bold text-accent">{text.slice(r[0], r[1])}</mark>
      {text.slice(r[1])}
    </>
  )
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [docs, setDocs] = useState<SearchDoc[] | null>(null)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setIndex(0)
  }, [])

  /** 인덱스는 처음 열 때 한 번만 받는다. 모든 방문자에게 미리 보낼 이유가 없다. */
  const load = useCallback(async () => {
    if (docs) return
    try {
      const res = await fetch('/search-index.json')
      setDocs((await res.json()) as SearchDoc[])
    } catch {
      setDocs([])
    }
  }, [docs])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        void load()
      } else if (e.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [load, close])

  // 헤더 버튼이 이 이벤트로 연다
  useEffect(() => {
    const onOpen = () => {
      setOpen(true)
      void load()
    }
    window.addEventListener('subbi:search', onOpen)
    return () => window.removeEventListener('subbi:search', onOpen)
  }, [load])

  // 포커스만 이펙트에서 한다. 상태 초기화는 닫는 쪽에서 직접 한다.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const hits: SearchHit[] = docs ? searchPosts(docs, query) : []
  const recent = docs ? docs.slice(0, 5) : []
  const list = query.trim() ? hits.map((h) => h.doc) : recent

  const go = (slug: string) => {
    close()
    router.push(`/posts/${slug}`)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[95] bg-[rgba(0,0,0,0.5)] backdrop-blur-[2px]"
      onMouseDown={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="검색"
        onMouseDown={(e) => e.stopPropagation()}
        className="mx-auto mt-[15vh] w-[calc(100%-32px)] max-w-[560px] overflow-hidden rounded-xl border border-border bg-bg-elevated"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIndex(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((i) => (list.length ? (i + 1) % list.length : 0))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((i) => (list.length ? (i - 1 + list.length) % list.length : 0))
            } else if (e.key === 'Enter' && list[index]) {
              e.preventDefault()
              go(list[index].slug)
            }
          }}
          placeholder="제목·태그·요약 검색 · 초성도 됩니다"
          className="h-[52px] w-full border-b border-border bg-transparent px-4 text-base text-fg outline-none placeholder:text-fg-subtle"
        />

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {!query.trim() && list.length > 0 && (
            <p className="px-2.5 pt-2 pb-1 text-[11px] text-fg-subtle">최근 글</p>
          )}

          {query.trim() && list.length === 0 && (
            <div className="px-2.5 py-6 text-center">
              <p className="text-[13px] text-fg-body">
                &lsquo;{query}&rsquo;에 대한 결과가 없어요
              </p>
              <p className="mt-1 text-[12px] text-fg-subtle">
                제목·태그·요약을 찾습니다. 초성으로도 검색됩니다.
              </p>
            </div>
          )}

          {list.map((doc, i) => (
            <button
              key={doc.slug}
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => go(doc.slug)}
              className={[
                'flex h-14 w-full items-center gap-3 rounded-lg px-2.5 text-left',
                i === index ? 'bg-bg-hover' : '',
              ].join(' ')}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: CATEGORY_META[doc.category]?.color ?? 'var(--fg-subtle)' }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-fg">
                  <Marked text={doc.title} query={query} />
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-fg-subtle">
                  {doc.category} · {formatDate(doc.date)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
