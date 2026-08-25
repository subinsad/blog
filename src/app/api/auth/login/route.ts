import { cookies } from 'next/headers'
import { authorizeUrl } from '@/lib/auth/github'
import { isAuthConfigured } from '@/lib/auth/config'

export async function GET(req: Request) {
  if (!isAuthConfigured()) {
    return Response.redirect(new URL('/login?error=config', req.url), 302)
  }

  const url = new URL(req.url)
  const next = url.searchParams.get('next') ?? '/admin'
  const state = crypto.randomUUID()

  const jar = await cookies()
  // state는 CSRF 방지용. 콜백에서 쿠키의 값과 대조한다.
  jar.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  jar.set('oauth_next', next.startsWith('/') ? next : '/admin', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  return Response.redirect(
    authorizeUrl(state, `${url.origin}/api/auth/callback`),
    302,
  )
}
