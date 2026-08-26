import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { authConfig } from '@/lib/auth/config'
import { listTree, readBlob, commitFiles, checkRepoAccess } from './github'
import { scanPostFiles, REPO_ROOT, type PostFile } from '@/lib/admin/scan'

/**
 * 로컬 개발은 파일시스템에 직접 쓰고, 프로덕션은 GitHub에 커밋한다.
 *
 * Vercel의 파일시스템은 읽기 전용이고 요청마다 사라진다. 프로덕션에서
 * 글을 저장한다는 건 곧 저장소에 커밋한다는 뜻이고, 그 커밋이 재빌드를
 * 트리거해야 사이트에 반영된다.
 */
export const usesGitHub = process.env.NODE_ENV === 'production'

const POSTS_PREFIX = 'content/posts/'

export type StoredFile = { path: string; content: string }

export async function listPosts(): Promise<PostFile[]> {
  if (!usesGitHub) return scanPostFiles()

  const tree = await listTree()
  const targets = tree.filter(
    (e) => e.type === 'blob' && e.path.startsWith(POSTS_PREFIX) && e.path.endsWith('/index.mdx'),
  )
  const files = await Promise.all(
    targets.map(async (e) => ({
      path: e.path,
      absPath: e.path,
      slug: e.path.slice(POSTS_PREFIX.length).split('/').filter(Boolean).slice(-2)[0] ?? '',
      raw: await readBlob(e.sha),
    })),
  )
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

/** 저장소 안의 임의 파일을 읽는다. 로컬은 디스크, 프로덕션은 GitHub. */
export async function readRepoFile(repoPath: string): Promise<string | null> {
  return readPost(repoPath)
}

export async function readPost(repoPath: string): Promise<string | null> {
  if (!usesGitHub) {
    try {
      return await readFile(resolve(REPO_ROOT, repoPath), 'utf8')
    } catch {
      return null
    }
  }
  const tree = await listTree()
  const hit = tree.find((e) => e.path === repoPath)
  return hit ? readBlob(hit.sha) : null
}

export type WriteResult = {
  written: string[]
  /** 프로덕션에서만. 만들어진 커밋. */
  commit?: { sha: string; url: string }
}

/**
 * 여러 파일을 한 번에 쓴다.
 * 로컬에서는 전부 쓰고 실패 시 원본으로 되돌린다.
 * 프로덕션에서는 커밋 하나로 묶여 원자성이 보장된다.
 */
export async function writeFiles(
  files: StoredFile[],
  message: string,
): Promise<WriteResult> {
  if (files.length === 0) return { written: [] }

  if (usesGitHub) {
    const commit = await commitFiles(files, message)
    return { written: files.map((f) => f.path), commit }
  }

  const originals = new Map<string, string | null>()
  for (const f of files) {
    const abs = resolve(REPO_ROOT, f.path)
    originals.set(abs, await readFile(abs, 'utf8').catch(() => null))
  }

  const written: string[] = []
  try {
    for (const f of files) {
      const abs = resolve(REPO_ROOT, f.path)
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, f.content, 'utf8')
      written.push(f.path)
    }
  } catch (e) {
    for (const [abs, raw] of originals) {
      if (raw !== null) await writeFile(abs, raw, 'utf8').catch(() => {})
    }
    throw e
  }
  return { written }
}

export const postPath = (year: string, slug: string) =>
  relative(REPO_ROOT, join(REPO_ROOT, 'content', 'posts', year, slug, 'index.mdx'))

export const repoUrl = () => `https://github.com/${authConfig.repo}`

/** 프로덕션에서만 의미가 있다. 로컬은 파일시스템에 직접 쓴다. */
export async function checkStorage() {
  if (!usesGitHub) return { ok: true as const, canWrite: true as const }
  return checkRepoAccess()
}
