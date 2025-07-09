import { Helmet } from 'react-helmet-async';

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
  const finalOgUrl = ogUrl || (canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl);
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="BuildDesk" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={`${siteUrl}${canonicalUrl}`} />}
      
      {/* Robots Meta */}
      <meta name="robots" content={`${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`} />
      
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
  "description": "Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://builddesk.com",
  "offers": {
    "@type": "Offer",
    "price": "350",
    "priceCurrency": "USD",
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
    "ratingCount": "150"
  }
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "BuildDesk",
  "url": "https://builddesk.com",
  "logo": "https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/BuildDeskLogo.png",
  "description": "Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.",
  "sameAs": [
    "https://twitter.com/builddesk"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "areaServed": "US",
    "availableLanguage": "en"
  }
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