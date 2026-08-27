export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC',
  })
    .format(new Date(iso))
    .replace(/\. /g, '.')
    .replace(/\.$/, '')

export const formatDateShort = (iso: string) => formatDate(iso).slice(5)

export const readingTime = (min: number) => `${Math.max(1, Math.round(min))}분`

/**
 * 받침에 따라 '로' / '으로' 를 고른다. 관리 화면 문구가 전부 사용자가 지은
 * 이름을 받아 쓰기 때문에, 고정 문구로는 매번 어색해진다.
 *
 * 한글이 아니면(영문·숫자로 끝나면) 읽는 소리를 알 수 없으니 '로' 로 둔다.
 * 'Frontend 로' 가 'Frontend 으로' 보다 덜 튄다.
 */
export function ro(word: string): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return '로'
  const jong = code % 28
  // 받침이 없거나 ㄹ 이면 '로'
  return jong === 0 || jong === 8 ? '로' : '으로'
}
