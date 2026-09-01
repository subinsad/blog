import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { posts, postBySlug, relatedPosts, seriesNav } from '@/lib/content'
import { site, type Category } from '@/lib/site'
import { toCardData } from '@/lib/view-model'
import { formatDate, readingTime } from '@/lib/format'
import { MDXContent } from '@/components/mdx/MDXContent'
import { CategoryBadge, Tag } from '@/components/post/Badge'
import { Toc } from '@/components/post/Toc'
import { ReadingProgress } from '@/components/post/ReadingProgress'
import { PostCard } from '@/components/post/PostCard'
import { Comments } from '@/components/post/Comments'
import { Footer } from '@/components/layout/Footer'

export const dynamicParams = false

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = postBySlug(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      url: `${site.url}${post.permalink}`,
      publishedTime: post.date,
      modifiedTime: post.updated,
      tags: post.tags,
    },
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = postBySlug(slug)
  if (!post) notFound()

  const nav = seriesNav(post)
  const related = relatedPosts(post)

  return (
    <>
      <ReadingProgress />
      {/*
        좌·우 여백을 1fr로 동일하게 잡아 본문 720px이 화면 정중앙에 오게 한다.
        TOC를 flex 형제로 두면 본문이 왼쪽으로 밀린다. (DESIGN.md §3.5)
      */}
      <div className="mx-auto grid max-w-[var(--container)] grid-cols-[minmax(0,1fr)_minmax(0,720px)_minmax(0,1fr)] gap-8 px-[var(--gutter)] max-[1360px]:grid-cols-[minmax(0,1fr)] max-[1360px]:gap-0">
        <div aria-hidden className="max-[1360px]:hidden" />
        <div className="contents">
          <article className="w-full pt-14 pb-24 max-[1360px]:mx-auto max-[1360px]:max-w-[720px]">
            <header className="mb-7 border-b border-border pb-6">
              <CategoryBadge category={post.category as Category} />
              <h1 className="mt-3 text-[32px] leading-[1.35] font-bold tracking-[-0.02em] text-fg">
                {post.title}
              </h1>
              <p className="mt-3 text-[13px] text-fg-muted tabular-nums">
                {formatDate(post.date)} · {readingTime(post.metadata.readingTime)}
                {post.updated && ` · 수정 ${formatDate(post.updated)}`}
              </p>
              {post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.map((t) => (
                    <Link key={t} href={`/tags/${encodeURIComponent(t)}`}>
                      <Tag name={t} />
                    </Link>
                  ))}
                </div>
              )}
            </header>

            <details className="mb-8 rounded-lg border border-border p-4 min-[1360px]:hidden">
              <summary className="cursor-pointer text-[13px] font-medium text-fg-body">
                목차 보기
              </summary>
              <div className="mt-3">
                <Toc toc={post.toc} />
              </div>
            </details>

            <div className="prose">
              <MDXContent code={post.content} />
            </div>

            {nav && nav.meta && (
              <section className="mt-16 rounded-xl border border-border p-5">
                <p className="text-[13px] text-fg-muted">
                  시리즈{' '}
                  <Link href={`/series/${nav.meta.id}`} className="text-accent">
                    {nav.meta.title}
                  </Link>{' '}
                  <span className="tabular-nums">
                    {nav.index + 1}/{nav.list.length}
                  </span>
                </p>
                <div className="mt-3 flex justify-between gap-4 text-[15px]">
                  {nav.prev ? (
                    <Link href={nav.prev.permalink} className="text-fg hover:text-accent">
                      ← {nav.prev.title}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {nav.next && (
                    <Link
                      href={nav.next.permalink}
                      className="text-right text-fg hover:text-accent"
                    >
                      {nav.next.title} →
                    </Link>
                  )}
                </div>
              </section>
            )}

            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="mb-4 text-base font-bold text-fg">관련 글</h2>
                <div className="grid grid-cols-3 gap-4 max-[768px]:grid-cols-1">
                  {related.map(toCardData).map((p) => (
                    <PostCard key={p.slug} post={p} />
                  ))}
                </div>
              </section>
            )}

            <Comments />

            <Footer />
          </article>

          <aside className="sticky top-[88px] hidden h-fit w-[220px] pt-14 min-[1360px]:block">
            <Toc toc={post.toc} />
          </aside>
        </div>
      </div>
    </>
  )
}
