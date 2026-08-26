import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { editField, yamlList, yamlScalar, type AnyField, type FieldName } from './frontmatter-edit'
import { buildSeriesYml, editSeriesYml, seriesPath, seriesUrl } from './series-file'
import { REPO_ROOT, type PostMeta } from './scan'
import { loadPosts } from './posts'
import { writeFiles, usesGitHub, readRepoFile } from '@/lib/storage'

const exec = promisify(execFile)

export type Change = {
  path: string
  slug: string
  title: string
  /** 바뀐 필드. 여러 개면 ' · ' 로 잇는다. */
  field: string
  before: string
  after: string
  /** 파일에 무엇을 하는지. 되돌리는 명령이 달라진다. */
  op?: 'create' | 'update' | 'delete'
  /** 실제로 쓸 파일 전체 내용. 클라이언트로 보내지 않는다. */
  nextRaw?: string
}

export type Skipped = { slug: string; title: string; reason: string }

export type Plan = {
  headline: string
  detail: string
  /** 글이 아니라 설정 파일이 바뀌는 경우 */
  config?: { path: string; before: string; after: string }
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
  | { kind: 'post.addTag'; slugs: string[]; tag: string }
  | { kind: 'post.removeTag'; slugs: string[]; tag: string }
  | { kind: 'post.setCategory'; slugs: string[]; category: string }
  | { kind: 'post.setPinned'; slugs: string[]; pinned: boolean }
  | { kind: 'series.setOrder'; id: string; slugs: string[] }
  | { kind: 'series.addPosts'; id: string; slugs: string[] }
  | { kind: 'series.removePosts'; slugs: string[] }
  | { kind: 'series.add'; id: string; title: string; description: string }
  | { kind: 'series.edit'; id: string; title: string; description: string }
  | { kind: 'series.delete'; id: string }
  | { kind: 'category.add'; name: string; slug: string; light: string; dark: string }

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

type BulkResult = { changes: Change[]; skipped: Skipped[] }

/** null 이면 그 필드를 삭제한다. after 는 새로 넣을 때 어느 필드 뒤에 둘지. */
type FieldEdit = { field: FieldName; line: string | null; after?: AnyField[] }
type BulkStep = { edits: FieldEdit[] } | { skip: string } | null

/**
 * 선택한 글들에 같은 변경을 적용한다.
 *
 * 한 글에 여러 필드를 바꿀 수 있어야 한다(시리즈에 넣으면 series 와
 * seriesOrder 가 함께 바뀐다). 각 편집을 앞선 결과 위에 이어서 적용하지
 * 않으면 마지막 것만 남는다.
 */
function planBulk(
  posts: PostMeta[],
  slugs: string[],
  apply: (p: PostMeta) => BulkStep,
): BulkResult {
  const changes: Change[] = []
  const skipped: Skipped[] = []

  for (const p of posts) {
    if (!slugs.includes(p.file.slug)) continue

    const step = apply(p)
    if (step === null) continue
    if ('skip' in step) {
      skipped.push({ slug: p.file.slug, title: p.title, reason: step.skip })
      continue
    }

    let raw = p.file.raw
    const fields: string[] = []
    const before: string[] = []
    const after: string[] = []

    for (const e of step.edits) {
      const edit = editField(raw, e.field, { next: e.line }, e.after)
      if (!edit) continue
      raw = edit.next
      fields.push(e.field)
      before.push(edit.beforeLine || `(${e.field} 없음)`)
      after.push(edit.afterLine || `(${e.field} 삭제)`)
    }

    if (fields.length === 0) {
      skipped.push({ slug: p.file.slug, title: p.title, reason: '이미 같은 값' })
      continue
    }

    changes.push({
      path: p.file.path,
      slug: p.file.slug,
      title: p.title,
      field: fields.join(' · '),
      before: before.join('\n'),
      after: after.join('\n'),
      nextRaw: raw,
    })
  }
  return { changes, skipped }
}

/**
 * 카테고리 추가는 글이 아니라 설정 파일 하나를 고친다.
 * 배열 리터럴 마지막 항목 뒤에 한 줄을 끼워 넣는다.
 */
async function planCategoryAdd(op: {
  name: string
  slug: string
  light: string
  dark: string
}): Promise<{ changes: Change[]; headline: string }> {
  const path = 'src/config/categories.ts'
  const raw = await readRepoFile(path)
  if (raw === null) throw new Error(`${path} 를 읽지 못했습니다`)

  const anchor = '] as const satisfies'
  const at = raw.indexOf(anchor)
  if (at === -1) throw new Error(`${path} 형태가 예상과 다릅니다`)

  const line = `  { name: ${JSON.stringify(op.name)}, slug: '${op.slug}', light: '${op.light}', dark: '${op.dark}' },`
  const next = raw.slice(0, at) + line + '\n' + raw.slice(at)

  return {
    changes: [
      {
        path,
        slug: op.slug,
        title: op.name,
        field: 'CATEGORY_DEFS',
        before: '(없음)',
        after: line.trim(),
        nextRaw: next,
      },
    ],
    headline: `'${op.name}' 카테고리를 추가합니다`,
  }
}

/**
 * 시리즈 만들기·고치기·지우기. 대상은 content/series/<id>.yml 파일 하나다.
 *
 * id 는 URL 이자 각 글의 frontmatter 에 박히는 값이라 만든 뒤에는 바꾸지
 * 않는다. 바꾸려면 소속 글을 전부 고치고 옛 주소를 리다이렉트해야 한다.
 */
async function planSeriesAdd(op: {
  id: string
  title: string
  description: string
}): Promise<{ changes: Change[]; headline: string }> {
  const path = seriesPath(op.id)
  if ((await readRepoFile(path)) !== null) {
    throw new Error(`이미 '${op.id}' 시리즈가 있습니다`)
  }
  const raw = buildSeriesYml(op.id, op.title, op.description)
  return {
    changes: [
      {
        path,
        slug: op.id,
        title: op.title,
        field: '시리즈',
        before: '(없음)',
        after: raw.trimEnd(),
        op: 'create',
        nextRaw: raw,
      },
    ],
    headline: `'${op.title}' 시리즈를 만듭니다`,
  }
}

async function planSeriesEdit(op: {
  id: string
  title: string
  description: string
}): Promise<{ changes: Change[]; headline: string }> {
  const path = seriesPath(op.id)
  const raw = await readRepoFile(path)
  if (raw === null) throw new Error(`'${op.id}' 시리즈를 찾을 수 없습니다`)

  const edit = editSeriesYml(raw, { title: op.title, description: op.description })
  const headline = `'${op.title}' 시리즈 정보를 고칩니다`
  if (!edit) return { changes: [], headline }

  return {
    changes: [
      {
        path,
        slug: op.id,
        title: op.title,
        field: edit.fields.join(' · '),
        before: edit.before,
        after: edit.after,
        op: 'update',
        nextRaw: edit.next,
      },
    ],
    headline,
  }
}

async function planSeriesDelete(
  posts: PostMeta[],
  id: string,
): Promise<{ changes: Change[]; headline: string; deadUrls: string[] }> {
  // 소속 글이 남아 있으면 지우지 않는다. 지우면 그 글들의 series 필드가
  // 존재하지 않는 시리즈를 가리키게 되고, 글 페이지의 시리즈 내비가 깨진다.
  const held = posts.filter((p) => p.series === id)
  if (held.length > 0) {
    throw new Error(`글 ${held.length}개가 아직 이 시리즈에 있습니다. 먼저 빼주세요.`)
  }

  const path = seriesPath(id)
  const raw = await readRepoFile(path)
  if (raw === null) throw new Error(`'${id}' 시리즈를 찾을 수 없습니다`)

  return {
    changes: [
      {
        path,
        slug: id,
        title: id,
        field: '시리즈',
        before: raw.trimEnd(),
        after: '(삭제)',
        op: 'delete',
      },
    ],
    headline: `'${id}' 시리즈를 지웁니다`,
    deadUrls: [seriesUrl(id)],
  }
}

/** 무엇이 바뀌는지 한 줄로. 글 프론트매터와 설정 파일은 성격이 다르다. */
function describe(changes: Change[]): string {
  if (changes.length === 0) return '변경할 내용이 없습니다'
  const fields = [...new Set(changes.map((c) => c.field))].join(' · ')
  const every = (op: Change['op']) => changes.every((c) => c.op === op)

  if (every('create')) return `파일 ${changes.length}개를 새로 만듭니다`
  if (every('delete')) return `파일 ${changes.length}개를 지웁니다`
  if (changes.every((c) => c.path.startsWith('src/'))) {
    return `설정 파일 ${changes.length}개 · ${fields}`
  }
  if (changes.every((c) => c.path.startsWith('content/posts/'))) {
    return `프론트매터 ${fields} 필드만 변경 · 파일 ${changes.length}개`
  }
  return `${fields} 변경 · 파일 ${changes.length}개`
}

/** 계획을 만든다. 파일은 건드리지 않는다. */
export async function buildPlan(op: Operation): Promise<{ plan: Plan; changes: Change[] }> {
  const posts = await loadPosts()

  let changes: Change[] = []
  let skipped: Skipped[] = []
  let headline = ''
  let deadUrls: string[] = []

  const n = (op as { slugs?: string[] }).slugs?.length ?? 0

  switch (op.kind) {
    case 'tag.merge': {
      const r = planTagMerge(posts, op.from, op.to)
      changes = r.changes
      skipped = r.skipped
      deadUrls = r.sources.map(tagUrl)
      headline =
        r.sources.length === 1
          ? `'${r.sources[0]}' 태그를 '${op.to}' 로 바꿉니다`
          : `태그 ${r.sources.length}개를 '${op.to}' 로 합칩니다`
      break
    }
    case 'tag.delete': {
      changes = planTagDelete(posts, op.tag)
      deadUrls = [tagUrl(op.tag)]
      headline = `'${op.tag}' 태그를 삭제합니다`
      break
    }
    case 'post.addTag': {
      const r = planBulk(posts, op.slugs, (p) =>
        p.tags.includes(op.tag)
          ? { skip: `이미 '${op.tag}' 보유` }
          : { edits: [{ field: 'tags', line: `tags: ${yamlList([...p.tags, op.tag])}` }] },
      )
      changes = r.changes
      skipped = r.skipped
      headline = `글 ${n}개에 '${op.tag}' 태그를 추가합니다`
      break
    }
    case 'post.removeTag': {
      const r = planBulk(posts, op.slugs, (p) =>
        p.tags.includes(op.tag)
          ? { edits: [{ field: 'tags', line: `tags: ${yamlList(p.tags.filter((t) => t !== op.tag))}` }] }
          : { skip: `'${op.tag}' 없음` },
      )
      changes = r.changes
      skipped = r.skipped
      headline = `글 ${n}개에서 '${op.tag}' 태그를 뺍니다`
      break
    }
    case 'post.setCategory': {
      const r = planBulk(posts, op.slugs, (p) =>
        p.category === op.category
          ? { skip: '이미 같은 카테고리' }
          : { edits: [{ field: 'category', line: `category: ${yamlScalar(op.category)}` }] },
      )
      changes = r.changes
      skipped = r.skipped
      headline = `글 ${n}개를 '${op.category}' 카테고리로 옮깁니다`
      break
    }
    case 'series.setOrder': {
      // 넘어온 배열 순서대로 1부터 다시 매긴다. 번호 구멍(1,2,4)도 여기서 정리된다.
      const r = planBulk(posts, op.slugs, (p) => {
        const next = op.slugs.indexOf(p.file.slug) + 1
        if (p.series !== op.id) return { skip: '이 시리즈 소속이 아님' }
        if (p.seriesOrder === next) return { skip: `이미 ${next}번` }
        return { edits: [{ field: 'seriesOrder', line: `seriesOrder: ${next}` }] }
      })
      changes = r.changes
      skipped = r.skipped
      headline = `'${op.id}' 시리즈 순서를 다시 매깁니다`
      break
    }
    case 'series.addPosts': {
      // 이미 들어있는 글의 최대 번호 뒤에 붙인다
      let next =
        posts.filter((p) => p.series === op.id).reduce((m, p) => Math.max(m, p.seriesOrder ?? 0), 0)
      const r = planBulk(posts, op.slugs, (p) => {
        if (p.series === op.id) return { skip: '이미 이 시리즈 소속' }
        next += 1
        return {
          edits: [
            { field: 'series', line: `series: ${yamlScalar(op.id)}` },
            // series 바로 뒤에 둔다. 기본 앵커(category)를 쓰면 순서가 뒤집힌다.
            { field: 'seriesOrder', line: `seriesOrder: ${next}`, after: ['series'] },
          ],
        }
      })
      changes = r.changes
      skipped = r.skipped
      headline = `글 ${op.slugs.length}개를 '${op.id}' 시리즈에 넣습니다`
      break
    }
    case 'series.removePosts': {
      const r = planBulk(posts, op.slugs, (p) =>
        p.series
          ? {
              edits: [
                { field: 'series', line: null },
                { field: 'seriesOrder', line: null },
              ],
            }
          : { skip: '시리즈 소속이 아님' },
      )
      changes = r.changes
      skipped = r.skipped
      headline = `글 ${op.slugs.length}개를 시리즈에서 뺍니다`
      break
    }
    case 'series.add': {
      const r = await planSeriesAdd(op)
      changes = r.changes
      headline = r.headline
      break
    }
    case 'series.edit': {
      const r = await planSeriesEdit(op)
      changes = r.changes
      headline = r.headline
      break
    }
    case 'series.delete': {
      const r = await planSeriesDelete(posts, op.id)
      changes = r.changes
      headline = r.headline
      deadUrls = r.deadUrls
      break
    }
    case 'category.add': {
      const { changes: c, headline: h } = await planCategoryAdd(op)
      changes = c
      headline = h
      break
    }
    case 'post.setPinned': {
      const r = planBulk(posts, op.slugs, (p) =>
        p.pinned === op.pinned
          ? { skip: op.pinned ? '이미 고정됨' : '이미 해제됨' }
          : { edits: [{ field: 'pinned', line: `pinned: ${op.pinned}` }] },
      )
      changes = r.changes
      skipped = r.skipped
      headline = op.pinned ? `글 ${n}개를 고정합니다` : `글 ${n}개의 고정을 해제합니다`
      break
    }
  }

  const dirty = await dirtyFiles(changes.map((c) => c.path))
  if (changes.length === 0) deadUrls = []

  const plan: Plan = {
    headline,
    detail: describe(changes),
    // nextRaw(파일 전체 내용)는 클라이언트로 보내지 않는다
    changes: changes.map((c) => ({
      path: c.path,
      slug: c.slug,
      title: c.title,
      field: c.field,
      before: c.before,
      after: c.after,
      op: c.op,
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
    if (c.op === 'delete') return { path: c.path, content: null }
    if (!c.nextRaw) throw new Error(`대상 파일을 찾을 수 없습니다: ${c.path}`)
    return { path: c.path, content: c.nextRaw }
  })

  const { written, commit } = await writeFiles(files, plan.headline)
  return { written, plan, commit }
}
