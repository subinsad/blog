# .claude/

Claude Code 프로젝트 설정. 각 폴더는 Claude Code가 인식하는 표준 경로다.

- `skills/` — 스킬 (`<이름>/SKILL.md`). `/이름`으로 호출하거나 모델이 알아서 부른다.
- `commands/` — 커스텀 슬래시 커맨드 (`.md`).
- `agents/` — 서브에이전트 정의 (`.md`). `name`·`description` frontmatter 필수.
- `hooks/` — 훅이 실행하는 스크립트. settings.json이 경로로 참조한다.

`commands/`와 `agents/`의 `.md`는 **전부 커맨드/에이전트로 파싱된다.**
README 같은 설명 파일을 그 안에 두면 이름 없는 커맨드로 등록되므로,
폴더 설명은 이 파일에 모은다.
