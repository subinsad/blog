/** 워킹트리가 깨끗하면 아무것도 띄우지 않는다. 상시 "깨끗함"은 소음이다. */
export function GitChip({ dirtyCount }: { dirtyCount: number }) {
  if (dirtyCount === 0) return null
  return (
    <span
      title="커밋되지 않은 변경이 있습니다. 되돌리기 전에 확인하세요."
      className="inline-flex h-6 items-center gap-1.5 rounded-full bg-bg-subtle px-2.5 text-xs text-fg-muted"
    >
      <span className="size-1.5 rounded-full bg-[var(--m-orange)]" />
      커밋되지 않은 변경 {dirtyCount}개
    </span>
  )
}
