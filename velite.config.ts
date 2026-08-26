import { defineConfig, defineCollection, s } from 'velite'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import remarkGfm from 'remark-gfm'

import { CATEGORY_DEFS, MAX_CATEGORIES } from './src/config/categories'

// 스키마가 단일 소스를 그대로 쓴다. 카테고리를 추가해도 여기는 안 고친다.
export const CATEGORIES = CATEGORY_DEFS.map((c) => c.name) as unknown as readonly [string, ...string[]]

if (CATEGORY_DEFS.length > MAX_CATEGORIES) {
  throw new Error(
    `카테고리는 ${MAX_CATEGORIES}개까지입니다. 지금 ${CATEGORY_DEFS.length}개 — 늘어나면 사이드바 탐색이 무너집니다.`,
  )
}

const posts = defineCollection({
  name: 'Post',
  pattern: 'posts/**/index.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      date: s.isodate(),
      updated: s.isodate().optional(),
      category: s.enum(CATEGORIES),
      tags: s.array(s.string()).default([]),
      series: s.string().optional(),
      seriesOrder: s.number().optional(),
      summary: s.string().max(200),
      thumbnail: s.image().optional(),
      draft: s.boolean().default(false),
      pinned: s.boolean().default(false),
      slug: s.path(),
      metadata: s.metadata(),
      toc: s.toc(),
      content: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      slug: data.slug.split('/').pop()!,
      permalink: `/posts/${data.slug.split('/').pop()}`,
    })),
})

const series = defineCollection({
  name: 'Series',
  pattern: 'series/*.yml',
  schema: s.object({
    id: s.string(),
    title: s.string(),
    description: s.string().optional(),
  }),
})

export default defineConfig({
  root: 'content',
  output: { data: '.velite', assets: 'public/static', base: '/static/', clean: true },
  collections: { posts, series },
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['heading-anchor'] } }],
      [
        rehypePrettyCode,
        {
          theme: { light: 'github-light', dark: 'github-dark-dimmed' },
          keepBackground: false,
        },
      ],
    ],
  },
})
