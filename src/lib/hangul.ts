const CHO = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
]

/** 초성 추출. 슬래시 메뉴와 태그 자동완성이 같은 규칙을 쓴다. */
export const toCho = (s: string) =>
  [...s]
    .map((ch) => {
      const i = ch.charCodeAt(0) - 0xac00
      return i >= 0 && i < 11172 ? CHO[Math.floor(i / 588)] : ch
    })
    .join('')

/** 이름·초성·부분일치를 한 번에 본다. */
export const matches = (haystack: string, query: string) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const h = haystack.toLowerCase()
  return h.includes(q) || toCho(haystack).includes(q) || toCho(haystack).includes(toCho(q))
}
