# 개발자 개인 블로그 — 구현 계획서

작성일: 2026-08-25
작성자: subin

---

## 1. 목표

velog 스타일의 개인 개발 블로그. 핵심 요구사항 3가지:

1. **카테고리 기반 정보구조** (velog의 태그 사이드바처럼 좌측에서 분류 탐색)
2. **3가지 뷰 모드**: 카드형 / 목록형 / 카테고리형
3. 개발자용 — 코드 블록, 다크모드, RSS, 마크다운 작성 경험이 좋아야 함

**설계 원칙**: 글 쓰는 마찰이 0에 가까울 것. 배포는 `git push` 한 번. 런타임 서버 상태 없이 정적으로 최대한 해결.

---

## 2. 기술 스택 (권장안)

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js 15 (App Router)** + TypeScript | SSG/ISR, 이미지 최적화, OG 이미지 생성이 한 곳에 |
| 스타일 | **Tailwind CSS v4** + CSS 변수 토큰 | 디자인 토큰 기반 다크모드 전환이 깔끔 |
| 콘텐츠 | **로컬 MDX** + `velite` | frontmatter → 타입 안전한 JSON 인덱스 자동 생성 |
| 코드 하이라이팅 | **Shiki** (`rehype-pretty-code`) | 라이트/다크 듀얼 테마, 빌드타임 처리라 런타임 JS 0 |
| 검색 | **FlexSearch** + 정적 인덱스 JSON | 서버 없이 ⌘K 즉시 검색 |
| 댓글 | **giscus** (GitHub Discussions) | 개발자 블로그와 궁합, DB 불필요 |
| 배포 | **Vercel** | 프리뷰 배포, OG 이미지 런타임, 무료 티어 충분 |
| 폰트 | Pretendard Variable + JetBrains Mono | 한글 가독성 + 코드 |

### 대안 검토 (기록용)

- ~~Contentlayer~~ — 사실상 유지보수 중단. **velite**로 대체.
- **Astro** — 정적 블로그엔 더 가볍고 빠름. 다만 조회수/좋아요 같은 동적 확장, React 컴포넌트 자산 재활용을 고려하면 Next.js가 장기적으로 유리.
- **Notion을 CMS로** — 모바일에서 글쓰기가 편한 대신 코드블록 표현력·빌드 파이프라인이 제약. 옵션으로 남겨둠 (§9 참고).

---

## 3. 정보구조 (IA)

velog는 "태그" 한 층만 쓰지만, 개발 블로그는 **2층 + 연재축**이 관리하기 좋습니다.

```
카테고리 (1개 필수, 배타적)   →  좌측 사이드바 네비게이션. 예: Frontend / Backend / DevOps / 회고
  └ 태그 (N개, 교차 분류)      →  세부 필터. 예: React, Next.js, 성능최적화
  └ 시리즈 (선택, 순서 있음)   →  연재글 묶음. velog의 대표 기능이자 개발 블로그에 가장 유용
```

- 카테고리는 **5~7개로 고정**하고 늘리지 않기 (늘어나면 탐색이 무너짐)
- 태그는 자유롭게, 단 글 수 3개 미만 태그는 목록에서 숨김 처리

### 라우트 설계

```
/                      홈 — 최신글 + 고정글, 뷰 토글
/posts                 전체 글 — 뷰 토글 + 정렬 + 필터
/posts/[slug]          글 상세
/categories            카테고리 인덱스 (= 카테고리 뷰 전용 페이지)
/categories/[slug]     카테고리별 글 목록
/tags                  태그 클라우드
/tags/[tag]            태그별 글 목록
/series                시리즈 목록
/series/[slug]         시리즈 상세 (순서대로 나열 + 진행률)
/about                 소개 / 이력 / 기술스택
/write                 글쓰기 에디터          ← dev 전용
/write/[slug]          기존 글 수정            ← dev 전용
/archive               연도·월별 타임라인
/rss.xml  /feed.json  /sitemap.xml  /robots.txt
/api/og/[slug]         동적 OG 이미지
/api/draft             에디터 저장·이미지 업로드  ← dev 전용
```

---

## 4. 3가지 뷰 모드 명세

전역 컴포넌트 `<ViewToggle />` 로 전환. 상태는 **URL 쿼리(`?view=list`)를 정본**으로 두고 `localStorage`에 마지막 선택을 저장 → 공유 링크가 뷰까지 보존되고, 재방문 시 취향이 유지됨.

