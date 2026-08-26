import Link from 'next/link'
import { posts } from '@/lib/content'
import { toCardData } from '@/lib/view-model'
import { Shell } from '@/components/layout/Shell'
import { PostRow } from '@/components/post/PostRow'

/**
 * (site) 안에서 난 404. 헤더는 (site)/layout 이 이미 그리므로 여기서는 그리지 않는다.
 * 루트 not-found.tsx 가 헤더를 직접 그리기 때문에, 이 파일이 없으면 헤더가 두 번 나온다.
 */
export default function SiteNotFound() {
  return (
    <Shell>
      <div className="py-10">
        <p className="font-mono text-[64px] leading-none font-bold text-fg-subtle">404</p>
        <h1 className="mt-4 text-2xl font-bold text-fg">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-[15px] text-fg-muted">
          주소가 바뀌었거나 삭제된 글일 수 있습니다.{' '}
          <Link href="/" className="text-accent hover:text-accent-hover">
            홈으로 가기
          </Link>
        </p>
        <h2 className="mt-12 mb-1 text-base font-bold text-fg">최근 글</h2>
        <div className="border-t border-border">
          {posts.slice(0, 3).map(toCardData).map((p) => (
            <PostRow key={p.slug} post={p} compact />
          ))}
        </div>
      </div>
    </Shell>
  )
}
