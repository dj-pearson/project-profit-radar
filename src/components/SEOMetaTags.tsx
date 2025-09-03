import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { getCleanCanonicalUrl, initializeSEOUrlHandling } from '@/utils/seoUtils';

interface SEOMetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: object;
}

export const SEOMetaTags: React.FC<SEOMetaTagsProps> = ({
  title = 'BuildDesk - Construction Management Platform',
  description = 'Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.',
  keywords = ['construction', 'project management', 'contractor software', 'building management', 'construction software'],
  ogTitle,
  ogDescription,
  ogImage = 'https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png',
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterSite = '@builddesk',
  twitterCreator = '@builddesk',
  canonicalUrl,
  noIndex = false,
  noFollow = false,
  structuredData
}) => {
  const siteUrl = 'https://builddesk.com';
  const fullTitle = title.includes('BuildDesk') ? title : `${title} | BuildDesk`;
  const finalOgTitle = ogTitle || fullTitle;
  const finalOgDescription = ogDescription || description;
  
  // Clean canonical URL - strip all query parameters to prevent duplicate indexing
  const cleanCanonicalUrl = canonicalUrl ? 
    `${siteUrl}${canonicalUrl.split('?')[0]}` : 
    getCleanCanonicalUrl() || siteUrl;
  
  const finalOgUrl = ogUrl || cleanCanonicalUrl;
  
  // Initialize SEO URL handling on component mount
  useEffect(() => {
    initializeSEOUrlHandling();
  }, []);
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="BuildDesk" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Canonical URL - always clean without parameters */}
      <link rel="canonical" href={cleanCanonicalUrl} />
      
      {/* Robots Meta */}
      <meta name="robots" content={`${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`} />
      
      {/* Google-specific parameter handling */}
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="google-site-verification" content="ignore-parameters:v,refreshed,timestamp" />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="BuildDesk" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#ff6b00" />
      <meta name="msapplication-TileColor" content="#ff6b00" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Industry-Specific Meta Tags */}
      <meta name="industry" content="Construction" />
      <meta name="target-audience" content="Construction Companies, Contractors, Project Managers" />
      <meta name="geo.region" content="US" />
      <meta name="geo.country" content="United States" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      <meta name="language" content="en" />
      
      {/* Apple Touch Icon */}
      <link rel="apple-touch-icon" href={ogImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

// Pre-built structured data for common page types
export const constructionSoftwareStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BuildDesk",
  "description": "Construction management software for small and medium contractors. Real-time job costing, mobile field management, OSHA compliance, and QuickBooks integration.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": ["Web", "iOS", "Android"],
  "url": "https://builddesk.com",
  "featureList": [
    "Real-time job costing",
    "Mobile field management", 
    "OSHA compliance automation",
    "QuickBooks integration",
    "Project scheduling",
    "Document management",
    "Team collaboration",
    "Financial reporting"
  ],
  "offers": {
    "@type": "Offer",
    "price": "149",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "149",
      "priceCurrency": "USD",
      "unitText": "MONTH"
    },
    "priceValidUntil": "2025-12-31"
  },
  "publisher": {
    "@type": "Organization",
    "name": "BuildDesk",
    "url": "https://builddesk.com"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "500",
    "bestRating": "5"
  },
  "author": {
    "@type": "Organization",
    "name": "BuildDesk",
    "url": "https://builddesk.com"
  }
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": ["Organization", "SoftwareCompany"],
  "name": "BuildDesk",
  "url": "https://builddesk.com",
  "logo": "https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png", 
  "description": "Construction management software for small and medium contractors",
  "foundingDate": "2024",
  "industry": "Construction Technology",
  "numberOfEmployees": "10-50",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-BUILDDESK",
    "contactType": "customer service",
    "areaServed": "US",
    "availableLanguage": "English"
  },
  "sameAs": [
    "https://linkedin.com/company/builddesk",
    "https://twitter.com/builddesk"
  ]
};

export const breadcrumbStructuredData = (items: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const faqStructuredData = (faqs: Array<{question: string, answer: string}>) => ({
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