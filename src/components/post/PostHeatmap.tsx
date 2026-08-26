import { buildHeatmap, postYears } from '@/lib/heatmap'

const GAP = 3
/** 이 아래로는 칸이 너무 작아져 가로 스크롤로 넘긴다. */
const MIN_WIDTH = 680

/** 액센트 한 색의 농도만 쓴다. 새 색을 들이면 홈 상단이 시끄러워진다. */
const FILL = [
  'var(--bg-subtle)',
  'color-mix(in srgb, var(--accent) 30%, var(--bg-subtle))',
  'color-mix(in srgb, var(--accent) 60%, var(--bg-subtle))',
  'var(--accent)',
]

const label = (date: string, count: number) => {
  const [y, m, d] = date.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일 · ${count === 0 ? '없음' : `${count}편`}`
}

/**
 * 달력 한 해(1월~12월)의 글쓰기 히트맵.
 *
 * 서버에서 그대로 그리고 툴팁은 네이티브 title 이라 클라이언트 JS 가 0이다.
 * 홈 맨 위에 있으니 무게를 더하면 안 된다.
 */
export function PostHeatmap({ dates }: { dates: string[] }) {
  // 올해에 글이 없으면 가장 최근 글이 있는 해를 보여준다. 빈 격자를 띄울 이유가 없다.
  const years = postYears(dates)
  const now = new Date().getUTCFullYear()
  const year = years.includes(now) ? now : (years[0] ?? now)

  const h = buildHeatmap(dates, year)
  const cols = h.weeks.length

  return (
    <section className="mb-8 border-b border-border pb-7">
      <p className="mb-3 text-[13px] text-fg-body">
        <span className="tabular-nums">{h.year}</span>년에{' '}
        <span className="font-semibold text-fg tabular-nums">{h.total}편</span>
        <span className="text-fg-muted"> · {h.activeDays}일에 씀</span>
        {h.maxStreak > 1 && <span className="text-fg-muted"> · 최장 {h.maxStreak}일 연속</span>}
      </p>

      {/*
        칸 크기를 고정하지 않고 컨테이너를 채운다. 고정하면 오른쪽에 여백이 남는다.
        좁은 화면에서는 칸이 너무 작아지므로 최소 폭부터 가로 스크롤로 넘긴다.
        rtl 로 두면 스크롤이 연말 쪽에서 시작한다.
      */}
      <div
        dir="rtl"
        className="overflow-x-auto pb-1 [scrollbar-width:thin]"
        role="img"
        aria-label={`${h.year}년 글쓰기 히트맵. 총 ${h.total}편을 ${h.activeDays}일에 걸쳐 썼습니다.`}
      >
        <div dir="ltr" style={{ minWidth: MIN_WIDTH }}>
          {/* 월 라벨도 같은 열 격자에 얹어야 칸 폭이 변해도 어긋나지 않는다 */}
          <div
            className="mb-1 grid text-[10px] text-fg-subtle"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: GAP }}
            aria-hidden="true"
          >
            {h.monthLabels.map((m) => (
              <span
                key={`${m.week}-${m.label}`}
                style={{ gridColumnStart: m.week + 1, gridRow: 1 }}
                className="whitespace-nowrap"
              >
                {m.label}
              </span>
            ))}
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GAP }}
          >
            {h.weeks.map((week, wi) => (
              <div key={wi} className="grid" style={{ rowGap: GAP }}>
                {week.map((day) => (
                  <span
                    key={day.date}
                    // 그 해가 아니거나 아직 오지 않은 날에는 툴팁을 달지 않는다
                    title={day.muted ? undefined : label(day.date, day.count)}
                    style={{ background: FILL[day.level] }}
                    className="aspect-square rounded-[2px]"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
