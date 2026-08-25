export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC',
  })
    .format(new Date(iso))
    .replace(/\. /g, '.')
    .replace(/\.$/, '')

export const formatDateShort = (iso: string) => formatDate(iso).slice(5)

export const readingTime = (min: number) => `${Math.max(1, Math.round(min))}분`
