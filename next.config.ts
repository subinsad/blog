import type { NextConfig } from 'next'
import { REDIRECTS } from './src/config/redirects'

const nextConfig: NextConfig = {
  // 이름·주소를 바꾼 흔적. 기본은 308 이고, 다시 살아날 수 있는 주소만
  // permanent: false(307) 로 적혀 온다 — 근거는 src/config/redirects.ts 에 있다.
  async redirects() {
    return REDIRECTS.map((r) => ({ ...r, permanent: r.permanent ?? true }))
  },
}

export default nextConfig
