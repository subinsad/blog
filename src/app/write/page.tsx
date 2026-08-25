import type { Metadata } from 'next'
import { seriesList } from '@/lib/content'
import { PostEditor } from '@/components/editor/PostEditor'
import { emptyDraft } from '@/lib/editor/frontmatter'

export const metadata: Metadata = { title: '글쓰기' }

/**
 * 보호 화면은 정적 산출물에 남기지 않는다.
 * 미들웨어가 접근을 막긴 하지만, "보호 화면은 빌드 결과에 없다"는 규칙을
 * 단순하게 유지해야 CI로 검사할 수 있다.
 */
export const dynamic = 'force-dynamic'

export default function WritePage() {
  return (
    <PostEditor
      initial={emptyDraft()}
      initialBody=""
      seriesOptions={seriesList.map((s) => ({ id: s.id, title: s.title }))}
    />
  )
}
