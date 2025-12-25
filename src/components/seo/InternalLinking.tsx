/**
 * InternalLinking Component
 *
 * Automatically generates internal link suggestions based on:
 * - Related pages from SEO configuration
 * - Page category relationships
 * - Content relevance scoring
 *
 * Benefits for SEO:
 * 1. Distributes link equity across the site
 * 2. Helps search engines discover and index content
 * 3. Improves user navigation and engagement
 * 4. Reduces bounce rate through relevant suggestions
 * 5. Establishes topical authority through content clusters
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getRelatedPages,
  getPagesByCategory,
  getSEOConfig,
  type SEOPageConfig,
  type SEOCategory,
} from '@/config/seoConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, Calculator, FileText, Scale, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// Category icons mapping
const categoryIcons: Record<SEOCategory, React.ComponentType<{ className?: string }>> = {
  core: Settings,
  features: Settings,
  industry: Users,
  comparison: Scale,
  resources: BookOpen,
  tools: Calculator,
  topics: FileText,
  legal: FileText,
  support: Users,
};

// Category display names
const categoryNames: Record<SEOCategory, string> = {
  core: 'Product',
  features: 'Features',
  industry: 'Industries',
  comparison: 'Comparisons',
  resources: 'Resources',
  tools: 'Free Tools',
  topics: 'Learning',
  legal: 'Legal',
  support: 'Support',
};

export interface InternalLinkingProps {
  /**
   * Number of related pages to show
   */
  maxLinks?: number;

  /**
   * Visual style variant
   */
  variant?: 'cards' | 'list' | 'inline' | 'sidebar';

  /**
   * Custom title for the section
   */
  title?: string;

  /**
   * Show category badges
   */
  showCategories?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Override related pages (uses auto-detected if not provided)
   */
  pages?: SEOPageConfig[];

  /**
   * Filter by specific category
   */
  filterCategory?: SEOCategory;
}

