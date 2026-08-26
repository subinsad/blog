/**
 * 제목 → URL slug.
 *
 * 반드시 ASCII 만 남긴다. Next 16 은 한글 slug 로 정적 페이지를 만들기는
 * 하지만(테스트.html) 그 라우트를 매칭하지 못해 404 가 된다. 인코딩을
 * 어떻게 바꿔도 마찬가지다. 그래서 애초에 비 ASCII 를 만들지 않는다.
 */

// 국어의 로마자 표기법 기준. 음운 변화까지 반영하지는 않지만
// 결정적이고 읽을 수 있으면 slug 로는 충분하다.
const CHO = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h']
const JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
const JONG = ['','k','k','k','n','n','n','t','l','k','m','p','t','t','p','l','m','p','p','t','t','ng','t','t','k','t','p','t']

export function romanize(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0)! - 0xac00
    if (code < 0 || code > 11171) {
      out += ch
      continue
    }
    out += CHO[Math.floor(code / 588)]
    out += JUNG[Math.floor((code % 588) / 28)]
    out += JONG[code % 28]
  }
  return out
}

export function slugify(title: string, fallbackDate?: string): string {
  const slug = romanize(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')

  if (slug.length >= 2) return slug
  // 제목이 기호뿐이거나 비어 있는 경우
  return `post-${fallbackDate ?? new Date().toISOString().slice(0, 10)}`
}

/** 파일 경로가 되는 값이라 형태를 좁게 강제한다. */
export const isSafeSlug = (s: string) => /^[a-z0-9][a-z0-9-]*$/.test(s) && s.length <= 80
