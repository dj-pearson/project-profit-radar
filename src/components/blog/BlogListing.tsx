/**
 * Building blocks for the public blog index and category pages (US-384).
 */
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Clock, Rss, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { blogPostPath } from './blogPaths';
import {
  BLOG_CATEGORIES,
  categoryPath,
  listingPath,
  pageWindow,
  RSS_FEED_PATH,
  SITE_ORIGIN,
  type BlogListingPost,
  type CuratedGuide,
} from './blogListing';

const storageUrl = (url: string | null) =>
  url?.replace(/https?:\/\/[a-z0-9]+\.supabase\.co\/storage\//gi, 'https://api.brikly.net/storage/') ?? null;

export function ArticleCard({ post }: { post: BlogListingPost }) {
  const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const imageUrl = storageUrl(post.featured_image_url);
  const href = blogPostPath(post.slug);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {imageUrl && (
        <div className="aspect-video overflow-hidden">
          <img src={imageUrl} alt="" width={640} height={360} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">Article</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <time dateTime={post.published_at || post.created_at}>{formattedDate}</time>
          </span>
        </div>
        <CardTitle className="text-lg leading-tight">
          <Link to={href} className="hover:text-primary transition-colors">
            {post.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3">{post.excerpt || post.seo_description || ''}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <Button asChild variant="outline" className="w-full">
          <Link to={href} aria-label={`Read ${post.title}`}>
            Read Article <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CuratedGuideCard({ guide }: { guide: CuratedGuide }) {
  const href = blogPostPath(guide.slug);
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{guide.label}</Badge>
        </div>
        <CardTitle className="text-lg leading-tight">
          <Link to={href} className="hover:text-primary transition-colors">
            {guide.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3">{guide.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" aria-hidden="true" />
            <span>{guide.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{guide.readTime}</span>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to={href} aria-label={`Read ${guide.title}`}>
            Read Guide <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Plain <a href> links (react-router Link renders one) so crawlers can walk
 * every page, plus rel=prev/next both on the links and in <head>.
 */
export function BlogPagination({ basePath, page, totalPages }: { basePath: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? listingPath(basePath, page - 1) : null;
  const next = page < totalPages ? listingPath(basePath, page + 1) : null;

  return (
    <>
      <Helmet>
        {prev && <link rel="prev" href={`${SITE_ORIGIN}${prev}`} />}
        {next && <link rel="next" href={`${SITE_ORIGIN}${next}`} />}
      </Helmet>
      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 mt-10">
        {prev ? (
          <Button asChild variant="outline" size="sm">
            <Link to={prev} rel="prev">
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Newer
            </Link>
          </Button>
        ) : null}
        <ul className="flex items-center gap-1">
          {pageWindow(page, totalPages).map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} className="px-2 text-muted-foreground" aria-hidden="true">
                ...
              </li>
            ) : (
              <li key={p}>
                <Link
                  to={listingPath(basePath, p)}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                  className={cn(
                    'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm',
                    p === page ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted',
                  )}
                >
                  {p}
                </Link>
              </li>
            ),
          )}
        </ul>
        {next ? (
          <Button asChild variant="outline" size="sm">
            <Link to={next} rel="next">
              Older <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </nav>
    </>
  );
}

export function BlogCategoryNav({ current }: { current?: string }) {
  return (
    <nav aria-label="Article topics" className="mb-10">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            to="/resources"
            aria-current={current ? undefined : 'page'}
            className={cn(
              'inline-flex rounded-full border px-3 py-1 text-sm',
              current ? 'hover:bg-muted' : 'bg-primary text-primary-foreground border-primary',
            )}
          >
            All articles
          </Link>
        </li>
        {BLOG_CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              to={categoryPath(c.slug)}
              aria-current={current === c.slug ? 'page' : undefined}
              className={cn(
                'inline-flex rounded-full border px-3 py-1 text-sm',
                current === c.slug ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
              )}
            >
              {c.name}
            </Link>
          </li>
        ))}
        <li>
          <a
            href={RSS_FEED_PATH}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-muted"
          >
            <Rss className="h-3.5 w-3.5" aria-hidden="true" /> RSS
          </a>
        </li>
      </ul>
    </nav>
  );
}

/** Advertises the feed to readers and crawlers from every listing page. */
export function RssAlternateLink() {
  return (
    <Helmet>
      <link rel="alternate" type="application/rss+xml" title="Brikly Resources" href={`${SITE_ORIGIN}${RSS_FEED_PATH}`} />
    </Helmet>
  );
}

export function ArticleGrid({ posts }: { posts: BlogListingPost[] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <ArticleCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export function ArticleGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading articles">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-64 rounded-lg" />
      ))}
    </div>
  );
}
