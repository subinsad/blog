'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { giscus, isGiscusConfigured } from '@/config/comments'

const ORIGIN = 'https://giscus.app'
const themeOf = (t: string | undefined) => (t === 'dark' ? 'dark_dimmed' : 'light')

/**
 * giscus 댓글.
 *
 * 무거운 iframe 이라 화면에 들어올 때 붙인다. 글 맨 아래에 있으므로
 * 대부분의 방문자는 아예 받지 않는다.
 */
export function Comments() {
  const { resolvedTheme } = useTheme()
  const holder = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = holder.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible || !holder.current || holder.current.querySelector('script')) return

    const s = document.createElement('script')
    s.src = `${ORIGIN}/client.js`
    s.async = true
    s.crossOrigin = 'anonymous'
    s.setAttribute('data-repo', giscus.repo)
    s.setAttribute('data-repo-id', giscus.repoId)
    s.setAttribute('data-category', giscus.category)
    s.setAttribute('data-category-id', giscus.categoryId)
    // 글 하나당 스레드 하나. pathname 으로 묶으면 주소가 바뀔 때 댓글이 끊긴다.
    s.setAttribute('data-mapping', 'pathname')
    s.setAttribute('data-strict', '1')
    s.setAttribute('data-reactions-enabled', '1')
    s.setAttribute('data-emit-metadata', '0')
    s.setAttribute('data-input-position', 'top')
    s.setAttribute('data-theme', themeOf(resolvedTheme))
    s.setAttribute('data-lang', 'ko')
    s.setAttribute('data-loading', 'lazy')
    holder.current.appendChild(s)
    // resolvedTheme 은 아래 이펙트가 따라간다. 여기서는 최초 값만 쓴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  /** 테마 토글은 iframe 을 다시 만들지 않고 메시지로 알린다. */
  useEffect(() => {
    const frame = holder.current?.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
    frame?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: themeOf(resolvedTheme) } } },
      ORIGIN,
    )
  }, [resolvedTheme])

  if (!isGiscusConfigured()) {
    if (process.env.NODE_ENV !== 'development') return null
    return (
      <section className="mt-16 rounded-xl border border-border bg-bg-subtle px-4 py-3.5">
        <p className="text-[13px] text-fg-body">댓글이 설정되지 않았습니다.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
          <code className="font-mono">src/config/comments.ts</code> 에 giscus 값을 넣으세요.
          이 안내는 개발 모드에서만 보입니다.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-16 border-t border-border pt-8">
      <h2 className="mb-5 text-base font-bold text-fg">댓글</h2>
      <div ref={holder} className="min-h-[160px]" />
    </section>
  )
}
