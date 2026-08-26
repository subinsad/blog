import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { site } from '@/lib/site'
import { categoryCss } from '@/config/categories'
import './fonts.css'
import './globals.css'

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'ko_KR',
    url: site.url,
  },
  alternates: { types: { 'application/rss+xml': `${site.url}/rss.xml` } },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={jetbrains.variable}
    >
      <head>
        {/*
          카테고리 색은 설정 파일에서 만들어 심는다. globals.css 에 하드코딩하면
          카테고리를 추가할 때마다 두 곳(라이트/다크)을 더 고쳐야 하고, 하나만
          빠뜨려도 조용히 어긋난다. 값은 6자리 hex 만 통과시킨다.
        */}
        <style dangerouslySetInnerHTML={{ __html: categoryCss() }} />
      </head>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <a
            href="#main"
            className="absolute left-4 top-[-9999px] z-[100] rounded-lg bg-accent px-3.5 py-2 text-sm text-white focus:top-3"
          >
            본문으로 건너뛰기
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
