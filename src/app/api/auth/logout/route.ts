import { cookies } from 'next/headers'
import { sessionCookie, hintCookie } from '@/lib/auth/session'

export async function POST(req: Request) {
  const jar = await cookies()
  jar.set(sessionCookie('', 0))
  jar.set(hintCookie(false))
  return Response.redirect(new URL('/', req.url), 302)
}

export const GET = POST
