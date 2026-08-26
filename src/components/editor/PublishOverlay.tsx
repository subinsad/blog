'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * 발행 후 글 페이지로 넘어가기까지의 상태.
 *
 * 프로덕션에서 발행은 커밋을 만들고, Vercel 재빌드가 끝나야 글 페이지가
 * 생긴다. 바로 이동시키면 1~2분 동안 404가 뜬다. 그래서 페이지가 실제로
 * 응답할 때까지 확인한 뒤 넘어간다.
 */
const POLL_MS = 2500
const TIMEOUT_MS = 150_000

export function PublishOverlay({
  slug,
  commitUrl,
  onNavigate,
  onDismiss,
}: {
  slug: string
  commitUrl?: string
  onNavigate: () => void
  onDismiss: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let stop = false
    const started = Date.now()

    const tick = async () => {
      if (stop) return
      const ms = Date.now() - started
      setElapsed(Math.floor(ms / 1000))

      if (ms > TIMEOUT_MS) {
        setTimedOut(true)
        return
      }

      try {
        const res = await fetch(`/posts/${encodeURIComponent(slug)}`, {
          method: 'HEAD',
          cache: 'no-store',
        })
        if (!stop && res.ok) {
          onNavigate()
          return
        }
      } catch {
        // 재빌드 중에는 실패할 수 있다. 계속 기다린다.
      }
      if (!stop) setTimeout(tick, POLL_MS)
    }

    void tick()
    return () => {
      stop = true
    }
  }, [slug, onNavigate])

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] backdrop-blur-sm">
      <div className="w-full max-w-[380px] rounded-xl border border-border bg-bg-elevated p-6 text-center">
        <p className="text-[15px] font-medium text-fg">발행되었습니다</p>

        {timedOut ? (
          <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
            사이트 반영이 예상보다 오래 걸리고 있습니다. 커밋은 이미 올라갔으니
            잠시 뒤 다시 열어보세요.
          </p>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
            사이트에 반영되는 중입니다. 반영되면 글로 이동합니다.
            <span className="mt-1 block text-fg-subtle tabular-nums">{elapsed}초</span>
          </p>
        )}

        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="h-[34px] rounded-lg px-3.5 text-[13px] text-fg-muted hover:bg-bg-hover"
          >
            편집 계속
          </button>
          <Link
            href={`/posts/${slug}`}
            className="inline-flex h-[34px] items-center rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover"
          >
            지금 이동
          </Link>
        </div>

        {commitUrl && (
          <a
            href={commitUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-mono text-[11px] text-accent hover:underline"
          >
            커밋 보기
          </a>
        )}
      </div>
    </div>
  )
}
