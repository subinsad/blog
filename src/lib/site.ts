/**
 * 사이트 정본 주소. sitemap·RSS·OG 태그가 전부 이걸 쓴다.
 *
 * Vercel이 VERCEL_PROJECT_PRODUCTION_URL 로 프로덕션 도메인을 넣어주고,
 * 커스텀 도메인을 붙이면 그 값이 자동으로 바뀐다. 그래서 보통은 아무것도
 * 설정할 필요가 없다. SITE_URL 은 그걸 덮어쓰고 싶을 때만 쓴다.
 *
 * NEXT_PUBLIC_ 접두사를 쓰지 않는다. 이 값은 서버에서만 필요한데,
 * 접두사를 붙이면 클라이언트 번들에 박히고 Vercel도 비밀값으로 저장하지 못한다.
 * (클라이언트 컴포넌트에서 site.url 을 읽으면 아래 fallback 이 나온다)
 */
function resolveSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'http://localhost:3000'
}

import { CATEGORY_DEFS, CSS_VAR } from '@/config/categories'

export const site = {
  name: 'subbi.log',
  title: 'subbi.log',
  description: '프론트엔드와 그 언저리를 기록합니다.',
  url: resolveSiteUrl(),
  author: 'subbi',
  github: 'https://github.com/subinsad',
} as const

export const CATEGORY_META = Object.fromEntries(
  CATEGORY_DEFS.map((c) => [c.name, { slug: c.slug, color: `var(${CSS_VAR(c.slug)})` }]),
) as Record<string, { slug: string; color: string }>

export type Category = (typeof CATEGORY_DEFS)[number]['name']
export const CATEGORIES = CATEGORY_DEFS.map((c) => c.name) as Category[]

export const categoryBySlug = (slug: string): Category | undefined =>
  CATEGORIES.find((c) => CATEGORY_META[c].slug === slug)
