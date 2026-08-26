export type HeatDay = {
  /** YYYY-MM-DD */
  date: string
  count: number
  /** 0 = 없음, 1~3 = 농도. GitHub 처럼 다섯 단계까지 갈 만큼 글이 많지 않다. */
  level: 0 | 1 | 2 | 3
  /** 그 해에 속하지 않거나(격자 양 끝) 아직 오지 않은 날. 칸은 그리되 툴팁을 달지 않는다. */
  muted?: boolean
}

export type Heatmap = {
  year: number
  weeks: HeatDay[][]
  /** 주 인덱스 → 월 라벨 */
  monthLabels: { week: number; label: string }[]
  total: number
  /** 글을 쓴 날 수 */
  activeDays: number
  maxStreak: number
}

const DAY = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (s: string) => new Date(`${s}T00:00:00.000Z`)

const levelOf = (n: number): HeatDay['level'] =>
  n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3

/**
 * 달력 한 해(1/1~12/31)의 격자.
 *
 * 열이 주, 행이 요일이다. 1월 1일이 일요일이 아니면 격자 왼쪽 위가 비고,
 * 12월 31일이 토요일이 아니면 오른쪽 아래가 빈다. 그 칸들도 그린다 —
 * 빼면 격자가 찌그러진다. 대신 그 해가 아니거나 아직 오지 않은 날에는
 * 툴팁을 달지 않는다.
 */
export function buildHeatmap(dates: string[], year: number, today = new Date()): Heatmap {
  const counts = new Map<string, number>()
  for (const d of dates) {
    const key = d.slice(0, 10)
    if (key.startsWith(String(year))) counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const first = utc(`${year}-01-01`)
  const last = utc(`${year}-12-31`)
  const start = new Date(first.getTime() - first.getUTCDay() * DAY)
  const end = new Date(last.getTime() + (6 - last.getUTCDay()) * DAY)
  const todayKey = iso(today)

  const weeks: HeatDay[][] = []
  const monthLabels: { week: number; label: string }[] = []
  let total = 0
  let activeDays = 0
  let streak = 0
  let maxStreak = 0
  let lastMonth = -1

  const weekCount = Math.round((end.getTime() - start.getTime()) / DAY + 1) / 7

  for (let w = 0; w < weekCount; w++) {
    const week: HeatDay[] = []
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start.getTime() + (w * 7 + d) * DAY)
      const key = iso(cur)
      const inYear = cur >= first && cur <= last
      const arrived = key <= todayKey

      if (!inYear || !arrived) {
        week.push({ date: key, count: 0, level: 0, muted: true })
        continue
      }

      const count = counts.get(key) ?? 0
      total += count
      if (count > 0) {
        activeDays++
        streak++
        maxStreak = Math.max(maxStreak, streak)
      } else {
        streak = 0
      }
      week.push({ date: key, count, level: levelOf(count) })
    }

    // 그 주에 처음 등장하는 "그 해의 달"에 라벨을 단다
    const marker = week.find((d) => d.date.startsWith(String(year)))
    if (marker) {
      const m = Number(marker.date.slice(5, 7))
      if (m !== lastMonth) {
        lastMonth = m
        monthLabels.push({ week: w, label: `${m}월` })
      }
    }

    weeks.push(week)
  }

  return { year, weeks, monthLabels, total, activeDays, maxStreak }
}

/** 글이 있는 연도들. 최신순. */
export const postYears = (dates: string[]): number[] =>
  [...new Set(dates.map((d) => Number(d.slice(0, 4))))].sort((a, b) => b - a)
