import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Header } from '@/components/layout/Header'
import { site } from '@/lib/site'
import './globals.css'

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '45 920',
})

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
      className={`${pretendard.variable} ${jetbrains.variable}`}
    >
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <a
            href="#main"
            className="absolute left-4 top-[-9999px] z-[100] rounded-lg bg-accent px-3.5 py-2 text-sm text-white focus:top-3"
          >
            본문으로 건너뛰기
          </a>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
