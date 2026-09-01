/**
 * giscus 설정.
 *
 * 이 값들은 전부 공개 정보다. 브라우저에 그대로 script 태그로 나가므로
 * 비밀이 아니고, 그래서 환경변수가 아니라 코드에 둔다. 바뀔 일도 거의 없다.
 *
 * 얻는 곳: https://giscus.app 에서 저장소를 넣으면 아래 네 값을 알려준다.
 * 비워두면 댓글 영역이 렌더되지 않는다.
 */
export const giscus = {
  repo: '' as `${string}/${string}` | '',
  repoId: '',
  category: 'Comments',
  categoryId: '',
} as const

export const isGiscusConfigured = () =>
  Boolean(giscus.repo && giscus.repoId && giscus.categoryId)
