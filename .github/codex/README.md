# Codex reviewer setup

This repository splits the two jobs on purpose:

| 역할 | 담당 | 권한 |
| --- | --- | --- |
| 구현 | Claude Code | 쓰기 |
| 검증 | Codex reviewer | 읽기 전용 |
| 자동 실행 | GitHub Actions | PR마다 |

Codex never writes to this repository. It reads a diff and reports P0–P3 findings.

## Files

| 파일 | 역할 |
| --- | --- |
| [`.codex/agents/reviewer.toml`](../../.codex/agents/reviewer.toml) | Codex가 `reviewer`라는 이름으로 불러오는 프로젝트 전용 커스텀 에이전트 |
| [`.codex/agents/reviewer.md`](../../.codex/agents/reviewer.md) | 리뷰 계약서. 제약, 점검 항목, P0–P3 기준, 출력 형식의 단일 소스 |
| [`.codex/config.toml`](../../.codex/config.toml) | 프로젝트 단위 읽기 전용 권한 설정 |
| [`prompts/review.md`](prompts/review.md) | PR 컨텍스트 래퍼. 위 에이전트 정의를 그대로 따르라고 지시 |
| [`../workflows/codex-review.yml`](../workflows/codex-review.yml) | PR 자동 리뷰 워크플로 |

The prompt file deliberately contains no review rules of its own. Change the rubric in
`.codex/agents/reviewer.md` and both local runs and CI pick it up.

The custom agent inherits the parent Codex model, uses `high` reasoning effort, and hard-codes a
`read-only` sandbox with `approval_policy = "never"`. Start a new Codex task after changing an
agent definition so the project-scoped agent catalog is refreshed.

## Running it locally

```bash
pnpm review
```

That reviews the uncommitted working tree — the usual way to check Claude Code's changes before
committing. To review a branch against `main` instead:

```bash
pnpm review:branch
```

`codex review` runs read-only by default. The `.codex/config.toml` settings apply on top of that,
but **only in a trusted project**: Codex ignores a repository's `.codex/config.toml` until the
directory is marked trusted in `~/.codex/config.toml`. On an untrusted checkout you fall back to
Codex's own defaults, so do not treat the project file as the only thing standing between the
agent and your working tree — `codex review` and `codex exec` are read-only sandboxed regardless.

## CI behavior

- Runs on `opened`, `synchronize`, `reopened`, and `ready_for_review`.
- Draft pull requests are skipped until marked ready.
- **Fork pull requests are skipped.** GitHub does not expose repository secrets to workflows
  triggered by a fork, so the reviewer cannot authenticate. Do not "fix" this with
  `pull_request_target` — that would run untrusted PR code with access to the secrets.
- Re-reviews edit one comment (matched by a hidden `<!-- codex-review -->` marker) instead of
  appending a new one per push.
- The review job holds only `contents: read`. Comment-writing is a separate job with
  `issues: write` and `pull-requests: write` and no checkout, so the token that can comment is
  never present in the job that runs model-generated commands.
- `sandbox: read-only` and `safety-strategy: drop-sudo` keep the action from writing or escalating.

## Secrets

| Secret | 용도 |
| --- | --- |
| `OPENAI_API_KEY` | `openai/codex-action@v1`이 사용하는 OpenAI API 키 |
| `CODEX_GITHUB_TOKEN` | 리뷰 코멘트를 남기는 전용 계정의 fine-grained 토큰 |

Give the reviewer account access to this repository only. The token needs the minimum permissions
required to post feedback: `Issues: Read and write` and `Pull requests: Read and write` — nothing
that can push, merge, or approve. Checkout uses the default Actions token, and the dedicated token
is used only for the comment, so the comment is attributed to the reviewer account.

Never commit either secret or put either value in a tracked `.env` file.

## Reviewing the reviewer

Things worth re-checking whenever this setup changes:

- `.codex/agents/reviewer.md` still forbids every write path, including `git` commands that touch
  the working tree.
- `.codex/agents/reviewer.toml` still selects `sandbox_mode = "read-only"` and
  `approval_policy = "never"`.
- The workflow still has no `pull_request_target` trigger and no `contents: write`.
- `CODEX_GITHUB_TOKEN` still cannot approve or merge a pull request.
- The `post-feedback` job still does not check out repository code.
