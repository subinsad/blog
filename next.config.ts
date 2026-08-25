import type { NextConfig } from 'next'

/**
 * 에디터(/write, /api/draft)는 `.dev.tsx` / `.dev.ts` 확장자를 쓴다.
 * 개발 빌드에서만 pageExtensions에 포함되므로, 프로덕션 번들에는
 * 라우트도 클라이언트 청크도 아예 만들어지지 않는다. (DESIGN.md §13.2)
 * 404로 막는 것과 달리 코드 자체가 배포되지 않는다.
 */
const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  pageExtensions: isDev ? ['tsx', 'ts', 'dev.tsx', 'dev.ts'] : ['tsx', 'ts'],
}

export default nextConfig
