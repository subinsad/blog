import { defineConfig, defineCollection, s } from 'velite'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import remarkGfm from 'remark-gfm'

export const CATEGORIES = ['Frontend', 'Backend', 'DevOps', 'CS · 기초', '회고 · 생각'] as const

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
