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
    throw new Error(await explain(res, path))
  }
  return (await res.json()) as T
}

/**
 * GitHub 응답을 고칠 수 있는 문장으로 바꾼다.
 * 원문 그대로 보여주면 "Resource not accessible by personal access token" 만
 * 남아서, 무엇을 어디서 고쳐야 하는지 알 수 없다.
 */
async function explain(res: Response, path: string): Promise<string> {
  const raw = await res.text().catch(() => '')
  const detail = raw.slice(0, 200)
  const where = path ? ` (${path})` : ''

  switch (res.status) {
    case 401:
      return `GitHub 토큰이 유효하지 않습니다. GITHUB_REPO_TOKEN 이 만료됐거나 값이 잘못되었습니다.${where}`
    case 403:
      return [
        '토큰에 저장소 쓰기 권한이 없습니다.',
        'Fine-grained PAT 이라면 세 가지를 확인하세요.',
        `1) Repository access 에 ${authConfig.repo} 가 포함돼 있는지`,
        '2) Permissions → Contents 가 "Read and write" 인지 (Read-only 면 실패합니다)',
        '3) Classic 토큰이라면 repo 스코프가 켜져 있는지',
      ].join(' ')
    case 404:
      return `저장소 ${authConfig.repo} 를 찾을 수 없습니다. 이름이 틀렸거나, 토큰에 이 저장소 접근 권한이 없습니다.`
    case 409:
      return '그 사이 다른 커밋이 올라왔습니다. 화면을 새로고침한 뒤 다시 시도하세요.'
    case 422:
      return `GitHub 이 요청을 거부했습니다. ${detail}`
    default:
      return `GitHub API ${res.status}${where} — ${detail}`
  }
}

export type RepoAccess =
  | { ok: true; canWrite: true }
  | { ok: false; canWrite: boolean; message: string }

/**
 * 글을 저장하기 전에 토큰이 실제로 쓸 수 있는지 미리 본다.
 * 저장 버튼을 눌러봐야 알 수 있으면, 글을 다 쓴 뒤에야 막힌다.
 */
export async function checkRepoAccess(): Promise<RepoAccess> {
  if (!authConfig.repoToken) {
    return { ok: false, canWrite: false, message: 'GITHUB_REPO_TOKEN 이 설정되지 않았습니다.' }
  }
  try {
    const repo = await gh<{ permissions?: { push?: boolean } }>('')
    if (repo.permissions?.push) return { ok: true, canWrite: true }
    return {
      ok: false,
      canWrite: false,
      message: `토큰이 ${authConfig.repo} 를 읽을 수는 있지만 쓸 수 없습니다. Contents 권한을 "Read and write" 로 바꾸세요.`,
    }
  } catch (e) {
    return {
      ok: false,
      canWrite: false,
      message: e instanceof Error ? e.message : '저장소 접근을 확인하지 못했습니다.',
    }
  }
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
  files: { path: string; content: string | null }[],
  message: string,
): Promise<{ sha: string; url: string }> {
  if (files.length === 0) throw new Error('커밋할 파일이 없습니다')

  const ref = await gh<{ object: { sha: string } }>(
    `/git/ref/heads/${authConfig.branch}`,
  )
  const parent = ref.object.sha
  const base = await gh<{ tree: { sha: string } }>(`/git/commits/${parent}`)

  // sha 가 null 인 항목은 base_tree 에서 그 경로를 지운다는 뜻이다.
  const blobs = await Promise.all(
    files.map((f) =>
      f.content === null
        ? Promise.resolve({ path: f.path, sha: null })
        : gh<{ sha: string }>('/git/blobs', {
            method: 'POST',
            body: JSON.stringify({
              content: Buffer.from(f.content, 'utf8').toString('base64'),
              encoding: 'base64',
            }),
          }).then((b) => ({ path: f.path, sha: b.sha as string | null })),
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
