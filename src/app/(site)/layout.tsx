import { Header } from '@/components/layout/Header'

/**
 * 공개 블로그 화면만 이 레이아웃을 쓴다.
 * /admin 과 /write 는 자기 상단바를 갖고 있어서, 루트 레이아웃에 Header를 두면
 * 헤더가 두 개 겹친다.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  )
}
