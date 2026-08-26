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
 * 연도 전환을 라디오 + CSS 로 한다.
 *
 * 상태를 클라이언트에 두면 홈 맨 위에 JS 가 생긴다. 연도가 몇 개 안 되므로
 * 전부 서버에서 그려두고 보이는 것만 CSS 로 고른다.
 */
function switcherCss(years: number[]): string {
  return years
    .map(
      (y) =>
        `.hm:has(#hmy-${y}:checked) [data-hm="${y}"]{display:block}` +
        `.hm:has(#hmy-${y}:checked) label[for="hmy-${y}"]{background:var(--accent);color:#fff}`,
    )
    .join('')
}

/**
 * 달력 한 해(1월~12월)의 글쓰기 히트맵.
 *
 * 서버에서 그대로 그리고 툴팁은 네이티브 title 이라 클라이언트 JS 가 0이다.
 * 홈 맨 위에 있으니 무게를 더하면 안 된다.
 */
export function PostHeatmap({ dates }: { dates: string[] }) {
  const years = postYears(dates)
  const now = new Date().getUTCFullYear()
  if (years.length === 0) years.push(now)
  // 올해에 글이 없어도 목록에는 올린다. 빈 해를 고를 수 있어야 이상하지 않다.
  if (!years.includes(now) && now > years[0]) years.unshift(now)

  const maps = years.map((y) => buildHeatmap(dates, y))

  return (
    <section className="hm mb-8 border-b border-border pb-7">
      <style dangerouslySetInnerHTML={{ __html: switcherCss(years) }} />

      {years.map((y, i) => (
        <input
          key={y}
          type="radio"
          name="heatmap-year"
          id={`hmy-${y}`}
          defaultChecked={i === 0}
          className="sr-only"
        />
      ))}

      <div className="hm-body flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {maps.map((h) => (
            <div key={h.year} data-hm={h.year} className="hidden">
              <p className="mb-3 text-[13px] text-fg-body">
                <span className="tabular-nums">{h.year}</span>년에{' '}
                <span className="font-semibold text-fg tabular-nums">{h.total}편</span>
                <span className="text-fg-muted"> · {h.activeDays}일에 씀</span>
                {h.maxStreak > 1 && (
                  <span className="text-fg-muted"> · 최장 {h.maxStreak}일 연속</span>
                )}
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
                    style={{
                      gridTemplateColumns: `repeat(${h.weeks.length}, minmax(0, 1fr))`,
                      columnGap: GAP,
                    }}
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
                    style={{
                      gridTemplateColumns: `repeat(${h.weeks.length}, minmax(0, 1fr))`,
                      gap: GAP,
                    }}
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
            </div>
          ))}
        </div>

        <div
          role="radiogroup"
          aria-label="연도 선택"
          className="flex w-[66px] shrink-0 flex-col gap-1 pt-6"
        >
          {years.map((y) => (
            <label
              key={y}
              htmlFor={`hmy-${y}`}
              className="cursor-pointer rounded-lg px-2.5 py-1.5 text-center text-[13px] text-fg-muted transition-colors tabular-nums hover:bg-bg-hover"
            >
              {y}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
