import React from 'react';

interface VideoSEOProps {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string; // ISO 8601 format (PT1M30S for 1:30)
  contentUrl?: string;
  embedUrl?: string;
  publisher?: {
    name: string;
    logo: string;
  };
}

export const VideoSEOSchema: React.FC<VideoSEOProps> = ({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  contentUrl,
  embedUrl,
  publisher = {
    name: "BuildDesk",
    logo: "https://builddesk.com/logo.png"
  }
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    contentUrl,
    embedUrl,
    publisher: {
      "@type": "Organization",
      name: publisher.name,
      logo: {
        "@type": "ImageObject",
        url: publisher.logo
      }
    }
  };

  // Remove undefined properties
  Object.keys(schemaData).forEach(key => {
    if (schemaData[key as keyof typeof schemaData] === undefined) {
      delete schemaData[key as keyof typeof schemaData];
    }
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData)
      }}
    />
  );
};

interface WebPageSEOProps {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  breadcrumbs?: {
    name: string;
    url: string;
  }[];
  mainEntity?: object;
}

export const WebPageSEOSchema: React.FC<WebPageSEOProps> = ({
  title,
  description,
  url,
  datePublished,
  dateModified,
  breadcrumbs,
  mainEntity
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    breadcrumb: breadcrumbs ? {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    } : undefined,
    mainEntity,
    publisher: {
      "@type": "Organization",
      name: "BuildDesk",
      url: "https://builddesk.com",
      logo: {
        "@type": "ImageObject",
        url: "https://builddesk.com/logo.png"
      }
    }
  };

  // Remove undefined properties
  Object.keys(schemaData).forEach(key => {
    if (schemaData[key as keyof typeof schemaData] === undefined) {
      delete schemaData[key as keyof typeof schemaData];
    }
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData)
      }}
    />
  );
};

export default VideoSEOSchema;