import { requireOwner, unauthorized } from '@/lib/auth/require'
import { buildPlan, applyPlan, type Operation } from '@/lib/admin/plan'
import { isCategory } from '@/lib/editor/frontmatter'

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

export async function POST(req: Request) {
  if (!(await requireOwner())) return unauthorized()

  let payload: { mode?: string; operation?: unknown }
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'JSON 파싱 실패' }, { status: 400 })
  }

  const op = parseOperation(payload.operation)
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
