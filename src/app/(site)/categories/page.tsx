import type { Metadata } from 'next'
import { posts } from '@/lib/content'
import { toCardData } from '@/lib/view-model'
import { Shell } from '@/components/layout/Shell'
import { PostListSection } from '@/components/post/PostListSection'

export const metadata: Metadata = { title: '카테고리' }

/** 카테고리 인덱스는 카테고리 뷰가 기본값이다. */
export default function CategoriesPage() {
  return (
    <Shell>
      <PostListSection
        title="카테고리"
        posts={posts.map(toCardData)}
        defaultView="category"
      />
    </Shell>
  )
}
