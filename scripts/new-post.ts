/**
 * pnpm new:post "글 제목"
 * 폴더 · frontmatter · 날짜를 만들어준다. 글쓰기 마찰을 줄이는 게 목적.
 */
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { slugify } from '../src/lib/slugify'
import { CATEGORIES } from '../src/lib/site'

const title = process.argv.slice(2).join(' ').trim()
if (!title) {
  console.error('사용법: pnpm new:post "글 제목"')
  process.exit(1)
}

const iso = new Date().toISOString().slice(0, 10)
const year = iso.slice(0, 4)
let slug = slugify(title, iso)

try {
  await access(join('content', 'posts', year, slug))
  slug = `${slug}-${Date.now().toString(36).slice(-4)}`
} catch {
  // 없으면 그대로 쓴다
}

const dir = join('content', 'posts', year, slug)
await mkdir(dir, { recursive: true })

await writeFile(
  join(dir, 'index.mdx'),
  `---
title: ${title}
date: ${iso}
category: ${CATEGORIES[0]}
tags: []
summary: 한 줄 요약을 적어주세요. 카드·목록·OG·RSS에 함께 쓰입니다.
draft: true
---

여기서부터 씁니다.
`,
  'utf8',
)

console.log(`\n  ${join(dir, 'index.mdx')}\n`)
console.log(`  카테고리: ${CATEGORIES.join(' | ')}`)
console.log(`  draft: true 상태입니다. 발행할 때 false로 바꾸세요.\n`)
