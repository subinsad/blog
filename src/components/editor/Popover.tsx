'use client'

import { useEffect, useRef } from 'react'

export function Popover({
  anchor,
  onClose,
  children,
  width = 220,
}: {
  anchor: HTMLElement | null
  onClose: () => void
  children: React.ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  if (!anchor) return null
  const r = anchor.getBoundingClientRect()
  // 오른쪽 끝에서 열리면 잘리므로 뷰포트 안으로 당긴다
  const left = Math.min(r.left, document.documentElement.clientWidth - width - 16)

  return (
    <div
      ref={ref}
      style={{ left, top: r.bottom + 8, width }}
      className="fixed z-[80] rounded-xl border border-border bg-bg-elevated p-2"
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>
  )
}
