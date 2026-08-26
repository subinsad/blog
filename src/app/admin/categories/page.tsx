import { loadPosts } from '@/lib/admin/posts'
import { CATEGORY_DEFS, MAX_CATEGORIES } from '@/config/categories'
import { CategoriesClient, type CategoryRow } from '@/components/admin/CategoriesClient'

export default async function AdminCategoriesPage() {
  const posts = await loadPosts()

  const rows: CategoryRow[] = CATEGORY_DEFS.map((c) => ({
    name: c.name,
    slug: c.slug,
    light: c.light,
    dark: c.dark,
    count: posts.filter((p) => p.category === c.name).length,
  }))

  return (
    <>
      <h1 className="text-xl font-bold tracking-[-0.015em] text-fg">카테고리</h1>
      <p className="mt-1.5 mb-6 text-[13px] leading-relaxed text-fg-muted">
        {MAX_CATEGORIES}개까지 둘 수 있습니다. 늘어나면 사이드바 탐색이 무너져서 상한을 코드로
        강제해 뒀습니다. 추가하면 <code className="font-mono">src/config/categories.ts</code> 한
        파일만 바뀌고 스키마·주소·색이 함께 따라옵니다.
      </p>
      <CategoriesClient rows={rows} />
    </>
  )
}
