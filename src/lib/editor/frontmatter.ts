import { CATEGORIES, type Category } from '@/lib/site'

export type Draft = {
  title: string
  date: string
  category: Category
  tags: string[]
  series: string
  seriesOrder: number | null
  summary: string
  draft: boolean
  slug: string
  body: string
}

const yamlString = (s: string) => {
  // 콜론·따옴표·선행 특수문자가 있으면 인용한다
  if (/^[\s>|&*!%@`]|[:#]\s|["']/.test(s) || s === '') return JSON.stringify(s)
  return s
}

export function buildMdx(d: Draft): string {
  const lines = [
    '---',
    `title: ${yamlString(d.title || '제목 없음')}`,
    `date: ${d.date}`,
    `category: ${yamlString(d.category)}`,
    `tags: [${d.tags.map(yamlString).join(', ')}]`,
  ]
  if (d.series) {
    lines.push(`series: ${yamlString(d.series)}`)
    lines.push(`seriesOrder: ${d.seriesOrder ?? 1}`)
  }
  lines.push(`summary: ${yamlString(d.summary || '한 줄 요약을 적어주세요.')}`)
  lines.push(`draft: ${d.draft}`)
  lines.push('---', '', d.body, '')
  return lines.join('\n')
}

/** 아주 단순한 frontmatter 분리기. velite가 정본이므로 여기서는 편집용으로만 쓴다. */
export function splitMdx(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { frontmatter: '', body: raw }
  return { frontmatter: m[1], body: m[2].trimStart() }
}

export const isCategory = (v: unknown): v is Category =>
  typeof v === 'string' && (CATEGORIES as string[]).includes(v)

/**
 * 제목 → slug. 한글은 URL에서 지저분해지므로 라틴 문자만 남기고,
 * 남는 게 없으면 한글을 그대로 쓴다(적어도 사람이 읽을 수 있다).
 */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const ascii = base.replace(/[가-힣]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return ascii.length >= 3 ? ascii : base
}

/**
 * 새 글의 초기값. 'use client' 모듈에 두면 서버 컴포넌트에서 호출할 수 없다
 * (Next는 클라이언트 모듈의 export를 서버에서 실행하지 못하게 막는다).
 */
export const emptyDraft = (): Draft => ({
  title: '',
  date: new Date().toISOString().slice(0, 10),
  category: CATEGORIES[0],
  tags: [],
  series: '',
  seriesOrder: null,
  summary: '',
  draft: true,
  slug: '',
  body: '',
})
