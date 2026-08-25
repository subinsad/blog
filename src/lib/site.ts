export const site = {
  name: 'subbi.log',
  title: 'subbi.log',
  description: '프론트엔드와 그 언저리를 기록합니다.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blog.subbi.dev',
  author: 'subbi',
  github: 'https://github.com/subinsad',
} as const

export const CATEGORY_META = {
  Frontend: { slug: 'frontend', color: 'var(--c-frontend)' },
  Backend: { slug: 'backend', color: 'var(--c-backend)' },
  DevOps: { slug: 'devops', color: 'var(--c-devops)' },
  'CS · 기초': { slug: 'cs', color: 'var(--c-cs)' },
  '회고 · 생각': { slug: 'retro', color: 'var(--c-retro)' },
} as const

export type Category = keyof typeof CATEGORY_META
export const CATEGORIES = Object.keys(CATEGORY_META) as Category[]

export const categoryBySlug = (slug: string): Category | undefined =>
  CATEGORIES.find((c) => CATEGORY_META[c].slug === slug)
