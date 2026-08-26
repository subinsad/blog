import { matches, toCho } from './hangul'

export type SearchDoc = {
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  date: string
}

export type SearchHit = { doc: SearchDoc; score: number }

/**
 * 제목·요약·태그·카테고리를 훑는다. 초성도 받는다.
 *
 * 점수는 "어디서 맞았는가"로 준다. 제목에 맞은 글이 요약에 맞은 글보다
 * 위에 와야 하고, 앞부분에 맞을수록 더 정확한 검색이다.
 */
export function searchPosts(docs: SearchDoc[], query: string, limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const cho = toCho(q)

  const hits: SearchHit[] = []
  for (const doc of docs) {
    const title = doc.title.toLowerCase()
    let score = 0

    if (title.startsWith(q)) score = 100
    else if (title.includes(q)) score = 80
    else if (toCho(doc.title).includes(cho)) score = 60
    else if (doc.tags.some((t) => matches(t, q))) score = 50
    else if (matches(doc.category, q)) score = 40
    else if (doc.summary.toLowerCase().includes(q)) score = 20

    if (score > 0) hits.push({ doc, score })
  }

  return hits
    .sort((a, b) => b.score - a.score || b.doc.date.localeCompare(a.doc.date))
    .slice(0, limit)
}

/** 맞은 구간을 알려준다. 없으면 null — 초성으로 맞은 경우가 그렇다. */
export function highlightRange(text: string, query: string): [number, number] | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const i = text.toLowerCase().indexOf(q)
  return i === -1 ? null : [i, i + q.length]
}
