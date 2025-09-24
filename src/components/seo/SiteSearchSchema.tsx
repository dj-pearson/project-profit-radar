import React from 'react';

interface SiteSearchSchemaProps {
  searchUrl?: string;
  placeholder?: string;
}

export const SiteSearchSchema: React.FC<SiteSearchSchemaProps> = ({
  searchUrl = "https://builddesk.com/search?q={search_term_string}",
  placeholder = "Search construction management resources..."
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "BuildDesk",
    "url": "https://builddesk.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": searchUrl
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData)
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
        __html: JSON.stringify(schemaData)
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
  publisher = "BuildDesk"
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
        __html: JSON.stringify(schemaData)
      }}
    />
  );
};

export default SiteSearchSchema;