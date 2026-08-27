import type { NextConfig } from 'next'
import { REDIRECTS } from './src/config/redirects'

const nextConfig: NextConfig = {
  // 이름·주소를 바꾼 흔적. 전부 308 이다 — 옛 주소는 다시 살아나지 않는다.
  async redirects() {
    return REDIRECTS.map((r) => ({ ...r, permanent: true }))
  },
}

export default nextConfig
