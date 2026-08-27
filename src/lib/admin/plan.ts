import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { editField, yamlList, yamlScalar, type AnyField, type FieldName } from './frontmatter-edit'
import { categoryLine, parseCategories, spliceCategory } from './category-file'
import { applyMoves, type Move } from './redirects-edit'
import { buildSeriesYml, editSeriesYml, seriesPath, seriesUrl } from './series-file'
import { REPO_ROOT, type PostMeta } from './scan'
import { loadPosts } from './posts'
import { ro } from '@/lib/format'
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
  /** 옛 주소 → 새 주소. 리다이렉트가 깔리므로 죽지 않는다. */
  moved: Move[]
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
  | { kind: 'category.rename'; from: string; name: string; slug: string }
  | { kind: 'category.delete'; name: string }
  | { kind: 'series.rename'; from: string; to: string; title: string; description: string }

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
      op: 'update',
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
      op: 'update',
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
      op: 'update',
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

  const line = categoryLine(op)
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

const CATEGORIES_PATH = 'src/config/categories.ts'
const REDIRECTS_PATH = 'src/config/redirects.ts'

const categoryUrl = (slug: string) => `/categories/${slug}`

/** 옮겨진 주소를 리다이렉트 설정에 적는다. 적을 게 없으면 null. */
async function planRedirects(moves: Move[]): Promise<Change | null> {
  const real = moves.filter((m) => m.from !== m.to)
  if (real.length === 0) return null

  const raw = await readRepoFile(REDIRECTS_PATH)
  if (raw === null) throw new Error(`${REDIRECTS_PATH} 를 읽지 못했습니다`)

  const edit = applyMoves(raw, real)
  if (!edit) return null

  return {
    path: REDIRECTS_PATH,
    slug: 'redirects',
    title: '리다이렉트',
    field: 'REDIRECTS',
    before: `(${real.length}개 추가 전)`,
    after: real.map((m) => `${m.from} → ${m.to}`).join('\n'),
    op: 'update',
    nextRaw: edit.next,
  }
}

/**
 * 카테고리 이름·slug 바꾸기.
 *
 * 이름은 글 frontmatter 에, slug 는 주소에 들어간다. 설정 파일만 고치면
 * 옛 이름을 쓰는 글이 스키마 검증에서 떨어져 빌드가 깨진다. 한 커밋에
 * 전부 같이 바뀌어야 한다.
 */
async function planCategoryRename(
  posts: PostMeta[],
  op: { from: string; name: string; slug: string },
): Promise<{ changes: Change[]; skipped: Skipped[]; headline: string; moved: Move[] }> {
  const raw = await readRepoFile(CATEGORIES_PATH)
  if (raw === null) throw new Error(`${CATEGORIES_PATH} 를 읽지 못했습니다`)

  const defs = parseCategories(raw)
  const target = defs.find((c) => c.name === op.from)
  if (!target) throw new Error(`'${op.from}' 카테고리를 찾을 수 없습니다`)
  if (op.name !== op.from && defs.some((c) => c.name === op.name)) {
    throw new Error(`이미 '${op.name}' 카테고리가 있습니다`)
  }
  if (op.slug !== target.slug && defs.some((c) => c.slug === op.slug)) {
    throw new Error(`이미 '${op.slug}' slug 를 쓰는 카테고리가 있습니다`)
  }

  const changes: Change[] = []
  const nextLine = categoryLine({ ...target, name: op.name, slug: op.slug })
  const oldLine = raw.split('\n')[target.at]

  if (oldLine.trim() !== nextLine.trim()) {
    changes.push({
      path: CATEGORIES_PATH,
      slug: op.slug,
      title: op.name,
      field: 'CATEGORY_DEFS',
      before: oldLine.trim(),
      after: nextLine.trim(),
      op: 'update',
      nextRaw: spliceCategory(raw, target.at, nextLine),
    })
  }

  // 이름이 그대로면 글은 건드릴 게 없다
  const slugs = op.name === op.from ? [] : posts.filter((p) => p.category === op.from).map((p) => p.file.slug)
  const bulk = planBulk(posts, slugs, () => ({
    edits: [{ field: 'category', line: `category: ${yamlScalar(op.name)}` }],
  }))
  changes.push(...bulk.changes)

  const moved: Move[] =
    op.slug === target.slug ? [] : [{ from: categoryUrl(target.slug), to: categoryUrl(op.slug) }]
  const redirect = await planRedirects(moved)
  if (redirect) changes.push(redirect)

  return {
    changes,
    skipped: bulk.skipped,
    headline:
      op.name === op.from
        ? `'${op.from}' 카테고리 주소를 '${op.slug}' 로 바꿉니다`
        : `'${op.from}' 카테고리를 '${op.name}' ${ro(op.name)} 바꿉니다`,
    moved,
  }
}

/** 카테고리 지우기. 글이 남아 있으면 그 글들이 없는 카테고리를 가리키게 된다. */
async function planCategoryDelete(
  posts: PostMeta[],
  name: string,
): Promise<{ changes: Change[]; headline: string; deadUrls: string[] }> {
  const raw = await readRepoFile(CATEGORIES_PATH)
  if (raw === null) throw new Error(`${CATEGORIES_PATH} 를 읽지 못했습니다`)

  const defs = parseCategories(raw)
  const target = defs.find((c) => c.name === name)
  if (!target) throw new Error(`'${name}' 카테고리를 찾을 수 없습니다`)

  const held = posts.filter((p) => p.category === name)
  if (held.length > 0) {
    throw new Error(`글 ${held.length}개가 아직 이 카테고리에 있습니다. 먼저 옮겨주세요.`)
  }
  // 스키마가 최소 한 개를 요구한다. 0개가 되면 빌드가 깨진다.
  if (defs.length <= 1) throw new Error('마지막 카테고리는 지울 수 없습니다')

  return {
    changes: [
      {
        path: CATEGORIES_PATH,
        slug: target.slug,
        title: name,
        field: 'CATEGORY_DEFS',
        before: raw.split('\n')[target.at].trim(),
        after: '(삭제)',
        op: 'update',
        nextRaw: spliceCategory(raw, target.at, null),
      },
    ],
    headline: `'${name}' 카테고리를 지웁니다`,
    deadUrls: [categoryUrl(target.slug)],
  }
}

