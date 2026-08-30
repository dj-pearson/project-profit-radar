/**
 * SEO Components Index
 *
 * Centralized exports for all SEO-related components.
 * Import from '@/components/seo' for clean imports.
 *
 * Usage:
 * import { ProgrammaticSEO, InternalLinking, InteractiveFAQ } from '@/components/seo';
 */

// Core SEO Components
export { PageSEO, createOrganizationSchema, createSoftwareApplicationSchema, createFAQSchema, createBreadcrumbSchema, createHowToSchema, createProductSchema, createArticleSchema, createWebPageSchema, createWebSiteSchema, createComparisonSchema } from './PageSEO';
export type { PageSEOProps } from './PageSEO';

export { ProgrammaticSEO } from './ProgrammaticSEO';
export type { ProgrammaticSEOProps } from './ProgrammaticSEO';

export { UnifiedSEOSystem } from './UnifiedSEOSystem';
export type { UnifiedSEOProps } from './UnifiedSEOSystem';

// Internal Linking Components
export { InternalLinking, ContextualLink, RelatedArticles, BreadcrumbTrail } from './InternalLinking';
export type { InternalLinkingProps, ContextualLinkProps, RelatedArticlesProps, BreadcrumbTrailProps } from './InternalLinking';

// FAQ Components
export { InteractiveFAQ, constructionSoftwareFAQs, pricingFAQs } from './InteractiveFAQ';
export type { FAQItem } from './InteractiveFAQ';

export { GEOOptimizedFAQ } from './GEOOptimizedFAQ';
export { GEOContentWrapper, GEOSection, GEOStatistic, GEOSourceCitation, GEOComparisonTable, GEOQuickQA } from './GEOContentWrapper';
export type { GEOContentWrapperProps, GEOSectionProps, GEOStatisticProps, GEOSourceCitationProps, GEOComparisonTableProps, GEOQuickQAProps, GEOComparisonRow } from './GEOContentWrapper';

// Schema Components
export { SaaSProductSchema } from './SaaSProductSchema';
// ./EnhancedSchemaMarkup ships the individual schema components; the combined
// `EnhancedSchemaMarkup` component lives at '@/components/EnhancedSchemaMarkup'.
export { FAQSchema, OrganizationSchema, SoftwareSchema, ArticleSchema } from './EnhancedSchemaMarkup';
export { AggregateRatingSchema } from './AggregateRatingSchema';
export { default as LocalSEOSchema, LocalBusinessSchema, ServiceAreaSchema } from './LocalSEOSchema';
export { VideoSEOSchema } from './VideoSEOSchema';
export { SiteSearchSchema } from './SiteSearchSchema';
export { HowToSchema } from './HowToSchema';

// SEO Utility Components
export { QuickAnswerSnippet, LastUpdated } from './QuickAnswerSnippet';
export { default as SEOCompatibilityLayer, EnhancedSEOMetaTags } from './SEOCompatibilityLayer';
export { DynamicSEOOptimizer } from './DynamicSEOOptimizer';

// The admin SEO dashboards were exported from here and mounted nowhere. They
// are gone (US-314): /admin/seo renders components/admin/SEOManager, and
// /admin/seo-management renders pages/UnifiedSEODashboard, which is what the
// /admin/seo-analytics and /seo-management redirects point at.

// Re-export configuration
export {
  getSEOConfig,
  getRelatedPages,
  getPagesByCategory,
  getSitemapPages,
  getBreadcrumbs,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  COMPANY_INFO,
  SOFTWARE_INFO,
  allSEOPages,
} from '@/config/seoConfig';
export type { SEOPageConfig, SEOCategory } from '@/config/seoConfig';
