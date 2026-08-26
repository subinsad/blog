/**
 * 인증 설정.
 *
 * 신원 확인(OAuth)과 저장소 쓰기(PAT)를 분리한다.
 * OAuth 스코프는 read:user 만 요청하므로, 세션 쿠키가 새어도
 * 리포지토리를 건드릴 수 없다. 쓰기 토큰은 서버 환경변수에만 있다.
 */
export const authConfig = {
  clientId: process.env.GITHUB_CLIENT_ID ?? '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  /** 허용할 GitHub 계정의 숫자 ID. 사용자명은 바꿀 수 있고 남이 가져갈 수 있다. */
  ownerId: process.env.GITHUB_OWNER_ID ?? '',
  sessionSecret: process.env.AUTH_SECRET ?? '',
  /** 저장소 쓰기 전용 토큰 (contents: write). 클라이언트로 절대 나가지 않는다. */
  repoToken: process.env.GITHUB_REPO_TOKEN ?? '',
  repo: process.env.GITHUB_REPO ?? 'subinsad/blog',
  branch: process.env.GITHUB_BRANCH ?? 'main',
} as const

export const COOKIE_NAME = 'subbi_session'
/** 권한이 전혀 없는 UI 표시용 쿠키. 클라이언트가 읽을 수 있어야 하므로 httpOnly가 아니다. */
export const OWNER_HINT_COOKIE = 'subbi_owner'
/**
 * 세션 수명 30일.
 *
 * 12시간으로 뒀더니 하루만 지나도 헤더의 소유자 메뉴가 사라져서, 사라진
 * 걸 버그로 오해하게 된다. 혼자 자기 기기에서 쓰는 블로그이고 이 세션이
 * 주는 권한은 글 쓰기뿐이다(저장소 쓰기 토큰은 서버에만 있다).
 * 소유자 ID 를 바꾸면 기존 세션은 즉시 무효가 된다.
 */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

/** 어떤 설정이 비었는지 알려준다. 로그인 화면에서 그대로 보여주기 위한 것. */
export function missingAuthConfig(): string[] {
  const missing: string[] = []
  if (!authConfig.clientId) missing.push('GITHUB_CLIENT_ID')
  if (!authConfig.clientSecret) missing.push('GITHUB_CLIENT_SECRET')
  if (!authConfig.ownerId) missing.push('GITHUB_OWNER_ID')
  if (!authConfig.sessionSecret) missing.push('AUTH_SECRET')
  return missing
}

export const isAuthConfigured = () => missingAuthConfig().length === 0
