import { authConfig } from '@/lib/auth/config'

const API = 'https://api.github.com'

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/repos/${authConfig.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${authConfig.repoToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status} ${path} — ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

export type TreeEntry = { path: string; type: string; sha: string }

export async function listTree(): Promise<TreeEntry[]> {
  const ref = await gh<{ object: { sha: string } }>(
    `/git/ref/heads/${authConfig.branch}`,
  )
  const commit = await gh<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`)
  const tree = await gh<{ tree: TreeEntry[]; truncated: boolean }>(
    `/git/trees/${commit.tree.sha}?recursive=1`,
  )
  if (tree.truncated) {
    throw new Error('저장소 트리가 너무 커서 잘렸습니다. 페이지네이션이 필요합니다.')
  }
  return tree.tree
}

export async function readBlob(sha: string): Promise<string> {
  const blob = await gh<{ content: string; encoding: string }>(`/git/blobs/${sha}`)
  if (blob.encoding !== 'base64') throw new Error(`알 수 없는 인코딩: ${blob.encoding}`)
  return Buffer.from(blob.content, 'base64').toString('utf8')
}

/**
 * 여러 파일을 **커밋 하나로** 쓴다.
 *
 * Contents API는 파일당 커밋 하나라서, 태그 병합처럼 N개 파일을 고치면
 * 커밋이 N개 쌓이고 중간에 실패하면 절반만 반영된 상태가 남는다.
 * Git Data API로 트리를 통째로 만들면 원자성이 구조적으로 보장된다.
 */
export async function commitFiles(
  files: { path: string; content: string }[],
  message: string,
): Promise<{ sha: string; url: string }> {
  if (files.length === 0) throw new Error('커밋할 파일이 없습니다')

  const ref = await gh<{ object: { sha: string } }>(
    `/git/ref/heads/${authConfig.branch}`,
  )
  const parent = ref.object.sha
  const base = await gh<{ tree: { sha: string } }>(`/git/commits/${parent}`)

  const blobs = await Promise.all(
    files.map((f) =>
      gh<{ sha: string }>('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({
          content: Buffer.from(f.content, 'utf8').toString('base64'),
          encoding: 'base64',
        }),
      }).then((b) => ({ path: f.path, sha: b.sha })),
    ),
  )

  const tree = await gh<{ sha: string }>('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: base.tree.sha,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: '100644',
        type: 'blob',
        sha: b.sha,
      })),
    }),
  })

  const commit = await gh<{ sha: string; html_url: string }>('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }),
  })

  // force를 쓰지 않는다. 그 사이 누가 푸시했다면 실패해야 한다.
  await gh(`/git/refs/heads/${authConfig.branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  })

  return { sha: commit.sha, url: commit.html_url }
}
