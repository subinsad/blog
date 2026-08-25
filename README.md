# subbi.log

개인 개발 블로그. <https://blog.subbi.dev>

- 설계 문서: [docs/PLAN.md](docs/PLAN.md) · [docs/DESIGN.md](docs/DESIGN.md)
- 디자인 프로토타입: [docs/prototype.html](docs/prototype.html)

## 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript |
| 스타일 | Tailwind CSS v4 + CSS 변수 토큰 |
| 콘텐츠 | 로컬 MDX + [velite](https://velite.js.org) |
| 하이라이팅 | Shiki (`rehype-pretty-code`) 듀얼 테마 |
| 배포 | Vercel |

velite는 별도 CLI로 돌아 `.velite/`에 JSON과 타입을 만들고, Next는 그 결과를 import한다.
번들러(webpack/turbopack)에 묶이지 않는 게 contentlayer 대신 고른 이유다.

## 개발

```bash
pnpm install
pnpm dev          # velite --watch + next dev 동시 실행
```

| 명령 | 하는 일 |
| --- | --- |
| `pnpm dev` | 개발 서버 (http://localhost:3000) |
| `pnpm build` | `velite && next build` |
| `pnpm content` | 콘텐츠만 다시 빌드 |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm new:post "제목"` | 글 폴더 + frontmatter 생성 |

## 글 쓰기

```bash
pnpm new:post "Next.js App Router에서 MDX 파이프라인 만들기"
```

`content/posts/{연도}/{slug}/index.mdx`가 만들어진다. 이미지는 같은 폴더에 두고 상대경로로 참조한다.

```yaml
---
title: 글 제목
date: 2026-08-25
category: Frontend        # 5개 중 하나. 오타는 빌드 타임에 잡힌다
tags: [Next.js, MDX]
series: nextjs-blog       # 선택
seriesOrder: 1            # series가 있으면 필수
summary: 카드·목록·OG·RSS에 공통으로 쓰이는 한 줄 요약
thumbnail: ./cover.png    # 선택
draft: false              # true면 프로덕션 빌드에서 제외
pinned: false
---
```

`draft: true`인 글은 개발 서버에서만 보인다.

### MDX 컴포넌트

```mdx
<Mark c="blue">글자 색</Mark> · <Mark bg="yellow">형광펜</Mark>
<Callout type="warn">주의할 점</Callout>
<Caption>그림 1. 캡션</Caption>
```

`Mark`의 색은 토큰 이름(`gray red orange yellow green blue violet pink`)만 받는다.
임의 hex을 허용하면 다크모드에서 대비가 깨지기 때문이다.

## 정보구조

- **카테고리** — 1개 필수, 배타적. `velite.config.ts`의 enum으로 고정
- **태그** — N개, 교차 분류
- **시리즈** — 순서 있는 연재

## 뷰 모드

목록 페이지는 카드 · 목록 · 카테고리 세 가지로 볼 수 있다.
`?view=list` 쿼리가 정본이고 localStorage에 취향을 기억한다.

뷰 전환은 클라이언트에서만 읽는다. 서버 컴포넌트에서 `searchParams`를 읽으면
목록 페이지가 전부 동적 렌더링으로 떨어지기 때문이다.

## 기여 · 리뷰

`main`에 직접 푸시하지 않는다. 브랜치 → PR → 리뷰 → 머지.

```bash
git switch -c feat/some-change
# 작업
git push -u origin feat/some-change
gh pr create
```

PR은 [CI](.github/workflows/ci.yml)에서 타입 체크 · 린트 · 빌드를 통과해야 한다.
