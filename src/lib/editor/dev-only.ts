import { notFound } from 'next/navigation'

/**
 * 에디터가 프로덕션에 유출되면 누구나 글을 쓸 수 있다. (DESIGN.md §13.2)
 * 라우트와 API 양쪽 진입점에서 막는다.
 */
export const IS_DEV = process.env.NODE_ENV === 'development'

export function devOnlyPage() {
  if (!IS_DEV) notFound()
}

export function devOnlyApi(): Response | null {
  if (!IS_DEV) return new Response('Not Found', { status: 404 })
  return null
}
