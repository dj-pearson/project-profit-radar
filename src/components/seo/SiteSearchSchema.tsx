import React from 'react';
import { jsonLdSafe } from '@/lib/security/jsonLd';

interface SiteSearchSchemaProps {
  /**
   * Absolute urlTemplate for a routed search page, containing
   * {search_term_string}. There is no default: brikly.net has no /search
   * route, and a SearchAction pointing at one is broken structured data.
   * Without it only the WebSite entity is emitted.
   */
  searchUrl?: string;
  placeholder?: string;
}

export const SiteSearchSchema: React.FC<SiteSearchSchemaProps> = ({
  searchUrl,
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Brikly",
    "url": "https://brikly.net",
    ...(searchUrl
      ? {
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": searchUrl
            },
            "query-input": "required name=search_term_string"
          }
        }
      : {})
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLdSafe(schemaData)
      }}
    />
  );
};

interface BreadcrumbSchemaProps {
  items: {
    name: string;
    url: string;
  }[];
}

export const BreadcrumbSchema: React.FC<BreadcrumbSchemaProps> = ({ items }) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLdSafe(schemaData)
      }}
    />
  );
};

interface ReviewSchemaProps {
  itemName: string;
  reviewBody: string;
  reviewRating: number;
  reviewerName: string;
  datePublished: string;
  publisher?: string;
}

export const ReviewSchema: React.FC<ReviewSchemaProps> = ({
  itemName,
  reviewBody,
  reviewRating,
  reviewerName,
  datePublished,
  publisher = "Brikly"
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "SoftwareApplication",
      "name": itemName
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": reviewRating,
      "bestRating": 5
    },
    "author": {
      "@type": "Person",
      "name": reviewerName
    },
    "reviewBody": reviewBody,
    "datePublished": datePublished,
    "publisher": {
      "@type": "Organization", 
      "name": publisher
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLdSafe(schemaData)
      }}
    />
  );
};

export default SiteSearchSchema;