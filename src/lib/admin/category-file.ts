/**
 * src/config/categories.ts 의 CATEGORY_DEFS 배열을 줄 단위로 다룬다.
 *
 * 파일에서 직접 읽는다. 이 모듈이 import 한 CATEGORY_DEFS 는 배포된
 * 빌드의 값이라, 방금 저장하고 아직 재배포되지 않았으면 파일과 어긋난다.
 * 무엇을 고칠지는 항상 파일이 정한다.
 */

export type CategoryLine = {
  name: string
  slug: string
  light: string
  dark: string
  /** 파일에서 이 항목이 있는 줄 번호 */
  at: number
}

const LINE =
  /^\s*\{ name: (['"])(.*?)\1, slug: '([^']*)', light: '([^']*)', dark: '([^']*)' \},\s*$/

export const categoryLine = (c: Omit<CategoryLine, 'at'>) =>
  `  { name: ${JSON.stringify(c.name)}, slug: '${c.slug}', light: '${c.light}', dark: '${c.dark}' },`

export function parseCategories(raw: string): CategoryLine[] {
  const out: CategoryLine[] = []
  raw.split('\n').forEach((l, at) => {
    const m = l.match(LINE)
    if (m) out.push({ name: m[2], slug: m[3], light: m[4], dark: m[5], at })
  })
  return out
}

/** 한 줄을 갈아끼우거나(next), 지운다(null). */
export function spliceCategory(raw: string, at: number, next: string | null): string {
  const lines = raw.split('\n')
  if (next === null) lines.splice(at, 1)
  else lines.splice(at, 1, next)
  return lines.join('\n')
}
