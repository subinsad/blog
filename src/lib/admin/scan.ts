import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

export const CONTENT_ROOT = resolve(process.cwd(), 'content', 'posts')
export const REPO_ROOT = resolve(process.cwd())

export type PostFile = {
  /** 저장소 기준 상대 경로 — 화면과 git 명령에 그대로 쓴다 */
  path: string
  absPath: string
  slug: string
  raw: string
}

/** content/posts/**\/index.mdx 를 직접 훑는다. velite 출력의 slug만 믿고
 *  경로를 조합하면 폴더 연도와 date가 어긋난 글에서 엉뚱한 파일을 건드린다. */
export async function scanPostFiles(): Promise<PostFile[]> {
  const out: PostFile[] = []

  async function walk(dir: string) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) await walk(full)
      else if (e.name === 'index.mdx') {
        out.push({
          path: relative(REPO_ROOT, full),
          absPath: full,
          slug: dir.split('/').pop()!,
          raw: await readFile(full, 'utf8'),
        })
      }
    }
  }

  await walk(CONTENT_ROOT)
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

const FM_BODY = /^---\r?\n([\s\S]*?)\r?\n---/

const scalar = (body: string, key: string) => {
  const m = body.match(new RegExp(`^${key}\\s*:\\s*(.*)$`, 'm'))
  if (!m) return null
  return m[1].trim().replace(/^["'](.*)["']$/, '$1')
}

/** 인라인 `[a, b]` 와 블록 `- a` 두 형태를 모두 읽는다. */
function list(body: string, key: string): string[] {
  const inline = body.match(new RegExp(`^${key}\\s*:\\s*\\[(.*)\\]\\s*$`, 'm'))
  if (inline) {
    return inline[1]
      .split(',')
      .map((s) => s.trim().replace(/^["'](.*)["']$/, '$1'))
      .filter(Boolean)
  }
  const block = body.match(new RegExp(`^${key}\\s*:\\s*\\n((?:\\s*-\\s.*\\n?)+)`, 'm'))
  if (block) {
    return block[1]
      .split('\n')
      .map((l) => l.replace(/^\s*-\s*/, '').trim().replace(/^["'](.*)["']$/, '$1'))
      .filter(Boolean)
  }
  return []
}

export type PostMeta = {
  file: PostFile
  title: string
  date: string
  category: string
  tags: string[]
  series: string | null
  seriesOrder: number | null
  pinned: boolean
  draft: boolean
}

export function readMeta(file: PostFile): PostMeta | null {
  const m = file.raw.match(FM_BODY)
  if (!m) return null
  const body = m[1]
  const order = scalar(body, 'seriesOrder')
  return {
    file,
    title: scalar(body, 'title') ?? file.slug,
    date: scalar(body, 'date') ?? '',
    category: scalar(body, 'category') ?? '',
    tags: list(body, 'tags'),
    series: scalar(body, 'series'),
    seriesOrder: order === null ? null : Number(order),
    pinned: scalar(body, 'pinned') === 'true',
    draft: scalar(body, 'draft') === 'true',
  }
}

export async function loadPosts(): Promise<PostMeta[]> {
  const files = await scanPostFiles()
  return files
    .map(readMeta)
    .filter((x): x is PostMeta => x !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}
