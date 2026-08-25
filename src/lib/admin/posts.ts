import { listPosts } from '@/lib/storage'
import { readMeta, type PostMeta } from './scan'

/** 저장 위치(로컬 파일 / GitHub)에 상관없이 같은 모양을 돌려준다. */
export async function loadPosts(): Promise<PostMeta[]> {
  const files = await listPosts()
  return files
    .map(readMeta)
    .filter((x): x is PostMeta => x !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}
