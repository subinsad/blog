import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { editField, yamlList, type FieldName } from './frontmatter-edit'
import { REPO_ROOT, type PostMeta } from './scan'
import { loadPosts } from './posts'
import { writeFiles, usesGitHub } from '@/lib/storage'

const exec = promisify(execFile)

export type Change = {
  path: string
  slug: string
  title: string
  field: FieldName
  before: string
  after: string
  /** 실제로 쓸 파일 전체 내용. 클라이언트로 보내지 않는다. */
  nextRaw?: string
}

export type Skipped = { slug: string; title: string; reason: string }

export type Plan = {
  headline: string
  detail: string
  changes: Omit<Change, 'nextRaw'>[]
  skipped: Skipped[]
  /** 수정 대상 중 커밋되지 않은 변경이 있는 파일 */
  dirty: string[]
  /** 이 작업으로 죽는 공개 URL */
  deadUrls: string[]
}

export type Operation =
  | { kind: 'tag.merge'; from: string[]; to: string }
  | { kind: 'tag.delete'; tag: string }

/** 대상 파일들 중 워킹트리가 더러운 것. git이 undo인 도구에서 가장 중요한 경고다. */
async function dirtyFiles(paths: string[]): Promise<string[]> {
  // 프로덕션은 커밋으로 쓰므로 워킹트리 개념이 없다
  if (usesGitHub || paths.length === 0) return []
  try {
    const { stdout } = await exec('git', ['status', '--porcelain', '--', ...paths], {
      cwd: REPO_ROOT,
    })
    return stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => l.slice(3).trim())
  } catch {
    return []
  }
}

const tagUrl = (t: string) => `/tags/${encodeURIComponent(t)}`

function planTagMerge(posts: PostMeta[], from: string[], to: string) {
  const sources = from.filter((t) => t !== to)
  const changes: Change[] = []
  const skipped: Skipped[] = []

  for (const p of posts) {
    const hit = p.tags.filter((t) => sources.includes(t))
    if (hit.length === 0) continue

    const next = [...new Set(p.tags.map((t) => (sources.includes(t) ? to : t)))]
    const edit = editField(p.file.raw, 'tags', { next: `tags: ${yamlList(next)}` })
    if (!edit) {
      skipped.push({ slug: p.file.slug, title: p.title, reason: '이미 같은 값' })
      continue
    }
    changes.push({
      path: p.file.path,
      slug: p.file.slug,
      title: p.title,
      field: 'tags',
      before: edit.beforeLine,
      after: edit.afterLine,
      nextRaw: edit.next,
    })
  }

  // 대상 태그를 이미 갖고 있어 개수가 안 맞아 보이는 글을 명시한다
  for (const p of posts) {
    if (p.tags.includes(to) && !p.tags.some((t) => sources.includes(t))) {
      skipped.push({ slug: p.file.slug, title: p.title, reason: `이미 '${to}' 보유` })
    }
  }

  return { changes, skipped, sources }
}

function planTagDelete(posts: PostMeta[], tag: string) {
  const changes: Change[] = []
  for (const p of posts) {
    if (!p.tags.includes(tag)) continue
    const next = p.tags.filter((t) => t !== tag)
    const edit = editField(p.file.raw, 'tags', { next: `tags: ${yamlList(next)}` })
    if (!edit) continue
    changes.push({
      path: p.file.path,
      slug: p.file.slug,
      title: p.title,
      field: 'tags',
      before: edit.beforeLine,
      after: edit.afterLine,
      nextRaw: edit.next,
    })
  }
  return changes
}

/** 계획을 만든다. 파일은 건드리지 않는다. */
export async function buildPlan(op: Operation): Promise<{ plan: Plan; changes: Change[] }> {
  const posts = await loadPosts()

  let changes: Change[] = []
  let skipped: Skipped[] = []
  let headline = ''
  let deadUrls: string[] = []

  if (op.kind === 'tag.merge') {
    const r = planTagMerge(posts, op.from, op.to)
    changes = r.changes
    skipped = r.skipped
    deadUrls = r.sources.map(tagUrl)
    headline =
      r.sources.length === 1
        ? `'${r.sources[0]}' 태그를 '${op.to}' 로 바꿉니다`
        : `태그 ${r.sources.length}개를 '${op.to}' 로 합칩니다`
  } else {
    changes = planTagDelete(posts, op.tag)
    deadUrls = [tagUrl(op.tag)]
    headline = `'${op.tag}' 태그를 삭제합니다`
  }

  const dirty = await dirtyFiles(changes.map((c) => c.path))
  if (changes.length === 0) deadUrls = []

  const plan: Plan = {
    headline,
    detail:
      changes.length === 0
        ? '변경할 내용이 없습니다'
        : `프론트매터 tags 필드만 변경 · 파일 ${changes.length}개`,
    // nextRaw(파일 전체 내용)는 클라이언트로 보내지 않는다
    changes: changes.map((c) => ({
      path: c.path,
      slug: c.slug,
      title: c.title,
      field: c.field,
      before: c.before,
      after: c.after,
    })),
    skipped,
    dirty,
    deadUrls,
  }

  return { plan, changes }
}

/**
 * 계획을 실행한다. 클라이언트가 보낸 계획을 신뢰하지 않고 서버에서 다시 만든다.
 * 전부 메모리에서 만든 뒤 한 번에 쓰고, 실패하면 원본으로 되돌린다.
 */
export async function applyPlan(
  op: Operation,
): Promise<{ written: string[]; plan: Plan; commit?: { sha: string; url: string } }> {
  const { plan, changes } = await buildPlan(op)
  if (changes.length === 0) return { written: [], plan }

  const files = changes.map((c) => {
    if (!c.nextRaw) throw new Error(`대상 파일을 찾을 수 없습니다: ${c.path}`)
    return { path: c.path, content: c.nextRaw }
  })

  const { written, commit } = await writeFiles(files, plan.headline)
  return { written, plan, commit }
}
