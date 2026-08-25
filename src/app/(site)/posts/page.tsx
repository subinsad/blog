import type { Metadata } from 'next'
import { posts } from '@/lib/content'
import { toCardData } from '@/lib/view-model'
import { Shell } from '@/components/layout/Shell'
import { PostListSection } from '@/components/post/PostListSection'

export const metadata: Metadata = { title: '전체 글' }

export default function PostsPage() {
  return (
    <Shell>
      <PostListSection title="전체 글" posts={posts.map(toCardData)} />
    </Shell>
  )
}
