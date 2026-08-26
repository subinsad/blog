import { ImageResponse } from 'next/og'
import { postBySlug, posts } from '@/lib/content'
import { CATEGORY_DEFS } from '@/config/categories'
import { formatDate, readingTime } from '@/lib/format'
import { site } from '@/lib/site'
import { loadOgFont, OG_SIZE, OG_COLORS } from '@/lib/og'

export const alt = '글 미리보기'
export const size = OG_SIZE
export const contentType = 'image/png'

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = postBySlug(slug)
  if (!post) return new Response('Not found', { status: 404 })

  const meta = `${site.name}${post.category}${formatDate(post.date)} · ${readingTime(post.metadata.readingTime)}`
  const font = await loadOgFont(post.title + meta)

  // 다크 배경 위에 올라가므로 카테고리 색도 다크용을 쓴다
  const color =
    CATEGORY_DEFS.find((c) => c.name === post.category)?.dark ?? OG_COLORS.muted

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: OG_COLORS.bg,
          fontFamily: 'Noto Sans KR',
        }}
      >
        <div
          style={{ width: 10, height: '100%', flexShrink: 0, background: color, display: 'flex' }}
        />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '72px 80px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                color,
                fontSize: 26,
                letterSpacing: '0.02em',
                marginBottom: 28,
              }}
            >
              {post.category}
            </div>
            <div
              style={{
                display: 'flex',
                color: OG_COLORS.fg,
                fontSize: 60,
                lineHeight: 1.3,
                letterSpacing: '-0.02em',
                // Satori 는 line-clamp 가 없다. 세 줄 넘치면 잘리도록 높이를 제한한다.
                maxHeight: 60 * 1.3 * 3,
                overflow: 'hidden',
              }}
            >
              {post.title}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{ display: 'flex', height: 1, background: OG_COLORS.border, marginBottom: 24 }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: OG_COLORS.muted,
                fontSize: 24,
              }}
            >
              <div style={{ display: 'flex', color: OG_COLORS.fg }}>{site.name}</div>
              <div style={{ display: 'flex' }}>
                {formatDate(post.date)} · {readingTime(post.metadata.readingTime)}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Noto Sans KR', data: font, style: 'normal', weight: 700 }],
    },
  )
}
