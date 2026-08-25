/**
 * 색상은 토큰 이름으로만 받는다. 임의 hex을 허용하면 다크모드에서 대비가 깨진다.
 * (DESIGN.md §13.9)
 */
export const MARK_COLORS = [
  'gray', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink',
] as const
export type MarkColor = (typeof MARK_COLORS)[number]

export const MARK_LABEL: Record<MarkColor, string> = {
  gray: '회색', red: '빨강', orange: '주황', yellow: '노랑',
  green: '초록', blue: '파랑', violet: '보라', pink: '분홍',
}

export const isMarkColor = (v: unknown): v is MarkColor =>
  typeof v === 'string' && (MARK_COLORS as readonly string[]).includes(v)

/** 노랑은 20%로는 눈에 띄지 않아 26%를 쓴다. */
export const markAlpha = (c: MarkColor) => (c === 'yellow' ? '26%' : '20%')