### 4.1 카드 뷰 (`view=card`) — 기본값
- 3열 그리드 (데스크탑) / 2열 (태블릿) / 1열 (모바일)
- 썸네일 16:9, 없으면 카테고리 색상 기반 그라데이션 자동 생성
- 제목 2줄 클램프 · 요약 2줄 클램프 · 태그 최대 3개 · 날짜 · 읽기 시간
- 호버 시 살짝 부양 + 썸네일 확대

### 4.2 목록 뷰 (`view=list`)
- 한 줄에 한 글, 밀도 높게 (한 화면에 15~20개)
- `날짜 · 제목 · 카테고리 배지 · 태그` 한 줄 구성, 썸네일 없음
- 빠르게 훑고 찾는 용도. 키보드 `j`/`k` 이동 + `Enter` 진입

### 4.3 카테고리 뷰 (`view=category`)
- 카테고리별 섹션으로 그룹핑, 섹션 헤더에 `카테고리명 (글 수)`
- 각 섹션 안은 목록형으로 최신 5개 + "더 보기" → 해당 카테고리 페이지
- 접기/펼치기 가능, 펼침 상태도 localStorage 저장
- 블로그 전체 지형을 한눈에 보여주는 "지도" 역할

> 세 뷰 모두 **동일한 데이터 소스와 필터 상태**를 공유해야 함. 뷰는 렌더링 레이어일 뿐, 필터·정렬·페이지네이션 로직은 공통 훅(`usePostQuery`)으로 분리.

---

## 5. 콘텐츠 스키마

```yaml
---
title: "Next.js App Router에서 MDX 파이프라인 만들기"
date: 2026-08-25
updated: 2026-08-26          # 선택
category: Frontend            # 필수, 1개
tags: [Next.js, MDX, velite]  # 선택, N개
series: nextjs-blog           # 선택
seriesOrder: 2                # series 있을 때 필수
summary: "한 줄 요약. 목록·카드·OG·RSS에 공통 사용."
thumbnail: ./cover.png        # 선택, 상대경로
draft: false                  # true면 프로덕션 빌드에서 제외
pinned: false                 # 홈 상단 고정
---
```

자동 계산 필드: `slug`, `readingTime`, `wordCount`, `toc`, `excerpt`

### 디렉토리 구조

```
blog/
├─ content/
│  ├─ posts/
│  │  └─ 2026/nextjs-mdx-pipeline/
│  │     ├─ index.mdx
│  │     └─ cover.png              # 글과 이미지를 같은 폴더에 (co-location)
│  └─ series/nextjs-blog.yml       # 시리즈 메타(제목/설명/커버)
├─ src/
│  ├─ app/                         # 라우트 (§3)
│  ├─ components/
│  │  ├─ post/                     # PostCard, PostListItem, PostGrid,
│  │  │                            # ViewToggle, TOC, SeriesNav, RelatedPosts
│  │  ├─ layout/                   # Header, CategorySidebar, Footer, ThemeToggle
│  │  ├─ search/                   # CommandPalette
│  │  └─ mdx/                      # CodeBlock, Callout, ImageZoom, LinkCard
│  ├─ lib/                         # content.ts, search.ts, og.ts, utils.ts
│  └─ styles/tokens.css
├─ scripts/new-post.ts             # 글 생성 CLI
├─ velite.config.ts
└─ public/
```

---

## 6. 디자인 방향

velog의 좋은 점만 가져오되 그대로 베끼지는 않기.

- **여백 중심**: 본문 컬럼 최대 720px, 행간 1.7, 본문 17px
- **액센트 컬러 1개**만 사용 (velog는 민트 `#12B886`). 나머지는 무채색 스케일 9단계
- **다크모드 필수** — `prefers-color-scheme` + 수동 토글, 코드블록도 듀얼 테마
- 카테고리별 액센트 색상을 부여해 카드/배지에서 시각적 구분
- 모션은 절제: 150~200ms ease-out, `prefers-reduced-motion` 존중
- 접근성 WCAG 2.1 AA — 대비 4.5:1, 포커스 링, 키보드 완주 가능

**디자인 토큰**을 CSS 변수로 먼저 정의하고 Tailwind가 그걸 참조하게 구성 (테마 교체가 변수 파일 하나 수정으로 끝남).

---

## 7. 단계별 구현 계획

각 Phase 끝에 **동작하는 상태**로 커밋. 총 예상 7~8일 (여유 있게).

