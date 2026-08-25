import { cookies } from 'next/headers'
import { COOKIE_NAME } from './config'
import { verifySession, type Session } from './session'

/**
 * 미들웨어가 이미 막지만 API 핸들러에서 한 번 더 확인한다.
 * matcher를 잘못 고치는 순간 방어선이 통째로 사라지기 때문이다.
 */
export async function requireOwner(): Promise<Session | null> {
  const jar = await cookies()
  return verifySession(jar.get(COOKIE_NAME)?.value)
}

export const unauthorized = () =>
  Response.json({ error: '인증이 필요합니다' }, { status: 401 })
