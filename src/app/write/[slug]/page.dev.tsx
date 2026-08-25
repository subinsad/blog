import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { devOnlyPage } from '@/lib/editor/dev-only'
import { posts, seriesList } from '@/lib/content'
import { splitMdx, type Draft } from '@/lib/editor/frontmatter'
import { PostEditor } from '@/components/editor/PostEditor'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Category } from '@/lib/site'

export const metadata: Metadata = { title: '글 수정' }

export default async function EditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  devOnlyPage()
  const { slug } = await params
  const post = posts.find((p) => p.slug === slug)
  if (!post) notFound()

  const year = post.date.slice(0, 4)
  const file = resolve(process.cwd(), 'content', 'posts', year, slug, 'index.mdx')
  let body = ''
  try {
    body = splitMdx(await readFile(file, 'utf8')).body
  } catch {
    body = ''
  }

  const initial: Draft = {
    title: post.title,
    date: post.date,
    category: post.category as Category,
    tags: post.tags,
    series: post.series ?? '',
    seriesOrder: post.seriesOrder ?? null,
    summary: post.summary,
    draft: post.draft,
    slug: post.slug,
    body: '',
  }

  return (
    <PostEditor
      initial={initial}
      initialBody={body}
      seriesOptions={seriesList.map((s) => ({ id: s.id, title: s.title }))}
    />
  )
}
