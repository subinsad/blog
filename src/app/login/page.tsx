import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_NAME, missingAuthConfig } from '@/lib/auth/config'
import { verifySession } from '@/lib/auth/session'
import { site } from '@/lib/site'

export const metadata: Metadata = { title: '로그인', robots: { index: false } }

const MESSAGE: Record<string, string> = {
  config: '인증 설정이 완료되지 않았습니다.',
  state: '요청이 만료되었거나 위조되었습니다. 다시 시도해 주세요.',
  exchange: 'GitHub 토큰 교환에 실패했습니다.',
  user: 'GitHub 계정 정보를 가져오지 못했습니다.',
  forbidden: '이 블로그의 소유자 계정이 아닙니다.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  const jar = await cookies()
  if (await verifySession(jar.get(COOKIE_NAME)?.value)) redirect(next ?? '/admin')

  const missing = missingAuthConfig()
  const target = next?.startsWith('/') ? next : '/admin'

  return (
    <main className="mx-auto grid min-h-dvh max-w-[420px] place-items-center px-6">
      <div className="w-full">
        <Link href="/" className="font-mono text-[17px] font-medium tracking-[-0.02em] text-fg">
          subbi<span className="text-accent">.log</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-[-0.015em] text-fg">
          소유자만 들어올 수 있습니다
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
          글쓰기와 관리 화면은 {site.name} 소유자의 GitHub 계정으로만 열립니다.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border-l-[3px] border-[var(--m-red)] bg-[color-mix(in_srgb,var(--m-red)_7%,transparent)] px-4 py-3 text-[13px] text-fg-body"
          >
            {MESSAGE[error] ?? '로그인에 실패했습니다.'}
          </p>
        )}

        {missing.length > 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-bg-subtle px-4 py-3.5">
            <p className="text-[13px] text-fg-body">다음 환경변수가 설정되지 않았습니다.</p>
            <ul className="mt-2 space-y-1">
              {missing.map((m) => (
                <li key={m} className="font-mono text-[12px] text-fg-muted">
                  {m}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-fg-subtle">
              README의 &ldquo;인증 설정&rdquo; 절을 참고하세요.
            </p>
          </div>
        ) : (
          <a
            href={`/api/auth/login?next=${encodeURIComponent(target)}`}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-fg px-4 text-[15px] font-medium text-bg transition-opacity hover:opacity-90"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            GitHub으로 로그인
          </a>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">
          신원 확인에만 사용합니다. <code className="font-mono">read:user</code> 권한만
          요청하므로 이 로그인으로는 저장소를 수정할 수 없습니다.
        </p>
      </div>
    </main>
  )
}
