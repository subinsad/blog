import { posts } from '@/lib/content'
import { site } from '@/lib/site'

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const dynamic = 'force-static'

export function GET() {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${site.url}${p.permalink}</link>
      <guid isPermaLink="true">${site.url}${p.permalink}</guid>
      <description>${escape(p.summary)}</description>
      <category>${escape(p.category)}</category>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    </item>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(site.title)}</title>
    <link>${site.url}</link>
    <description>${escape(site.description)}</description>
    <language>ko</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
