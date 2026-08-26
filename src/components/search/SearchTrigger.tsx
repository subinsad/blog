'use client'

/**
 * 헤더의 검색 상자. 누르면 커맨드 팔레트를 연다.
 *
 * JS 가 없으면 그냥 /search 로 간다. 앵커를 유지하는 이유이기도 하다.
 */
export function SearchTrigger({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="/search"
      onClick={(e) => {
        e.preventDefault()
        window.dispatchEvent(new Event('subbi:search'))
      }}
      className="flex h-[34px] min-w-[200px] items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 text-[13px] text-fg-subtle transition-colors hover:border-border-strong max-[768px]:min-w-0"
    >
      {children}
    </a>
  )
}