### Phase 0 — 셋업 (0.5d)
- `create-next-app` (TS, Tailwind, App Router), pnpm, ESLint + Prettier
- git init, GitHub 리포 생성, Vercel 연결 (빈 상태로 먼저 배포 성공시키기)
- 디자인 토큰 CSS 변수 + 폰트 로딩

### Phase 1 — 콘텐츠 파이프라인 (1d)
- velite 스키마 정의 (§5), 샘플 글 3편 작성
- MDX 플러그인 체인: `remark-gfm` → `rehype-slug` → `rehype-autolink-headings` → `rehype-pretty-code`
- `lib/content.ts`: 전체 글/카테고리별/태그별/시리즈별 조회 함수 + draft 필터
- **검증 기준**: 터미널에서 `getPostsByCategory('Frontend')`가 올바른 결과 반환

### Phase 2 — 레이아웃 & 디자인 시스템 (1d)
- Header (로고/검색/다크모드 토글), Footer
- **CategorySidebar** — 카테고리 + 글 수, 현재 위치 하이라이트, 모바일은 드로어
- 다크모드 (`next-themes`, FOUC 방지 스크립트)
- 반응형 브레이크포인트 확정

### Phase 3 — 3가지 뷰 (1.5d) ★핵심
- `PostCard` / `PostListItem` / `CategorySection` 컴포넌트
- `ViewToggle` + `usePostQuery` 훅 (URL 쿼리 ↔ localStorage 동기화)
- `/posts`, `/categories`, `/categories/[slug]`, `/tags/[tag]` 페이지
- 정렬(최신/오래된/읽기시간), 페이지네이션 또는 무한스크롤
- **검증 기준**: 뷰 전환 시 스크롤·필터 상태 유지, 새로고침해도 뷰 보존, 공유 링크에 뷰 포함

### Phase 4 — 글 상세 (1d)
- 헤더(제목/날짜/카테고리/태그/읽기시간), 본문 타이포그래피
- **TOC** 우측 플로팅 + 스크롤 스파이, 상단 읽기 진행률 바
- 코드블록: 파일명 표시, 복사 버튼, 라인 하이라이트, diff
- 커스텀 MDX 컴포넌트: Callout, LinkCard, ImageZoom
- SeriesNav (이전/다음 + 시리즈 목차), RelatedPosts (태그 유사도 상위 3개)

### Phase 5 — 검색 · 피드 · SEO (1d)
- 빌드타임 검색 인덱스 생성 → `⌘K` 커맨드 팔레트
- **한글 초성 검색** 지원 (ㅍㅍㅍ → "프론트엔드 퍼포먼스 패턴")
- RSS / JSON Feed / sitemap / robots
- 메타데이터 API, JSON-LD (`BlogPosting`), 동적 OG 이미지 (`@vercel/og`)

### Phase 6 — 글쓰기 에디터 (2d) ★신규
- `/write` 라우트 + TipTap 에디터 셋업
- 서식 진입점 5종: 마크다운 입력 규칙 / 슬래시 메뉴 / 버블 메뉴 / 상단 고정 툴바 / 블록 핸들·우클릭 메뉴
- 툴바 버튼 단축키 툴팁, `⇧`+우클릭 시 브라우저 기본 메뉴 통과
- 색상 8색 토큰 팔레트(글자/배경) + 크기 5단 — 임의 hex·px 불허, `<Mark>` / `<Caption>`로 직렬화
- 우측 발행 설정 패널 (카테고리·태그·시리즈·요약·썸네일)
- 3초 debounce 자동 저장 → `content/posts/`에 MDX로 기록
- 이미지 붙여넣기 → 글 폴더에 저장 + 상대경로 삽입
- **프로덕션 가드**: 라우트·API 모두 `NODE_ENV !== 'development'`면 404
- 상세 UI 스펙은 [DESIGN.md §13](./DESIGN.md)

### Phase 6.5 — 부가 기능 (0.5d)
- giscus 댓글
- 애널리틱스 (Vercel Analytics 또는 Umami 셀프호스팅)
- 404 / 로딩 / 빈 상태 디자인

### Phase 7 — 마감 & 배포 (0.5d)
- Lighthouse 95+ 확인 (Perf / A11y / SEO)
- GitHub Actions: 타입체크 + 린트 + 빌드
- 커스텀 도메인 연결, 글 작성 CLI (`pnpm new:post`)
- README에 운영 가이드 작성

---

## 8. 추가 아이디어 (요청하신 부분)

