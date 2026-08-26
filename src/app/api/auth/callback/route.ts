import { cookies } from 'next/headers'
import { exchangeCode, fetchUser } from '@/lib/auth/github'
import { authConfig } from '@/lib/auth/config'
import {
  makeSession,
  signSession,
  sessionCookie,
  hintCookie,
  returnCookie,
} from '@/lib/auth/session'

const fail = (req: Request, reason: string) =>
  Response.redirect(new URL(`/login?error=${reason}`, req.url), 302)

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const jar = await cookies()
  const expected = jar.get('oauth_state')?.value
  const next = jar.get('oauth_next')?.value ?? '/admin'
  jar.delete('oauth_state')
  jar.delete('oauth_next')

  if (!code || !state || !expected || state !== expected) return fail(req, 'state')

  const token = await exchangeCode(code, `${url.origin}/api/auth/callback`)
  if (!token) return fail(req, 'exchange')

  const user = await fetchUser(token)
  if (!user) return fail(req, 'user')

  // 사용자명이 아니라 숫자 ID로 대조한다
  if (String(user.id) !== authConfig.ownerId) return fail(req, 'forbidden')

  jar.set(sessionCookie(await signSession(makeSession(user))))
  jar.set(hintCookie(true))
  jar.set(returnCookie())

  return Response.redirect(new URL(next, req.url), 302)
}
