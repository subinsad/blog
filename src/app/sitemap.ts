import type { MetadataRoute } from 'next'
import { posts, seriesList } from '@/lib/content'
import { site, CATEGORIES, CATEGORY_META } from '@/lib/site'
import { tagCounts } from '@/lib/content'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: site.url, lastModified: now, priority: 1 },
    { url: `${site.url}/posts`, lastModified: now, priority: 0.8 },
    { url: `${site.url}/categories`, lastModified: now, priority: 0.6 },
    { url: `${site.url}/about`, lastModified: now, priority: 0.4 },
    ...posts.map((p) => ({
      url: `${site.url}${p.permalink}`,
      lastModified: new Date(p.updated ?? p.date),
      priority: 0.7,
    })),
    ...CATEGORIES.map((c) => ({
      url: `${site.url}/categories/${CATEGORY_META[c].slug}`,
      lastModified: now,
      priority: 0.5,
    })),
    ...seriesList.map((s) => ({
      url: `${site.url}/series/${s.id}`,
      lastModified: now,
      priority: 0.5,
    })),
    ...tagCounts().map(([tag]) => ({
      url: `${site.url}/tags/${encodeURIComponent(tag)}`,
      lastModified: now,
      priority: 0.3,
    })),
  ]
}
