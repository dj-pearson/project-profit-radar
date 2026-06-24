/**
 * useAutoSchema Hook
 *
 * Automatically generates and injects the appropriate JSON-LD structured data
 * for the current page based on the centralized SEO configuration.
 *
 * This ensures every page gets proper schema markup without manual configuration,
 * improving eligibility for:
 * - Google Rich Results (stars, FAQs, how-to snippets)
 * - AI Overviews (Gemini, ChatGPT, Perplexity)
 * - Knowledge Panels
 * - Voice search answers
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getSEOConfig, getBreadcrumbs, SITE_URL, COMPANY_INFO, SOFTWARE_INFO } from '@/config/seoConfig';

interface SchemaGraph {
  '@context': 'https://schema.org';
  '@graph': object[];
}

export function useAutoSchema(overrides?: {
  faqs?: Array<{ question: string; answer: string }>;
  howToSteps?: Array<{ name: string; text: string }>;
  articleDate?: string;
  articleModified?: string;
}): SchemaGraph | null {
  const location = useLocation();
  const path = location.pathname;

  return useMemo(() => {
    const config = getSEOConfig(path);
    if (!config) return null;

    const fullUrl = `${SITE_URL}${config.path}`;
    const graph: object[] = [];

    // Always add BreadcrumbList
    const breadcrumbs = getBreadcrumbs(path);
    if (breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${SITE_URL}${crumb.path}`,
        })),
      });
    }

    // Add WebPage for all pages
    graph.push({
      '@type': 'WebPage',
      '@id': fullUrl,
      url: fullUrl,
      name: config.title,
      description: config.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      ...(config.lastModified && { dateModified: config.lastModified }),
      inLanguage: 'en-US',
    });

    // Schema type-specific markup
    switch (config.schemaType) {
      case 'SoftwareApplication':
        graph.push({
          '@type': 'SoftwareApplication',
          name: SOFTWARE_INFO.name,
          applicationCategory: SOFTWARE_INFO.applicationCategory,
          operatingSystem: SOFTWARE_INFO.operatingSystem,
          url: fullUrl,
          description: config.description,
          offers: {
            '@type': 'Offer',
            price: SOFTWARE_INFO.price,
            priceCurrency: SOFTWARE_INFO.priceCurrency,
            priceValidUntil: '2027-12-31',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/pricing`,
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: SOFTWARE_INFO.ratingValue,
            bestRating: '5',
            worstRating: '1',
            reviewCount: SOFTWARE_INFO.reviewCount,
          },
          featureList: SOFTWARE_INFO.features,
          author: { '@id': `${SITE_URL}/#organization` },
        });
        break;

      case 'FAQPage':
        if (overrides?.faqs && overrides.faqs.length > 0) {
          graph.push({
            '@type': 'FAQPage',
            mainEntity: overrides.faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          });
        }
        break;

      case 'Article':
        graph.push({
          '@type': 'Article',
          headline: config.title,
          description: config.description,
          url: fullUrl,
          datePublished: overrides?.articleDate || config.lastModified || '2025-01-01',
          dateModified: overrides?.articleModified || config.lastModified || '2025-01-01',
          author: {
            '@type': 'Organization',
            name: COMPANY_INFO.name,
            url: COMPANY_INFO.url,
          },
          publisher: {
            '@type': 'Organization',
            name: COMPANY_INFO.name,
            logo: {
              '@type': 'ImageObject',
              url: COMPANY_INFO.logo,
            },
          },
          mainEntityOfPage: { '@id': fullUrl },
          inLanguage: 'en-US',
        });
        break;

      case 'HowTo':
        if (overrides?.howToSteps && overrides.howToSteps.length > 0) {
          graph.push({
            '@type': 'HowTo',
            name: config.title,
            description: config.description,
            step: overrides.howToSteps.map((step, index) => ({
              '@type': 'HowToStep',
              position: index + 1,
              name: step.name,
              text: step.text,
            })),
          });
        }
        break;

      case 'Product':
        graph.push({
          '@type': 'Product',
          name: config.title,
          description: config.description,
          brand: {
            '@type': 'Brand',
            name: COMPANY_INFO.name,
          },
          offers: {
            '@type': 'Offer',
            price: SOFTWARE_INFO.price,
            priceCurrency: SOFTWARE_INFO.priceCurrency,
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/pricing`,
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: SOFTWARE_INFO.ratingValue,
            reviewCount: SOFTWARE_INFO.reviewCount,
          },
        });
        break;

      case 'Organization':
        graph.push({
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
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
            telephone: COMPANY_INFO.telephone,
            email: COMPANY_INFO.email,
            areaServed: 'US',
            availableLanguage: 'English',
          },
        });
        break;
    }

    if (graph.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@graph': graph,
    };
  }, [path, overrides]);
}

export default useAutoSchema;
