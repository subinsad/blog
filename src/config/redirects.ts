/**
 * 이름이나 주소를 바꿀 때마다 여기 한 줄이 쌓인다.
 *
 * 카테고리 slug, 시리즈 id, 태그 이름은 전부 URL 이다. 바꾸는 순간 옛
 * 주소는 죽고, 검색엔진에 잡혔거나 누가 공유해 둔 링크가 404 를 만난다.
 * 그걸 막는 유일한 장치라서 관리 화면이 이 파일을 직접 고친다.
 *
 * 손으로 고쳐도 된다. 관리 화면은 아래 형식과 정확히 같은 줄만 건드리고
 * 주석이나 빈 줄은 그대로 둔다.
 *
 * source 와 destination 은 **퍼센트 인코딩된** 경로여야 한다. 태그 이름처럼
 * 한글이 들어가는 주소를 날것으로 적으면 Next 가 조용히 무시한다 — 에러도
 * 경고도 없이 리다이렉트만 안 걸린다. 실제로 확인한 동작이다.
 *   맞음: /tags/%EC%84%B1%EB%8A%A5
 *   틀림: /tags/성능
 */
export type Redirect = { source: string; destination: string }

export const REDIRECTS: Redirect[] = [
  /* @redirects-end */
]
