import type { Metadata } from 'next'
import { seriesList } from '@/lib/content'
import { PostEditor } from '@/components/editor/PostEditor'
import { emptyDraft } from '@/lib/editor/frontmatter'

export const metadata: Metadata = { title: '글쓰기' }

export default function WritePage() {
  return (
    <PostEditor
      initial={emptyDraft()}
      initialBody=""
      seriesOptions={seriesList.map((s) => ({ id: s.id, title: s.title }))}
    />
  )
}
