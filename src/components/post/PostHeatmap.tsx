import { buildHeatmap } from '@/lib/heatmap'

const WEEKDAY = ['', '월', '', '수', '', '금', '']
const CELL = 11
const GAP = 3

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
 * 최근 1년 글쓰기 히트맵. 서버에서 그대로 그리고 툴팁은 네이티브 title 이라
 * 클라이언트 JS 가 0이다. 홈 맨 위에 있으니 무게를 더하면 안 된다.
 */
export function PostHeatmap({ dates }: { dates: string[] }) {
  const h = buildHeatmap(dates)
  const width = h.weeks.length * (CELL + GAP)

  return (
    <section className="mb-8 border-b border-border pb-7">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13px] text-fg-body">
          지난 1년 동안 <span className="font-semibold text-fg tabular-nums">{h.total}편</span>
          <span className="text-fg-muted"> · {h.activeDays}일에 씀</span>
          {h.maxStreak > 1 && (
            <span className="text-fg-muted"> · 최장 {h.maxStreak}일 연속</span>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
          적음
          {FILL.map((bg, i) => (
            <span key={i} style={{ background: bg }} className="size-[10px] rounded-[2px]" />
          ))}
          많음
        </div>
      </div>

      <div className="flex gap-1.5">
        {/* 요일 라벨은 스크롤 밖에 둔다. 안에 두면 최근 주로 스크롤됐을 때 밀려 사라진다. */}
        <div
          className="flex shrink-0 flex-col text-[9px] text-fg-subtle"
          style={{ gap: GAP, paddingTop: 14 }}
          aria-hidden="true"
        >
          {WEEKDAY.map((d, i) => (
            <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>
              {d}
            </span>
          ))}
        </div>

        {/*
          좁은 화면에서 가로로 넘칠 때 최근 주가 먼저 보여야 한다.
          컨테이너를 rtl 로 두면 스크롤이 오른쪽 끝에서 시작한다.
        */}
        <div
          dir="rtl"
          className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:thin]"
          role="img"
          aria-label={`최근 1년 글쓰기 히트맵. 총 ${h.total}편을 ${h.activeDays}일에 걸쳐 썼습니다.`}
        >
          <div dir="ltr" style={{ width }}>
            <div className="relative mb-1 h-[10px]" aria-hidden="true">
              {h.monthLabels.map((m) => (
                <span
                  key={`${m.week}-${m.label}`}
                  className="absolute top-0 text-[10px] whitespace-nowrap text-fg-subtle"
                  style={{ left: m.week * (CELL + GAP) }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex" style={{ gap: GAP }}>
              {h.weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((day) =>
                    day.blank ? (
                      <span key={day.date} style={{ width: CELL, height: CELL }} />
                    ) : (
                      <span
                        key={day.date}
                        title={label(day.date, day.count)}
                        style={{ width: CELL, height: CELL, background: FILL[day.level] }}
                        className="rounded-[2px]"
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
