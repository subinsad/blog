import type { Editor, Range } from '@tiptap/core'


export type SlashItem = {
  group: '기본' | '삽입' | '커스텀'
  title: string
  icon: string
  hint?: string
  run: (editor: Editor, range: Range) => void
}

const CHO = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
]

/** 초성 추출 — 검색 팔레트(§4.8)와 같은 규칙을 슬래시 메뉴에서도 쓴다. */
export const toCho = (s: string) =>
  [...s]
    .map((ch) => {
      const i = ch.charCodeAt(0) - 0xac00
      return i >= 0 && i < 11172 ? CHO[Math.floor(i / 588)] : ch
    })
    .join('')

export const SLASH_ITEMS: SlashItem[] = [
  { group: '기본', title: '텍스트', icon: 'T',
    run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { group: '기본', title: '제목 1', icon: 'H1', hint: '#',
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 1 }).run() },
  { group: '기본', title: '제목 2', icon: 'H2', hint: '##',
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 2 }).run() },
  { group: '기본', title: '제목 3', icon: 'H3', hint: '###',
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 3 }).run() },
  { group: '기본', title: '불릿 목록', icon: '•', hint: '-',
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { group: '기본', title: '번호 목록', icon: '1.', hint: '1.',
    run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { group: '기본', title: '인용', icon: '"', hint: '>',
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { group: '기본', title: '구분선', icon: '—', hint: '---',
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { group: '삽입', title: '코드 블록', icon: '</>', hint: '```',
    run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { group: '커스텀', title: '작은 글씨', icon: 'Aa',
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setParagraph().updateAttributes('paragraph', { caption: true }).run() },
]

export const filterSlashItems = (query: string) => {
  const q = query.trim()
  if (!q) return SLASH_ITEMS
  const lower = q.toLowerCase()
  const cho = toCho(q)
  return SLASH_ITEMS.filter(
    (i) =>
      i.title.toLowerCase().includes(lower) ||
      toCho(i.title).includes(cho) ||
      toCho(i.title).includes(q),
  )
}
