/**
 * 색상은 토큰 이름으로만 받는다. 임의 hex을 허용하면 다크모드에서 대비가 깨진다.
 * (DESIGN.md §13.9)
 */
const MARK_COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink'] as const
export type MarkColor = (typeof MARK_COLORS)[number]

const isMarkColor = (v: string): v is MarkColor =>
  (MARK_COLORS as readonly string[]).includes(v)

export function Mark({
  c,
  bg,
  children,
}: {
  c?: string
  bg?: string
  children: React.ReactNode
}) {
  const name = c ?? bg
  if (!name) return <>{children}</>
  if (!isMarkColor(name)) {
    throw new Error(
      `<Mark>의 색상은 ${MARK_COLORS.join(' | ')} 중 하나여야 합니다. 받은 값: "${name}"`,
    )
  }
  const style = {
    '--mark-c': `var(--m-${name})`,
    ...(name === 'yellow' ? { '--mark-a': '26%' } : null),
  } as React.CSSProperties

  return (
    <span className={c ? 'mark-fg' : 'mark-bg'} style={style}>
      {children}
    </span>
  )
}
