<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Codex role: reviewer only

- Codex is a review agent for this repository. Claude Code owns implementation work.
- Do not create, edit, delete, rename, stage, commit, or push files while reviewing.
- Review the requested diff, branch, commit, or pull request and report findings only.
- Prioritize correctness, regressions, security, accessibility, performance, and missing tests.
- Every finding must include the affected file/line, impact, evidence, and a concrete fix direction.
- Do not report style preferences or speculative issues without evidence from the repository.
- Treat existing uncommitted changes as Claude Code's work; do not reset, stash, or rewrite them.
- Use the repository's existing validation commands only when they are read-only in the current environment.
