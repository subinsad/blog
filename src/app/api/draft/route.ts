import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { writeFiles, usesGitHub, listPosts } from '@/lib/storage'
import { requireOwner, unauthorized } from '@/lib/auth/require'
import { buildMdx, isCategory, type Draft } from '@/lib/editor/frontmatter'
import { isSafeSlug } from '@/lib/slugify'

const CONTENT_ROOT = resolve(process.cwd(), 'content', 'posts')

/** slug가 경로를 벗어나지 못하게 막는다. 사용자 입력이 그대로 파일 경로가 되는 자리다. */
function safeDir(year: string, slug: string): string {
  if (!/^\d{4}$/.test(year)) throw new Error('연도 형식이 잘못되었습니다')
  // Next 16 은 비 ASCII slug 라우트를 매칭하지 못한다. 파일은 만들어지지만 404 가 된다.
  if (!isSafeSlug(slug)) {
    throw new Error('slug 에는 영문 소문자·숫자·하이픈만 쓸 수 있습니다')
  }
  const dir = resolve(CONTENT_ROOT, year, slug)
  if (dir !== CONTENT_ROOT && !dir.startsWith(CONTENT_ROOT + sep)) {
    throw new Error('허용되지 않은 경로입니다')
  }
  return dir
}

export async function POST(req: Request) {
  if (!(await requireOwner())) return unauthorized()

  let payload: Partial<Draft>
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'JSON 파싱 실패' }, { status: 400 })
  }

  const { title, date, category, slug, body } = payload
  if (typeof slug !== 'string' || !slug) {
    return Response.json({ error: 'slug이 필요합니다' }, { status: 400 })
  }
  if (!isCategory(category)) {
    return Response.json({ error: '알 수 없는 카테고리입니다' }, { status: 400 })
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: '날짜 형식은 YYYY-MM-DD 입니다' }, { status: 400 })
  }

  const draft: Draft = {
    title: title ?? '',
    date,
    category,
    tags: Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === 'string') : [],
    series: typeof payload.series === 'string' ? payload.series : '',
    seriesOrder: typeof payload.seriesOrder === 'number' ? payload.seriesOrder : null,
    summary: typeof payload.summary === 'string' ? payload.summary : '',
    draft: payload.draft !== false,
    slug,
    body: typeof body === 'string' ? body : '',
  }

  try {
    // slug 검증을 먼저 태운다. 경로 조합은 그 뒤에만 한다.
    const dir = safeDir(date.slice(0, 4), slug)
    const path = relative(process.cwd(), join(dir, 'index.mdx'))
    const message = draft.draft
      ? `draft: ${draft.title || slug}`
      : `post: ${draft.title || slug}`

    const { commit } = await writeFiles([{ path, content: buildMdx(draft) }], message)
    return Response.json({ ok: true, path, commit })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '저장 실패' },
      { status: 400 },
    )
  }
}

export async function GET(req: Request) {
  if (!(await requireOwner())) return unauthorized()

  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return Response.json({ error: 'slug이 필요합니다' }, { status: 400 })

  try {
    if (usesGitHub) {
      // 연도 폴더를 추측하지 않는다. 저장소 목록에서 slug로 찾는다.
      const hit = (await listPosts()).find((f) => f.slug === slug)
      if (!hit) return Response.json({ error: '글을 찾을 수 없습니다' }, { status: 404 })
      return Response.json({ ok: true, raw: hit.raw, year: hit.path.split('/')[2] ?? '' })
    }

    const years = await readdir(CONTENT_ROOT)
    for (const year of years) {
      try {
        const raw = await readFile(join(safeDir(year, slug), 'index.mdx'), 'utf8')
        return Response.json({ ok: true, raw, year })
      } catch {
        // 다음 연도 폴더에서 계속 찾는다
      }
    }
    return Response.json({ error: '글을 찾을 수 없습니다' }, { status: 404 })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '읽기 실패' },
      { status: 400 },
    )
  }
}
