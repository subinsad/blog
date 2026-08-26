import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { postsByTag, tagCounts } from '@/lib/content'
import { toCardData } from '@/lib/view-model'
import { Shell } from '@/components/layout/Shell'
import { PostListSection } from '@/components/post/PostListSection'

export const dynamicParams = false

export function generateStaticParams() {
  return tagCounts().map(([tag]) => ({ tag }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const { tag } = await params
  return { title: `#${decodeURIComponent(tag)}` }
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>
}) {
  const { tag } = await params
  const name = decodeURIComponent(tag)
  const list = postsByTag(name)
  if (list.length === 0) notFound()

  return (
    <Shell>
      <PostListSection title={`#${name}`} posts={list.map(toCardData)} />
    </Shell>
  )
}
