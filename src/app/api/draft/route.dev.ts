import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { devOnlyApi } from '@/lib/editor/dev-only'
import { buildMdx, isCategory, type Draft } from '@/lib/editor/frontmatter'

const CONTENT_ROOT = resolve(process.cwd(), 'content', 'posts')

/** slug가 경로를 벗어나지 못하게 막는다. 사용자 입력이 그대로 파일 경로가 되는 자리다. */
function safeDir(year: string, slug: string): string {
  if (!/^\d{4}$/.test(year)) throw new Error('연도 형식이 잘못되었습니다')
  if (!/^[a-z0-9가-힣][a-z0-9가-힣-]*$/i.test(slug)) {
    throw new Error('slug에는 영문·숫자·한글·하이픈만 쓸 수 있습니다')
  }
  const dir = resolve(CONTENT_ROOT, year, slug)
  if (dir !== CONTENT_ROOT && !dir.startsWith(CONTENT_ROOT + sep)) {
    throw new Error('허용되지 않은 경로입니다')
  }
  return dir
}

export async function POST(req: Request) {
  const blocked = devOnlyApi()
  if (blocked) return blocked

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
    const dir = safeDir(date.slice(0, 4), slug)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.mdx'), buildMdx(draft), 'utf8')
    return Response.json({ ok: true, path: `content/posts/${date.slice(0, 4)}/${slug}/index.mdx` })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '저장 실패' },
      { status: 400 },
    )
  }
}

export async function GET(req: Request) {
  const blocked = devOnlyApi()
  if (blocked) return blocked

  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return Response.json({ error: 'slug이 필요합니다' }, { status: 400 })

  try {
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
