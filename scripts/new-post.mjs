#!/usr/bin/env node
/**
 * pnpm new:post "글 제목"
 * 폴더 · frontmatter · 날짜를 만들어준다. 글쓰기 마찰을 줄이는 게 목적.
 */
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const CATEGORIES = ['Frontend', 'Backend', 'DevOps', 'CS · 기초', '회고 · 생각']

const title = process.argv.slice(2).join(' ').trim()
if (!title) {
  console.error('사용법: pnpm new:post "글 제목"')
  process.exit(1)
}

/** 한글은 그대로 두면 URL이 지저분해지므로 제거하고, 남는 게 없으면 날짜로 대체한다. */
const slugify = (s) => {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const ascii = base.replace(/[가-힣]/g, '').replace(/^-|-$/g, '').replace(/-+/g, '-')
  return ascii.length >= 3 ? ascii : base
}

const now = new Date()
const iso = now.toISOString().slice(0, 10)
const year = iso.slice(0, 4)
let slug = slugify(title) || `post-${iso}`

const dir = join('content', 'posts', year, slug)
try {
  await access(dir)
  slug = `${slug}-${Date.now().toString(36).slice(-4)}`
} catch {}

const finalDir = join('content', 'posts', year, slug)
await mkdir(finalDir, { recursive: true })

const frontmatter = `---
title: ${title}
date: ${iso}
category: ${CATEGORIES[0]}
tags: []
summary: 한 줄 요약을 적어주세요. 카드·목록·OG·RSS에 함께 쓰입니다.
draft: true
---

여기서부터 씁니다.
`

const file = join(finalDir, 'index.mdx')
await writeFile(file, frontmatter, 'utf8')

console.log(`\n  ${file}\n`)
console.log(`  카테고리: ${CATEGORIES.join(' | ')}`)
console.log(`  draft: true 상태입니다. 발행할 때 false로 바꾸세요.\n`)
