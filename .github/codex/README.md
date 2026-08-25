# Codex reviewer setup

This workflow runs Codex in read-only mode for every opened, reopened, or updated pull request.
Claude Code remains the implementation agent.

Repository secrets required:

- `OPENAI_API_KEY`: OpenAI API key used by `openai/codex-action@v1`.
- `CODEX_GITHUB_TOKEN`: fine-grained token created by the dedicated GitHub reviewer account.

Give the reviewer account access only to this repository. The token needs the minimum permissions
required to post feedback: `Issues: Read and write` and `Pull requests: Read and write`.
The workflow checks out code with the GitHub Actions token and uses the dedicated token only for the
final PR comment, so the comment is attributed to the reviewer account.

Never commit either secret or put either value in `.env` files tracked by Git.