/**
 * 시리즈 id 바꾸기. id 는 파일 이름이자 주소이자 각 글의 series 값이다.
 * 파일을 옮기고, 소속 글을 전부 고치고, 옛 주소를 리다이렉트한다.
 */
async function planSeriesRename(
  posts: PostMeta[],
  op: { from: string; to: string; title: string; description: string },
): Promise<{ changes: Change[]; skipped: Skipped[]; headline: string; moved: Move[] }> {
  const { from, to } = op
  if (from === to) throw new Error('같은 id 입니다')
  const raw = await readRepoFile(seriesPath(from))
  if (raw === null) throw new Error(`'${from}' 시리즈를 찾을 수 없습니다`)
  if ((await readRepoFile(seriesPath(to))) !== null) {
    throw new Error(`이미 '${to}' 시리즈가 있습니다`)
  }

  // id 줄만 갈아끼운다. 주석이나 여분의 키는 그대로 옮겨간다.
  // 제목·설명도 같이 바뀌었으면 한 커밋에서 함께 처리한다.
  const renamed = raw.replace(/^id\s*:.*$/m, `id: ${to}`)
  const edit = editSeriesYml(renamed, { title: op.title, description: op.description })
  const moved = edit?.next ?? renamed

  const changes: Change[] = [
    {
      path: seriesPath(to),
      slug: to,
      title: to,
      field: '시리즈',
      before: '(없음)',
      after: moved.trimEnd(),
      op: 'create',
      nextRaw: moved,
    },
    {
      path: seriesPath(from),
      slug: from,
      title: from,
      field: '시리즈',
      before: raw.trimEnd(),
      after: '(삭제)',
      op: 'delete',
    },
  ]

  const slugs = posts.filter((p) => p.series === from).map((p) => p.file.slug)
  const bulk = planBulk(posts, slugs, () => ({
    edits: [{ field: 'series', line: `series: ${yamlScalar(to)}` }],
  }))
  changes.push(...bulk.changes)

  const moves: Move[] = [{ from: seriesUrl(from), to: seriesUrl(to) }]
  const redirect = await planRedirects(moves)
  if (redirect) changes.push(redirect)

  return {
    changes,
    skipped: bulk.skipped,
    headline: `'${from}' 시리즈 주소를 '${to}' 로 바꿉니다`,
    moved: moves,
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
  const post = changes.filter((c) => c.path.startsWith('content/posts/'))
  const other = changes.length - post.length

  // 이름 변경은 글과 설정 파일을 한꺼번에 건드린다. 필드 이름을 늘어놓는
  // 것보다 어느 쪽이 몇 개인지가 먼저 눈에 들어와야 한다.
  if (post.length > 0 && other > 0) return `글 ${post.length}개 · 설정 파일 ${other}개`

  if (other === 0) {
    const fields = [...new Set(post.map((c) => c.field))].join(' · ')
    return `프론트매터 ${fields} 필드만 변경 · 파일 ${post.length}개`
  }
  if (changes.every((c) => c.op === 'create')) return `파일 ${changes.length}개를 새로 만듭니다`
  if (changes.every((c) => c.op === 'delete')) return `파일 ${changes.length}개를 지웁니다`
  const fields = [...new Set(changes.map((c) => c.field))].join(' · ')
  return `설정 파일 ${changes.length}개 · ${fields}`
}

/** 계획을 만든다. 파일은 건드리지 않는다. */
export async function buildPlan(op: Operation): Promise<{ plan: Plan; changes: Change[] }> {
  const posts = await loadPosts()

  let changes: Change[] = []
  let skipped: Skipped[] = []
  let headline = ''
  let deadUrls: string[] = []
  let moved: Move[] = []

  const n = (op as { slugs?: string[] }).slugs?.length ?? 0

  switch (op.kind) {
    case 'tag.merge': {
      const r = planTagMerge(posts, op.from, op.to)
      changes = r.changes
      skipped = r.skipped
      // 옛 태그 주소는 죽지 않는다. 새 태그로 넘긴다.
      moved = r.sources.map((t) => ({ from: tagUrl(t), to: tagUrl(op.to) }))
      const redirect = changes.length > 0 ? await planRedirects(moved) : null
      if (redirect) changes.push(redirect)
      headline =
        r.sources.length === 1
          ? `'${r.sources[0]}' 태그를 '${op.to}' ${ro(op.to)} 바꿉니다`
          : `태그 ${r.sources.length}개를 '${op.to}' ${ro(op.to)} 합칩니다`
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
    case 'category.rename': {
      const r = await planCategoryRename(posts, op)
      changes = r.changes
      skipped = r.skipped
      headline = r.headline
      moved = r.moved
      break
    }
    case 'category.delete': {
      const r = await planCategoryDelete(posts, op.name)
      changes = r.changes
      headline = r.headline
      deadUrls = r.deadUrls
      break
    }
    case 'series.rename': {
      const r = await planSeriesRename(posts, op)
      changes = r.changes
      skipped = r.skipped
      headline = r.headline
      moved = r.moved
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
  if (changes.length === 0) {
    deadUrls = []
    moved = []
  }

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
    moved,
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
