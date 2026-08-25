import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth/config'
import { verifySession } from '@/lib/auth/session'

/**
 * /write 와 /admin, 그리고 그들의 API를 소유자 세션으로 막는다.
 *
 * 이 라우트들은 이제 프로덕션에도 존재한다. 예전에는 빌드에서 통째로
 * 빠져 있어서 인증 버그가 나도 아무 일이 없었지만, 지금은 이 검사가
 * 유일한 방어선이다. 실패는 항상 차단 쪽으로 떨어져야 한다.
 */
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(COOKIE_NAME)?.value)
  if (session) return NextResponse.next()

  const isApi = req.nextUrl.pathname.startsWith('/api/')
  if (isApi) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const login = new URL('/login', req.url)
  login.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/write/:path*', '/write', '/admin/:path*', '/admin', '/api/draft', '/api/admin'],
}
