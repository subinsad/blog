'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { OWNER_HINT_COOKIE } from '@/lib/auth/config'

/**
 * 글쓰기 버튼은 소유자에게만 보인다.
 *
 * 서버에서 쿠키를 읽으면 Header가 async가 되고, 그 순간 공개 페이지 전체가
 * 동적 렌더링으로 떨어진다. 그래서 진짜 세션(httpOnly)과 별개로,
 * **아무 권한도 없는 표시용 쿠키** 하나를 클라이언트에서 읽는다.
 * 이 쿠키를 위조해봐야 버튼만 보일 뿐, 접근은 미들웨어가 막는다.
 */
const readHint = () =>
  document.cookie.split('; ').some((c) => c === `${OWNER_HINT_COOKIE}=1`)

// 쿠키는 로그인·로그아웃 시에만 바뀌고 둘 다 페이지를 이동시킨다
const subscribe = () => () => {}

export function OwnerLink() {
  // 이펙트에서 setState 하는 대신 외부 상태를 그대로 구독한다.
  // 서버 스냅샷은 항상 false이므로 하이드레이션 불일치가 없다.
  const owner = useSyncExternalStore(subscribe, readHint, () => false)

  if (!owner) return null

  return (
    <Link
      href="/write"
      title="소유자만 보입니다"
      className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      <span className="max-[768px]:hidden">글쓰기</span>
    </Link>
  )
}
