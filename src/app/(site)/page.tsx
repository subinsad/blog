import { posts } from '@/lib/content'
import { toCardData } from '@/lib/view-model'
import { Shell } from '@/components/layout/Shell'
import { PostListSection } from '@/components/post/PostListSection'

export default function HomePage() {
  return (
    <Shell>
      <PostListSection title="전체 글" posts={posts.map(toCardData)} />
    </Shell>
  )
}
