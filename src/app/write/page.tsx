import type { Metadata } from 'next'
import { seriesList } from '@/lib/content'
import { loadPosts } from '@/lib/admin/posts'
import { tagCounts } from '@/lib/admin/findings'
import { PostEditor } from '@/components/editor/PostEditor'
import { emptyDraft } from '@/lib/editor/frontmatter'

export const metadata: Metadata = { title: '글쓰기' }

/**
 * 보호 화면은 정적 산출물에 남기지 않는다.
 * 미들웨어가 접근을 막긴 하지만, "보호 화면은 빌드 결과에 없다"는 규칙을
 * 단순하게 유지해야 CI로 검사할 수 있다.
 */
export const dynamic = 'force-dynamic'

export default async function WritePage() {
  // 기존 태그를 넘겨 자동완성에 쓴다. 자유 텍스트 입력이 태그가 잘게
  // 쪼개지는 원인이라, 새로 만들기보다 기존 걸 고르게 유도한다.
  const knownTags = tagCounts(await loadPosts()).map(([name, count]) => ({ name, count }))

  return (
    <PostEditor
      initial={emptyDraft()}
      initialBody=""
      seriesOptions={seriesList.map((s) => ({ id: s.id, title: s.title }))}
      knownTags={knownTags}
    />
  )
}