export const InternalLinking: React.FC<InternalLinkingProps> = ({
  maxLinks = 4,
  variant = 'cards',
  title = 'Related Resources',
  showCategories = true,
  className,
  pages: overridePages,
  filterCategory,
}) => {
  const location = useLocation();

  // Get related pages based on current path
  const relatedPages = useMemo(() => {
    if (overridePages) {
      return overridePages.slice(0, maxLinks);
    }

    // First try to get explicitly related pages from config
    let pages = getRelatedPages(location.pathname, maxLinks);

    // If we have a category filter, filter by that
    if (filterCategory) {
      pages = getPagesByCategory(filterCategory)
        .filter(p => p.path !== location.pathname)
        .slice(0, maxLinks);
    }

    // If no explicit relations, get pages from the same category
    if (pages.length === 0) {
      const currentPage = getSEOConfig(location.pathname);
      if (currentPage) {
        pages = getPagesByCategory(currentPage.category)
          .filter(p => p.path !== location.pathname)
          .slice(0, maxLinks);
      }
    }

    return pages;
  }, [location.pathname, maxLinks, overridePages, filterCategory]);

  if (relatedPages.length === 0) {
    return null;
  }

  // Render variants
  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {relatedPages.map((page) => (
          <Link
            key={page.path}
            to={page.path}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline"
          >
            {page.title.split(' | ')[0].split(' - ')[0]}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        {title && <h3 className="font-semibold text-lg mb-3">{title}</h3>}
        <ul className="space-y-2">
          {relatedPages.map((page) => {
            const Icon = categoryIcons[page.category];
            return (
              <li key={page.path}>
                <Link
                  to={page.path}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="flex-1 text-sm group-hover:text-primary">
                    {page.title.split(' | ')[0].split(' - ')[0]}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <aside className={cn('space-y-4', className)}>
        {title && <h3 className="font-semibold text-lg">{title}</h3>}
        <div className="space-y-3">
          {relatedPages.map((page) => {
            const Icon = categoryIcons[page.category];
            return (
              <Link
                key={page.path}
                to={page.path}
                className="block p-3 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary">
                      {page.title.split(' | ')[0].split(' - ')[0]}
                    </h4>
                    {showCategories && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {categoryNames[page.category]}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>
    );
  }

  // Default: cards variant
  return (
    <section className={cn('py-8', className)}>
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {relatedPages.map((page) => {
          const Icon = categoryIcons[page.category];
          return (
            <Card key={page.path} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  {showCategories && (
                    <Badge variant="outline" className="text-xs">
                      {categoryNames[page.category]}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-3 line-clamp-2 group-hover:text-primary transition-colors">
                  <Link to={page.path}>
                    {page.title.split(' | ')[0].split(' - ')[0]}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2 text-sm">
                  {page.description}
                </CardDescription>
                <Link
                  to={page.path}
                  className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
                >
                  Learn more <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

/**
 * Contextual Link Component
 *
 * Renders a styled internal link with optional context/description.
 * Useful for inline content linking with visual emphasis.
 */
export interface ContextualLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

export const ContextualLink: React.FC<ContextualLinkProps> = ({
  to,
  children,
  className,
  showIcon = true,
}) => {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1 text-primary font-medium hover:underline',
        className
      )}
    >
      {children}
      {showIcon && <ArrowRight className="h-3 w-3" />}
    </Link>
  );
};

/**
 * Related Articles Component
 *
 * Displays related articles/resources at the end of content pages.
 */
export interface RelatedArticlesProps {
  title?: string;
  maxArticles?: number;
  className?: string;
}

export const RelatedArticles: React.FC<RelatedArticlesProps> = ({
  title = 'Continue Reading',
  maxArticles = 3,
  className,
}) => {
  const location = useLocation();

  const articles = useMemo(() => {
    // Get related pages, preferring resources and articles
    const currentPage = getSEOConfig(location.pathname);
    const relatedPaths = currentPage?.relatedPages || [];

    // Get related pages that are articles/resources
    const related = relatedPaths
      .map(path => getSEOConfig(path))
      .filter((page): page is SEOPageConfig =>
        page !== undefined &&
        (page.category === 'resources' || page.schemaType === 'Article')
      )
      .slice(0, maxArticles);

    // If not enough related articles, get from resources category
    if (related.length < maxArticles) {
      const resourcePages = getPagesByCategory('resources')
        .filter(p => p.path !== location.pathname && !relatedPaths.includes(p.path))
        .slice(0, maxArticles - related.length);
      related.push(...resourcePages);
    }

    return related;
  }, [location.pathname, maxArticles]);

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className={cn('py-8 border-t', className)}>
      <h2 className="text-xl font-bold mb-6">{title}</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {articles.map((article) => (
          <article key={article.path} className="group">
            <Link to={article.path} className="block">
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {article.title.split(' | ')[0].split(' - ')[0]}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {article.description}
              </p>
              <span className="inline-flex items-center gap-1 mt-2 text-sm text-primary">
                Read article <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};

/**
 * Breadcrumb Trail Component
 *
 * Renders breadcrumb navigation with schema.org markup.
 */
export interface BreadcrumbTrailProps {
  className?: string;
  separator?: React.ReactNode;
}

export const BreadcrumbTrail: React.FC<BreadcrumbTrailProps> = ({
  className,
  separator = '/',
}) => {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const page = getSEOConfig(location.pathname);
    if (!page) {
      return [{ name: 'Home', path: '/' }];
    }

    // Use custom breadcrumbs if defined
    if (page.breadcrumbs) {
      return [{ name: 'Home', path: '/' }, ...page.breadcrumbs];
    }

    // Auto-generate based on path
    const crumbs = [{ name: 'Home', path: '/' }];
    const pathParts = location.pathname.split('/').filter(Boolean);

    if (pathParts.length > 0) {
      // Add category breadcrumb
      if (page.category === 'resources' && pathParts[0] === 'resources') {
        crumbs.push({ name: 'Resources', path: '/resources' });
      } else if (page.category === 'topics' && pathParts[0] === 'topics') {
        crumbs.push({ name: 'Topics', path: '/blog' });
      } else if (page.category === 'features' && pathParts[0] === 'features') {
        crumbs.push({ name: 'Features', path: '/features' });
      }

      // Add current page
      crumbs.push({
        name: page.title.split(' | ')[0].split(' - ')[0],
        path: location.pathname,
      });
    }

    return crumbs;
  }, [location.pathname]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('mb-4', className)}>
      <ol className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-muted-foreground/50">{separator}</span>
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {crumb.name}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-primary transition-colors truncate max-w-[150px]"
              >
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default InternalLinking;
