/**
 * Enhanced Schema Markup Component
 * Provides comprehensive structured data for better AI and search engine understanding
 */

import React from 'react';
import { jsonLdSafe } from '@/lib/security/jsonLd';

interface SchemaMarkupProps {
  type: 'organization' | 'software' | 'article' | 'faq' | 'review' | 'breadcrumb';
  data?: any;
}

export const EnhancedSchemaMarkup: React.FC<SchemaMarkupProps> = ({ type, data }) => {
  
  const getSchemaData = () => {
    switch (type) {
      case 'organization':
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Brikly",
          "alternateName": "Brikly Construction Management",
          "url": "https://brikly.net",
          "logo": {
            "@type": "ImageObject",
            "url": "https://brikly.net/BriklyLogo.png",
            "width": "400",
            "height": "400"
          },
          "description": "Construction management software designed for small to medium contractors. Real-time job costing, mobile field management, and OSHA compliance without enterprise complexity.",
          "foundingDate": "2023",
          "industry": "Construction Software",
          "numberOfEmployees": "11-50",
          "areaServed": {
            "@type": "Country",
            "name": "United States"
          },
          "serviceType": [
            "Construction Management Software",
            "Project Management Software",
            "Job Costing Software",
            "Field Management Tools"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+1-800-BRIKLY",
            "contactType": "Customer Service",
            "availableLanguage": "English",
            "areaServed": "US"
          },
          "sameAs": [
            "https://linkedin.com/company/brikly",
            "https://twitter.com/brikly",
            "https://facebook.com/brikly"
          ],
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Construction Management Software Plans",
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "SoftwareApplication",
                  "name": "Brikly Starter",
                  "applicationCategory": "Construction Management",
                  "operatingSystem": "Web, iOS, Android"
                },
                "price": "149",
                "priceCurrency": "USD",
                "priceSpecification": {
                  "@type": "UnitPriceSpecification",
                  "price": "149",
                  "priceCurrency": "USD",
                  "billingIncrement": "P1M"
                }
              }
            ]
          }
        };

      case 'software':
        return {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Brikly Construction Management Software",
          "alternateName": "Brikly",
          "description": "Comprehensive construction management platform for small to medium contractors featuring job costing, project scheduling, mobile field management, and OSHA compliance.",
          "url": "https://brikly.net",
          "applicationCategory": "BusinessApplication",
          "applicationSubCategory": "Construction Management Software",
          "operatingSystem": ["Web", "iOS", "Android"],
          "softwareVersion": "2025.1",
          "datePublished": "2023-01-01",
          "dateModified": new Date().toISOString().split('T')[0],
          "publisher": {
            "@type": "Organization",
            "name": "Brikly",
            "url": "https://brikly.net"
          },
          "author": {
            "@type": "Organization",
            "name": "Brikly Development Team"
          },
          "offers": {
            "@type": "Offer",
            "price": "149",
            "priceCurrency": "USD",
            "priceValidUntil": "2025-12-31",
            "availability": "https://schema.org/InStock",
            "url": "https://brikly.net/pricing",
            "seller": {
              "@type": "Organization",
              "name": "Brikly"
            },
            "hasFreeTrial": true,
            "trialLength": "P14D"
          },
          "featureList": [
            "Real-time job costing and budget tracking",
            "Mobile field management applications",
            "Project scheduling and timeline management",
            "OSHA compliance and safety management",
            "QuickBooks integration",
            "Subcontractor and vendor management",
            "Document management and photo documentation",
            "Client portals and communication tools",
            "Financial reporting and analytics",
            "Multi-project dashboard"
          ],
          "requirements": "Internet connection required. Mobile apps available for iOS and Android.",
          "screenshot": "https://brikly.net/screenshots/dashboard.png",
          "softwareHelp": {
            "@type": "CreativeWork",
            "url": "https://brikly.net/knowledge-base"
          },
          "downloadUrl": "https://brikly.net/download",
          "installUrl": "https://brikly.net/auth"
        };

      case 'article':
        return data ? {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": data.title,
          "description": data.description,
          "image": data.image || "https://brikly.net/BriklyLogo.png",
          "author": {
            "@type": "Organization",
            "name": "Brikly",
            "url": "https://brikly.net"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Brikly",
            "logo": {
              "@type": "ImageObject",
              "url": "https://brikly.net/BriklyLogo.png"
            }
          },
          "datePublished": data.publishedDate,
          "dateModified": data.modifiedDate || data.publishedDate,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": data.url
          },
          "articleSection": "Construction Management",
          "keywords": data.keywords?.join(", ") || "construction management, construction software, project management",
          "wordCount": data.wordCount,
          "timeRequired": data.readingTime ? `PT${data.readingTime}M` : undefined
        } : null;

      case 'faq':
        return data?.questions ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": data.questions.map((q: any) => ({
            "@type": "Question",
            "name": q.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": q.answer
            }
          }))
        } : null;

      case 'review':
        return data ? {
          "@context": "https://schema.org",
          "@type": "Review",
          "itemReviewed": {
            "@type": "SoftwareApplication",
            "name": "Brikly Construction Management Software"
          },
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": data.rating,
            "bestRating": "5"
          },
          "name": data.title,
          "author": {
            "@type": "Person",
            "name": data.authorName
          },
          "reviewBody": data.content,
          "datePublished": data.date
        } : null;

      case 'breadcrumb':
        return data?.items ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": data.items.map((item: any, index: number) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
          }))
        } : null;

      default:
        return null;
    }
  };

  const schemaData = getSchemaData();

  if (!schemaData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSafe(schemaData) }}
    />
  );
};

// Pre-built schema components for common use cases
export const OrganizationSchema = () => (
  <EnhancedSchemaMarkup type="organization" />
);

export const SoftwareSchema = () => (
  <EnhancedSchemaMarkup type="software" />
);

export const ArticleSchema: React.FC<{
  title: string;
  description: string;
  publishedDate: string;
  modifiedDate?: string;
  url: string;
  image?: string;
  keywords?: string[];
  wordCount?: number;
  readingTime?: number;
}> = (props) => (
  <EnhancedSchemaMarkup type="article" data={props} />
);

export const FAQSchema: React.FC<{
  questions: Array<{ question: string; answer: string }>;
}> = ({ questions }) => (
  <EnhancedSchemaMarkup type="faq" data={{ questions }} />
);

export const BreadcrumbSchema: React.FC<{
  items: Array<{ name: string; url: string }>;
}> = ({ items }) => (
  <EnhancedSchemaMarkup type="breadcrumb" data={{ items }} />
);

export default EnhancedSchemaMarkup;
