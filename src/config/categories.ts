/**
 * 카테고리 단일 소스.
 *
 * 예전에는 이름이 velite.config.ts, site.ts, globals.css(라이트/다크)
 * 네 곳에 흩어져 있었다. 하나만 빠뜨려도 어긋나고, 그중 하나는 타입 체크도
 * 받지 않았다. 여기만 고치면 스키마·slug·색이 함께 따라온다.
 *
 * 색은 라이트/다크 쌍으로 둔다. 하나만 두면 다크 모드에서 대비가 깨진다.
 */
export type CategoryDef = {
  name: string
  /** URL 조각. 소문자 영숫자와 하이픈만. */
  slug: string
  light: string
  dark: string
}

export const CATEGORY_DEFS = [
  { name: 'Frontend', slug: 'frontend', light: '#1971c2', dark: '#74c0fc' },
  { name: 'Backend', slug: 'backend', light: '#2f9e44', dark: '#8ce99a' },
  { name: 'DevOps', slug: 'devops', light: '#e8590c', dark: '#ffc078' },
  { name: 'CS · 기초', slug: 'cs', light: '#6741d9', dark: '#b197fc' },
  { name: '회고 · 생각', slug: 'retro', light: '#c2255c', dark: '#faa2c1' },
] as const satisfies readonly CategoryDef[]

/**
 * 5~7개로 고정한다는 결정을 코드로 강제한다.
 * 늘어나기 시작하면 사이드바 탐색이 무너진다. (DESIGN.md §3)
 */
export const MAX_CATEGORIES = 7

export const CSS_VAR = (slug: string) => `--c-${slug}`

const HEX = /^#[0-9a-f]{6}$/i

/**
 * 카테고리 색을 CSS 변수로 만든다.
 * 루트 레이아웃이 이걸 <style> 로 심는다. 코드젠 단계를 두지 않으므로
 * 설정과 스타일이 어긋날 수 없다.
 */
export function categoryCss(defs: readonly CategoryDef[] = CATEGORY_DEFS): string {
  const safe = defs.filter((d) => HEX.test(d.light) && HEX.test(d.dark))
  const light = safe.map((d) => `${CSS_VAR(d.slug)}:${d.light}`).join(';')
  const dark = safe.map((d) => `${CSS_VAR(d.slug)}:${d.dark}`).join(';')
  return `:root{${light}}[data-theme="dark"]{${dark}}`
}
