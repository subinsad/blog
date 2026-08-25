import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

export function Shell({
  children,
  active,
}: {
  children: React.ReactNode
  active?: string
}) {
  return (
    <div className="mx-auto grid max-w-[var(--container)] grid-cols-[var(--sb-w)_minmax(0,1fr)] gap-[var(--sb-gap)] px-[var(--gutter)] max-[1024px]:grid-cols-[minmax(0,1fr)] max-[1024px]:gap-0">
      <Sidebar active={active} />
      <main id="main" className="pt-6 pb-24">
        {children}
        <Footer />
      </main>
    </div>
  )
}
