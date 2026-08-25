'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PostCardData } from '@/lib/view-model'
import { PostViews, isViewMode, type ViewMode } from './PostViews'
import { ViewToggle } from './ViewToggle'

/**
 * 뷰 전환은 클라이언트에서만 읽는다. 서버 컴포넌트에서 searchParams를 읽으면
 * 목록 페이지가 전부 동적 렌더링으로 떨어진다. (빌드 결과 ƒ)
 * useSearchParams를 Suspense 안에서 쓰면 페이지는 정적으로 남는다.
 */
function Inner({
  title,
  posts,
  defaultView,
}: {
  title: string
  posts: PostCardData[]
  defaultView: ViewMode
}) {
  const params = useSearchParams()
  const raw = params.get('view')
  const view: ViewMode = isViewMode(raw) ? raw : defaultView

  return (
    <>
      <div className="mb-7 flex items-end justify-between border-b border-border pb-2.5">
        <h1 className="text-xl font-bold tracking-[-0.015em] text-fg">
          {title}
          <span className="ml-2 text-sm font-normal text-fg-muted tabular-nums">
            {posts.length}
          </span>
        </h1>
        <ViewToggle view={view} defaultView={defaultView} />
      </div>
      <div aria-live="polite">
        <PostViews posts={posts} view={view} />
      </div>
    </>
  )
}

export function PostListSection(props: {
  title: string
  posts: PostCardData[]
  defaultView?: ViewMode
}) {
  const defaultView = props.defaultView ?? 'card'
  return (
    <Suspense
      fallback={
        <>
          <div className="mb-7 flex items-end justify-between border-b border-border pb-2.5">
            <h1 className="text-xl font-bold tracking-[-0.015em] text-fg">{props.title}</h1>
            <div className="h-8" />
          </div>
          <PostViews posts={props.posts} view={defaultView} />
        </>
      }
    >
      <Inner title={props.title} posts={props.posts} defaultView={defaultView} />
    </Suspense>
  )
}
