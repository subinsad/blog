export type HeatDay = {
  /** YYYY-MM-DD */
  date: string
  count: number
  /** 0 = 없음, 1~3 = 농도. GitHub 처럼 다섯 단계까지 갈 만큼 글이 많지 않다. */
  level: 0 | 1 | 2 | 3
  /** 범위 밖(오늘 이후)이라 칸을 비워둬야 하는 날 */
  blank?: boolean
}

export type HeatWeek = HeatDay[]

export type Heatmap = {
  weeks: HeatWeek[]
  /** 주 인덱스 → 월 라벨. 달이 바뀌는 첫 주에만 붙는다. */
  monthLabels: { week: number; label: string }[]
  total: number
  days: number
  /** 글을 쓴 날 수 */
  activeDays: number
  maxStreak: number
}

const DAY = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)

const levelOf = (n: number): HeatDay['level'] =>
  n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3

/**
 * 최근 1년치 격자.
 *
 * 열이 주, 행이 요일이다. 마지막 주가 오늘에서 끊기므로 그 뒤는 빈 칸으로
 * 남긴다. 채워버리면 아직 오지 않은 날에 "글 없음"이 표시된다.
 */
export function buildHeatmap(dates: string[], today = new Date()): Heatmap {
  const counts = new Map<string, number>()
  for (const d of dates) {
    const key = d.slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const end = new Date(`${iso(today)}T00:00:00.000Z`)
  // 52주 + 오늘 주. 그 주의 일요일부터 시작해야 열이 깔끔하게 떨어진다.
  const from = new Date(end.getTime() - 364 * DAY)
  const start = new Date(from.getTime() - from.getUTCDay() * DAY)

  const weeks: HeatWeek[] = []
  const monthLabels: { week: number; label: string }[] = []
  let total = 0
  let activeDays = 0
  let streak = 0
  let maxStreak = 0
  let lastMonth = -1

  for (let w = 0; ; w++) {
    const week: HeatWeek = []
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start.getTime() + (w * 7 + d) * DAY)
      if (cur > end) {
        week.push({ date: iso(cur), count: 0, level: 0, blank: true })
        continue
      }
      const key = iso(cur)
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

      // 그 주의 첫날 기준으로 달이 바뀌면 라벨을 단다
      if (d === 0) {
        const m = cur.getUTCMonth()
        if (m !== lastMonth) {
          lastMonth = m
          monthLabels.push({ week: w, label: `${m + 1}월` })
        }
      }
    }
    weeks.push(week)
    if (new Date(start.getTime() + (w * 7 + 6) * DAY) > end) break
  }

  return {
    weeks,
    monthLabels,
    total,
    days: Math.round((end.getTime() - start.getTime()) / DAY) + 1,
    activeDays,
    maxStreak,
  }
}
