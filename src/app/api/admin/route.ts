import { requireOwner, unauthorized } from '@/lib/auth/require'
import { buildPlan, applyPlan, type Operation } from '@/lib/admin/plan'
import { isCategory } from '@/lib/editor/frontmatter'
import { CATEGORY_DEFS, MAX_CATEGORIES } from '@/config/categories'
import { isSafeSlug } from '@/lib/slugify'

/** 클라이언트가 보낸 계획은 절대 신뢰하지 않는다. 작업 지시만 받고 계획은 서버가 다시 만든다. */
function parseOperation(v: unknown): Operation | null {
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>

  if (o.kind === 'tag.merge') {
    const from = Array.isArray(o.from) ? o.from.filter((x) => typeof x === 'string') : []
    if (from.length === 0 || typeof o.to !== 'string' || !o.to.trim()) return null
    return { kind: 'tag.merge', from, to: o.to.trim() }
  }
  if (o.kind === 'tag.delete') {
    if (typeof o.tag !== 'string' || !o.tag.trim()) return null
    return { kind: 'tag.delete', tag: o.tag.trim() }
  }
  if (o.kind === 'series.delete') {
    if (typeof o.id !== 'string' || !isSafeSlug(o.id)) return null
    return { kind: 'series.delete', id: o.id }
  }

  // 글 단위 벌크 작업. slugs 는 클라이언트가 보내지만, 실제로 어떤 파일을
  // 건드릴지는 서버가 계획을 다시 만들면서 결정한다.
  const slugs = Array.isArray(o.slugs) ? o.slugs.filter((x) => typeof x === 'string') : []
  if (slugs.length === 0) return null

  if (o.kind === 'post.addTag' || o.kind === 'post.removeTag') {
    if (typeof o.tag !== 'string' || !o.tag.trim()) return null
    return { kind: o.kind, slugs, tag: o.tag.trim() }
  }
  if (o.kind === 'post.setCategory') {
    if (!isCategory(o.category)) return null
    return { kind: 'post.setCategory', slugs, category: o.category }
  }
  if (o.kind === 'post.setPinned') {
    if (typeof o.pinned !== 'boolean') return null
    return { kind: 'post.setPinned', slugs, pinned: o.pinned }
  }
  if (o.kind === 'series.removePosts') {
    return { kind: 'series.removePosts', slugs }
  }
  if (o.kind === 'series.setOrder' || o.kind === 'series.addPosts') {
    if (typeof o.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(o.id)) return null
    return { kind: o.kind, id: o.id, slugs }
  }
  return null
}

/**
 * 시리즈 만들기·고치기. id 는 만들 때만 받고 이후에는 바꾸지 않는다 —
 * 각 글의 frontmatter 와 /series/<id> 주소에 이미 박혀 있기 때문이다.
 */
function parseSeriesMeta(
  o: Record<string, unknown>,
  kind: 'series.add' | 'series.edit',
): Operation | { error: string } {
  const id = typeof o.id === 'string' ? o.id.trim().toLowerCase() : ''
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const description = typeof o.description === 'string' ? o.description.trim() : ''

  if (!title) return { error: '제목을 입력하세요' }
  // 한 줄 스칼라로 쓴다. 줄바꿈이 들어오면 yml 이 깨진다.
  if (/[\r\n]/.test(title) || /[\r\n]/.test(description)) {
    return { error: '제목과 설명에는 줄바꿈을 넣을 수 없습니다' }
  }
  if (title.length > 80) return { error: '제목은 80자까지입니다' }
  if (description.length > 200) return { error: '설명은 200자까지입니다' }
  if (!isSafeSlug(id)) {
    return { error: 'id 는 영문 소문자·숫자·하이픈만 쓸 수 있습니다' }
  }
  return { kind, id, title, description }
}

const HEX = /^#[0-9a-f]{6}$/i
const RESERVED = ['posts', 'tags', 'series', 'write', 'admin', 'about', 'categories', 'login', 'api']

/** 카테고리 추가는 검증 항목이 많아 따로 뺀다. 폼에서도 같은 규칙을 먼저 걸러준다. */
function parseCategoryAdd(o: Record<string, unknown>): Operation | { error: string } {
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const slug = typeof o.slug === 'string' ? o.slug.trim().toLowerCase() : ''
  const light = typeof o.light === 'string' ? o.light.trim() : ''
  const dark = typeof o.dark === 'string' ? o.dark.trim() : ''

  if (!name) return { error: '이름을 입력하세요' }
  // YAML frontmatter 에 인용 없이 들어가는 값이라 특수문자를 막는다
  if (/[:#"'\[\]{}|>&*!%@`]|^\s|\s$/.test(name)) {
    return { error: '이름에 쓸 수 없는 문자가 있습니다 (: # 따옴표 등)' }
  }
  if (CATEGORY_DEFS.some((c) => c.name === name)) return { error: '이미 있는 이름입니다' }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return { error: 'slug 은 영문 소문자·숫자·하이픈만 쓸 수 있습니다' }
  }
  if (RESERVED.includes(slug)) return { error: `'${slug}' 는 예약된 주소입니다` }
  if (CATEGORY_DEFS.some((c) => c.slug === slug)) return { error: '이미 있는 slug 입니다' }
  if (!HEX.test(light) || !HEX.test(dark)) return { error: '색은 #rrggbb 형식이어야 합니다' }
  if (CATEGORY_DEFS.length >= MAX_CATEGORIES) {
    return { error: `카테고리는 ${MAX_CATEGORIES}개까지입니다` }
  }
  return { kind: 'category.add', name, slug, light, dark }
}

export async function POST(req: Request) {
  if (!(await requireOwner())) return unauthorized()

  let payload: { mode?: string; operation?: unknown }
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'JSON 파싱 실패' }, { status: 400 })
  }

  const body = payload.operation as Record<string, unknown> | undefined
  let op: Operation | null = null

  if (body?.kind === 'category.add') {
    const r = parseCategoryAdd(body)
    if ('error' in r) return Response.json({ error: r.error }, { status: 400 })
    op = r
  } else if (body?.kind === 'series.add' || body?.kind === 'series.edit') {
    const r = parseSeriesMeta(body, body.kind)
    if ('error' in r) return Response.json({ error: r.error }, { status: 400 })
    op = r
  } else {
    op = parseOperation(payload.operation)
  }
  if (!op) return Response.json({ error: '알 수 없는 작업입니다' }, { status: 400 })

  try {
    if (payload.mode === 'apply') {
      const { written, plan, commit } = await applyPlan(op)
      return Response.json({ ok: true, written, plan, commit })
    }
    const { plan } = await buildPlan(op)
    return Response.json({ ok: true, plan })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '작업 실패' },
      { status: 500 },
    )
  }
}
