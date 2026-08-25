import { authConfig } from './config'

export type GitHubUser = { id: number; login: string; avatar_url: string }

export function authorizeUrl(state: string, redirectUri: string) {
  const u = new URL('https://github.com/login/oauth/authorize')
  u.searchParams.set('client_id', authConfig.clientId)
  u.searchParams.set('redirect_uri', redirectUri)
  // 신원 확인만 필요하다. repo 스코프를 요청하지 않으므로
  // 이 토큰으로는 저장소를 건드릴 수 없다.
  u.searchParams.set('scope', 'read:user')
  u.searchParams.set('state', state)
  u.searchParams.set('allow_signup', 'false')
  return u.toString()
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string | null> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as { access_token?: string }
  return json.access_token ?? null
}

export async function fetchUser(token: string): Promise<GitHubUser | null> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) return null
  return (await res.json()) as GitHubUser
}
