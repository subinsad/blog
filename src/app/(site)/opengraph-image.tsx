import { ImageResponse } from 'next/og'
import { site } from '@/lib/site'
import { loadOgFont, OG_SIZE, OG_COLORS } from '@/lib/og'

export const alt = site.name
export const size = OG_SIZE
export const contentType = 'image/png'

/** 홈·목록처럼 글이 아닌 화면의 기본 카드. */
export default async function Image() {
  const font = await loadOgFont(site.name + site.description)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: OG_COLORS.bg,
          fontFamily: 'Noto Sans KR',
          padding: '0 80px',
        }}
      >
        <div style={{ display: 'flex', width: 64, height: 8, background: '#748ffc' }} />
        <div
          style={{
            display: 'flex',
            color: OG_COLORS.fg,
            fontSize: 76,
            letterSpacing: '-0.03em',
            marginTop: 36,
          }}
        >
          {site.name}
        </div>
        <div
          style={{
            display: 'flex',
            color: OG_COLORS.muted,
            fontSize: 30,
            marginTop: 18,
          }}
        >
          {site.description}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Noto Sans KR', data: font, style: 'normal', weight: 700 }] },
  )
}
