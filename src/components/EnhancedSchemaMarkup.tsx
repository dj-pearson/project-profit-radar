/**
 * Enhanced Schema Markup Component
 * Provides comprehensive structured data for better AI and search engine understanding
 */

import React from 'react';

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
          "name": "BuildDesk",
          "alternateName": "BuildDesk Construction Management",
          "url": "https://build-desk.com",
          "logo": {
            "@type": "ImageObject",
            "url": "https://build-desk.com/BuildDeskLogo.png",
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
            "telephone": "+1-800-BUILD-DESK",
            "contactType": "Customer Service",
            "availableLanguage": "English",
            "areaServed": "US"
          },
          "sameAs": [
            "https://linkedin.com/company/builddesk",
            "https://twitter.com/builddesk",
            "https://facebook.com/builddesk"
          ],
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Construction Management Software Plans",
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "SoftwareApplication",
                  "name": "BuildDesk Starter",
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
          "name": "BuildDesk Construction Management Software",
          "alternateName": "BuildDesk",
          "description": "Comprehensive construction management platform for small to medium contractors featuring job costing, project scheduling, mobile field management, and OSHA compliance.",
          "url": "https://build-desk.com",
          "applicationCategory": "BusinessApplication",
          "applicationSubCategory": "Construction Management Software",
          "operatingSystem": ["Web", "iOS", "Android"],
          "softwareVersion": "2025.1",
          "datePublished": "2023-01-01",
          "dateModified": new Date().toISOString().split('T')[0],
          "publisher": {
            "@type": "Organization",
            "name": "BuildDesk",
            "url": "https://build-desk.com"
          },
          "author": {
            "@type": "Organization",
            "name": "BuildDesk Development Team"
          },
          "offers": {
            "@type": "Offer",
            "price": "149",
            "priceCurrency": "USD",
            "priceValidUntil": "2025-12-31",
            "availability": "https://schema.org/InStock",
            "url": "https://build-desk.com/pricing",
            "seller": {
              "@type": "Organization",
              "name": "BuildDesk"
            },
            "hasFreeTrial": true,
            "trialLength": "P14D"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "247",
            "bestRating": "5",
            "worstRating": "1"
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
          "screenshot": "https://build-desk.com/screenshots/dashboard.png",
          "softwareHelp": {
            "@type": "CreativeWork",
            "url": "https://build-desk.com/knowledge-base"
          },
          "downloadUrl": "https://build-desk.com/download",
          "installUrl": "https://build-desk.com/auth"
        };

      case 'article':
        return data ? {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": data.title,
          "description": data.description,
          "image": data.image || "https://build-desk.com/BuildDeskLogo.png",
          "author": {
            "@type": "Organization",
            "name": "BuildDesk",
            "url": "https://build-desk.com"
          },
          "publisher": {
            "@type": "Organization",
            "name": "BuildDesk",
            "logo": {
              "@type": "ImageObject",
              "url": "https://build-desk.com/BuildDeskLogo.png"
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
            "name": "BuildDesk Construction Management Software"
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
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
