import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { postsByCategory } from '@/lib/content'
import { toCardData } from '@/lib/view-model'
import { CATEGORIES, CATEGORY_META, categoryBySlug } from '@/lib/site'
import { Shell } from '@/components/layout/Shell'
import { PostListSection } from '@/components/post/PostListSection'

export const dynamicParams = false

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: CATEGORY_META[c].slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return { title: categoryBySlug(slug) ?? '카테고리' }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = categoryBySlug(slug)
  if (!category) notFound()

  return (
    <Shell active={slug}>
      <PostListSection
        title={category}
        posts={postsByCategory(category).map(toCardData)}
      />
    </Shell>
  )
}
