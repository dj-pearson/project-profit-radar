/**
 * ProgrammaticSEO Component
 *
 * A high-performance SEO component that automatically manages:
 * - Meta tags (title, description, keywords)
 * - Open Graph tags for social sharing
 * - Twitter Card tags
 * - Canonical URLs
 * - Schema.org structured data
 * - Breadcrumb navigation schema
 *
 * Uses the centralized SEO configuration for consistent metadata
 * across all pages with minimal code duplication.
 */

import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import {
  getSEOConfig,
  getBreadcrumbs,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  COMPANY_INFO,
  SOFTWARE_INFO,
  type SEOPageConfig,
} from '@/config/seoConfig';

export interface ProgrammaticSEOProps {
  // Override config values if needed
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  noFollow?: boolean;

  // Additional schema objects to include
  additionalSchema?: object[];

  // Article-specific metadata
  articlePublishDate?: string;
  articleModifiedDate?: string;
  articleAuthor?: string;

  // Product-specific metadata
  productPrice?: string;
  productCurrency?: string;

  // Disable specific features
  disableBreadcrumbs?: boolean;
  disableOrganizationSchema?: boolean;
}

// Schema generators
const generateOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: COMPANY_INFO.name,
  url: COMPANY_INFO.url,
  logo: COMPANY_INFO.logo,
  description: COMPANY_INFO.description,
  foundingDate: COMPANY_INFO.foundingDate,
  address: COMPANY_INFO.address,
  sameAs: COMPANY_INFO.sameAs,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: COMPANY_INFO.email,
    areaServed: 'US',
    availableLanguage: 'English',
  },
});

const generateSoftwareApplicationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SOFTWARE_INFO.name,
  applicationCategory: SOFTWARE_INFO.applicationCategory,
  operatingSystem: SOFTWARE_INFO.operatingSystem,
  offers: {
    '@type': 'Offer',
    price: SOFTWARE_INFO.price,
    priceCurrency: SOFTWARE_INFO.priceCurrency,
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      billingDuration: SOFTWARE_INFO.billingPeriod,
      billingIncrement: 1,
    },
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: SOFTWARE_INFO.ratingValue,
    reviewCount: SOFTWARE_INFO.reviewCount,
    bestRating: '5',
    worstRating: '1',
  },
  featureList: SOFTWARE_INFO.features,
});

const generateWebPageSchema = (config: SEOPageConfig, url: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: config.title,
  description: config.description,
  url,
  publisher: {
    '@type': 'Organization',
    name: COMPANY_INFO.name,
    logo: COMPANY_INFO.logo,
  },
  ...(config.lastModified && { dateModified: config.lastModified }),
});

const generateArticleSchema = (
  config: SEOPageConfig,
  url: string,
  publishDate?: string,
  modifiedDate?: string,
  author?: string
) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: config.title,
  description: config.description,
  url,
  author: {
    '@type': 'Organization',
    name: author || COMPANY_INFO.name,
  },
  publisher: {
    '@type': 'Organization',
    name: COMPANY_INFO.name,
    logo: {
      '@type': 'ImageObject',
      url: COMPANY_INFO.logo,
    },
  },
  datePublished: publishDate || config.lastModified || new Date().toISOString(),
  dateModified: modifiedDate || config.lastModified || new Date().toISOString(),
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': url,
  },
});

const generateBreadcrumbSchema = (breadcrumbs: Array<{ name: string; path: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbs.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
});

export const ProgrammaticSEO: React.FC<ProgrammaticSEOProps> = ({
  title: overrideTitle,
  description: overrideDescription,
  keywords: overrideKeywords,
  canonicalUrl: overrideCanonical,
  ogImage: overrideOgImage,
  ogType: overrideOgType,
  noIndex: overrideNoIndex,
  noFollow: overrideNoFollow,
  additionalSchema = [],
  articlePublishDate,
  articleModifiedDate,
  articleAuthor,
  disableBreadcrumbs = false,
  disableOrganizationSchema = false,
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Get configuration from centralized config
  const config = useMemo(() => getSEOConfig(currentPath), [currentPath]);

  // Compute final values with overrides taking precedence
  const title = overrideTitle || config?.title || 'BuildDesk - Construction Management Software';
  const description = overrideDescription || config?.description || COMPANY_INFO.description;
  const keywords = overrideKeywords || config?.keywords || [];
  const canonicalUrl = overrideCanonical || `${SITE_URL}${currentPath}`;
  const ogImage = overrideOgImage || config?.heroImage || DEFAULT_OG_IMAGE;
  const ogType = overrideOgType || config?.ogType || 'website';
  const noIndex = overrideNoIndex ?? config?.noIndex ?? false;
  const noFollow = overrideNoFollow ?? false;

  // Generate robots meta content
  const robotsContent = `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`;

  // Get breadcrumbs
  const breadcrumbs = useMemo(
    () => (disableBreadcrumbs ? [] : getBreadcrumbs(currentPath)),
    [currentPath, disableBreadcrumbs]
  );

  // Generate schema based on page type
  const schemas = useMemo(() => {
    const schemaList: object[] = [];

    // Add organization schema (once per page, if not disabled)
    if (!disableOrganizationSchema) {
      schemaList.push(generateOrganizationSchema());
    }

    // Add breadcrumb schema
    if (breadcrumbs.length > 1) {
      schemaList.push(generateBreadcrumbSchema(breadcrumbs));
    }

    // Add page-specific schema
    if (config) {
      switch (config.schemaType) {
        case 'SoftwareApplication':
          schemaList.push(generateSoftwareApplicationSchema());
          break;
        case 'Article':
          schemaList.push(
            generateArticleSchema(
              config,
              canonicalUrl,
              articlePublishDate,
              articleModifiedDate,
              articleAuthor
            )
          );
          break;
        case 'WebPage':
        default:
          schemaList.push(generateWebPageSchema(config, canonicalUrl));
          break;
      }
    }

    // Add any additional schema objects
    schemaList.push(...additionalSchema);

    return schemaList;
  }, [
    config,
    canonicalUrl,
    breadcrumbs,
    articlePublishDate,
    articleModifiedDate,
    articleAuthor,
    additionalSchema,
    disableOrganizationSchema,
  ]);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <meta name="author" content={COMPANY_INFO.name} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={`${robotsContent}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={COMPANY_INFO.name} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@builddesk" />
      <meta name="twitter:creator" content="@builddesk" />

      {/* Article-specific tags */}
      {ogType === 'article' && articlePublishDate && (
        <>
          <meta property="article:published_time" content={articlePublishDate} />
          {articleModifiedDate && (
            <meta property="article:modified_time" content={articleModifiedDate} />
          )}
          <meta property="article:author" content={articleAuthor || COMPANY_INFO.name} />
        </>
      )}

      {/* JSON-LD Structured Data */}
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default ProgrammaticSEO;