### 꼭 넣으면 좋은 것 — 개발자 블로그 차별화 상위 3
1. **시리즈(연재)** — velog의 진짜 강점. "Next.js 블로그 만들기 1~7편"처럼 묶이면 체류시간과 재방문이 확 달라집니다. Phase 4에 포함.
2. **한글 초성 검색** — 한국어 개발 블로그에서 의외로 아무도 안 하는데 체감 효용이 큽니다. `ㄹㅇㅌ` → "리액트". Phase 5에 포함.
3. **글 작성 CLI** — `pnpm new:post "제목"` 하면 폴더·frontmatter·날짜가 자동 생성. 글쓰기 마찰을 없애는 게 블로그 지속의 8할.

### 여력 되면
4. **TIL / 짧은 글 스트림 분리** — 롱폼과 별개로 `/notes`에 한두 문단짜리 메모를 쌓기. 긴 글 부담 때문에 블로그가 죽는 걸 방지
5. **포스팅 히트맵** — GitHub 잔디처럼 글 쓴 날을 시각화. `/about`에 배치하면 동기부여 + 재미
6. **북마크(스크랩)** — localStorage 기반, 서버 없이 구현
7. **AI 자동 요약** — 빌드 시 Claude API로 `summary` 미작성 글의 요약 생성 후 캐싱. 요약 쓰기 귀찮음 해결
8. **읽은 글 표시** — 방문한 글은 목록에서 흐리게. 목록 뷰에서 특히 유용
9. **코드 실행 임베드** — Sandpack으로 프론트엔드 예제를 인라인 실행
10. **뉴스레터** — Resend/Buttondown 연동. 초기에는 오버스펙일 수 있음

### 지금은 하지 말 것 (YAGNI)
- 좋아요/조회수 (DB·KV 필요 → 운영 복잡도 대비 효용 낮음. 애널리틱스로 충분)
- 다국어(i18n) — 영어 글을 실제로 쓰기 시작한 뒤에
- **호스팅되는 에디터** (로그인 + GitHub API 커밋) — Phase 6의 로컬 에디터를 먼저 써보고 판단

---

## 9. 확정된 결정사항

2026-08-25 확정:

1. **콘텐츠 저장** — ✅ **로컬 MDX + Git**
   - `content/posts/` 아래 MDX, 이미지는 글과 같은 폴더에 co-location
   - 글 = 커밋. 히스토리·롤백·초안 브랜치가 전부 Git으로 해결
2. **배포** — ✅ **Vercel**
   - `main` 푸시 → 프로덕션, PR → 프리뷰 배포
   - 동적 OG 이미지(`@vercel/og`)와 Vercel Analytics 사용 가능
3. **도메인** — ✅ **`blog.subbi.dev`**
   - `.dev`는 HSTS 프리로드로 HTTPS가 강제됨
   - 등록 후 Vercel에 CNAME 연결
4. **블로그 이름** — ✅ **`subbi.log`** (워드마크 스펙은 DESIGN.md §12)
5. **액센트 컬러** — ✅ 인디고 `#4263EB`

> 디자인 상세 스펙은 [DESIGN.md](./DESIGN.md) 참고.

## 10. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| Contentlayer 유지보수 중단 | velite 채택. 실패 시 gray-matter + next-mdx-remote 직접 파이프라인으로 폴백 |
| 3가지 뷰가 각자 다른 로직으로 갈라짐 | 필터/정렬을 `usePostQuery` 훅 하나로 강제 통일, 뷰는 순수 렌더링만 |
| 카테고리 남발로 IA 붕괴 | 카테고리 5~7개 상한을 스키마 레벨에서 enum으로 고정 |
| 이미지로 빌드 용량 증가 | next/image + 커밋 전 이미지 최적화 스크립트, 1MB 초과 시 CI 경고 |
| 글을 안 쓰게 됨 (최대 리스크) | 작성 CLI + TIL 스트림 + 히트맵으로 마찰과 부담을 낮춤 |

---

## 11. 완료 기준 (DoD)

- [ ] 카드 / 목록 / 카테고리 3가지 뷰가 모두 동작하고 URL로 공유 가능
- [ ] 카테고리·태그·시리즈로 글 탐색 가능
- [ ] MDX 글 작성 → `git push` → 자동 배포
- [ ] 다크모드, 모바일 반응형 완비
- [ ] Lighthouse Performance/A11y/SEO 각 95점 이상
- [ ] RSS·sitemap·OG 이미지 정상 동작
- [ ] 샘플 글 5편 이상 게시된 상태
