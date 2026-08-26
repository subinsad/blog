/**
 * OG 이미지에 쓸 폰트.
 *
 * Satori(ImageResponse)는 폰트 바이너리를 직접 받아야 하는데, 한글 폰트는
 * 통째로 넣기엔 너무 크다(Pretendard 2MB). Google Fonts 의 text= 파라미터로
 * 제목에 실제로 쓰인 글자만 잘라 받는다. 보통 몇 KB 로 끝난다.
 *
 * woff2 는 Satori 가 못 읽는다. User-Agent 를 보내지 않으면 truetype 이 온다.
 */
export async function loadOgFont(text: string): Promise<ArrayBuffer> {
  // 중복 글자를 빼면 URL 이 짧아지고 캐시도 잘 맞는다
  const chars = [...new Set(text)].join('')
  const url =
    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700' +
    `&text=${encodeURIComponent(chars)}`

  const css = await fetch(url).then((r) => r.text())
  const src = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1]
  if (!src) throw new Error('OG 폰트 URL 을 찾지 못했습니다')

  return fetch(src).then((r) => r.arrayBuffer())
}

export const OG_SIZE = { width: 1200, height: 630 }

/** 다크 배경 고정. 공유 카드는 상대 앱의 테마를 따르지 않는다. */
export const OG_COLORS = {
  bg: '#141517',
  fg: '#e9ecef',
  muted: '#909296',
  subtle: '#5c5f66',
  border: '#2c2e33',
} as const
