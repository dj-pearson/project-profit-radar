/**
 * PageSEO Component - Comprehensive SEO for all pages
 * Implements both Traditional SEO and GEO (Generative Engine Optimization)
 *
 * Usage:
 * <PageSEO
 *   title="Your Page Title"
 *   description="Your meta description"
 *   keywords={['keyword1', 'keyword2']}
 *   schema={[/* schema objects *\/]}
 * />
 */

import React from 'react';
import { jsonLdSafe } from '@/lib/security/jsonLd';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { BRIKLY_LOGO_URL } from '@/lib/utils';

export interface PageSEOProps {
  // Basic SEO
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;

  // Open Graph / Social
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';

  // Twitter
  twitterCard?: 'summary' | 'summary_large_image';

  // Structured Data
  schema?: object[];

  // Indexing
  noIndex?: boolean;
  noFollow?: boolean;

  // Page-specific
  lastModified?: string;
  author?: string;
  articlePublishDate?: string;
}

export const PageSEO: React.FC<PageSEOProps> = ({
  title,
  description,
  keywords = [],
  canonicalUrl,
  ogImage = BRIKLY_LOGO_URL,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  schema = [],
  noIndex = false,
  noFollow = false,
  lastModified,
  author = 'Brikly',
  articlePublishDate
}) => {
  const location = useLocation();

  // Construct full URL
  const baseUrl = 'https://brikly.net';
  const fullUrl = canonicalUrl || `${baseUrl}${location.pathname}`;

  // Robots meta tag
  const robotsContent = `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`;

  // Full title with branding
  const fullTitle = title.includes('Brikly')
    ? title
    : `${title} | Brikly`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      <meta name="author" content={author} />
      <link rel="canonical" href={fullUrl} />
      <meta name="robots" content={robotsContent} />

      {/* Last Modified */}
      {lastModified && (
        <meta name="last-modified" content={lastModified} />
      )}

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Brikly" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@brikly" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Article-specific tags */}
      {articlePublishDate && (
        <>
          <meta property="article:published_time" content={articlePublishDate} />
          <meta property="article:author" content={author} />
        </>
      )}

      {/* Content freshness signal for AI search engines */}
      {lastModified && (
        <meta property="article:modified_time" content={lastModified} />
      )}

      {/* Structured Data (JSON-LD) */}
      {schema.length > 0 && schema.map((schemaObj, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(schemaObj) }}
        />
      ))}
    </Helmet>
  );
};

/**
 * Schema Generator Utilities
 */

export const createOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Brikly",
  "url": "https://brikly.net",
  "logo": "https://brikly.net/logo.png",
  "description": "Construction management software for small and mid-size contractors in the United States.",
  "foundingDate": "2024",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "US"
  },
  "sameAs": [
    "https://linkedin.com/company/brikly",
    "https://twitter.com/brikly"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "areaServed": "US",
    "availableLanguage": "English"
  }
});

export const createSoftwareApplicationSchema = (additionalProps?: object) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Brikly",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "350",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "billingDuration": "P1M",
      "billingIncrement": 1
    }
  },
  "featureList": [
    "Real-time job costing",
    "Mobile crew tracking",
    "Daily progress reports",
    "OSHA compliance reporting",
    "QuickBooks integration",
    "Project scheduling",
    "Change order management",
    "Client portal"
  ],
  ...additionalProps
});

export const createFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

export const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const createHowToSchema = (
  name: string,
  steps: Array<{ name: string; text: string; image?: string }>
) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": name,
  "step": steps.map((step, index) => ({
    "@type": "HowToStep",
    "position": index + 1,
    "name": step.name,
    "text": step.text,
    ...(step.image && { image: step.image })
  }))
});

export const createProductSchema = (
  name: string,
  description: string,
  price: string,
  additionalProps?: object
) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": name,
  "description": description,
  "brand": {
    "@type": "Brand",
    "name": "Brikly"
  },
  "offers": {
    "@type": "Offer",
    "price": price,
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://brikly.net/pricing"
  },
  ...additionalProps
});

export const createArticleSchema = (
  headline: string,
  description: string,
  datePublished: string,
  dateModified: string,
  author: string = "Brikly Team"
) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": headline,
  "description": description,
  "author": {
    "@type": "Organization",
    "name": author
  },
  "publisher": {
    "@type": "Organization",
    "name": "Brikly",
    "logo": {
      "@type": "ImageObject",
      "url": "https://brikly.net/logo.png"
    }
  },
  "datePublished": datePublished,
  "dateModified": dateModified
});

export const createWebPageSchema = (
  name: string,
  description: string,
  url: string
) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": name,
  "description": description,
  "url": url,
  "publisher": {
    "@type": "Organization",
    "name": "Brikly"
  }
});

/**
 * WebSite Schema with SearchAction
 * Required for sitelinks search box in Google and AI search engines
 */
export const createWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Brikly",
  "url": "https://brikly.net",
  "description": "Construction management software for small and mid-size contractors. Real-time job costing, mobile crew tracking, and OSHA compliance.",
  "publisher": {
    "@type": "Organization",
    "name": "Brikly"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://brikly.net/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
});

/**
 * Comparison/ItemList Schema for "vs" pages
 * AI engines heavily favor structured comparison data
 */
export const createComparisonSchema = (
  title: string,
  products: Array<{ name: string; description: string; price: string; url?: string }>
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": title,
  "itemListElement": products.map((product, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "SoftwareApplication",
      "name": product.name,
      "description": product.description,
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "USD"
      },
      ...(product.url && { "url": product.url })
    }
  }))
});

export default PageSEO;
