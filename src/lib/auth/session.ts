import { COOKIE_NAME, OWNER_HINT_COOKIE, SESSION_MAX_AGE, authConfig } from './config'

/**
 * 세션은 HMAC 서명된 쿠키 하나다. DB도 세션 저장소도 두지 않는다.
 * 미들웨어(Edge 런타임)에서 검증해야 하므로 node:crypto 대신 Web Crypto를 쓴다.
 */
export type Session = {
  /** GitHub 숫자 계정 ID */
  id: string
  login: string
  avatar: string
  exp: number
}

const enc = new TextEncoder()

const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromB64url = (s: string) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function key() {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(authConfig.sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signSession(session: Session): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(session)))
  const sig = await crypto.subtle.sign('HMAC', await key(), enc.encode(payload))
  return `${payload}.${b64url(sig)}`
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token || !authConfig.sessionSecret) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  let ok = false
  try {
    ok = await crypto.subtle.verify(
      'HMAC',
      await key(),
      fromB64url(sig),
      enc.encode(payload),
    )
  } catch {
    return null
  }
  if (!ok) return null

  try {
    const session = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session
    if (session.exp < Date.now() / 1000) return null
    // 서명이 유효해도 소유자가 아니면 거부한다. 소유자 ID를 바꾸면 기존 세션이 즉시 무효가 된다.
    if (session.id !== authConfig.ownerId) return null
    return session
  } catch {
    return null
  }
}

export const sessionCookie = (value: string, maxAge = SESSION_MAX_AGE) => ({
  name: COOKIE_NAME,
  value,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
})

export const makeSession = (u: { id: number; login: string; avatar_url: string }): Session => ({
  id: String(u.id),
  login: u.login,
  avatar: u.avatar_url,
  exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
})

/** 권한 없는 표시용 쿠키. 버튼 노출 여부만 결정한다. */
export const hintCookie = (on: boolean) => ({
  name: OWNER_HINT_COOKIE,
  value: on ? '1' : '',
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: on ? SESSION_MAX_AGE : 0,
})
