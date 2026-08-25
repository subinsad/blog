import { CATEGORY_META, type Category } from '@/lib/site'

export function CategoryBadge({ category }: { category: Category }) {
  const color = CATEGORY_META[category].color
  return (
    <span
      className="inline-flex h-5 items-center rounded px-2 text-xs font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {category}
    </span>
  )
}

export function Tag({ name }: { name: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-bg-subtle px-2.5 text-[13px] text-fg-muted">
      #{name}
    </span>
  )
}
