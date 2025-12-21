// Legacy SEOMetaTags component - now uses UnifiedSEOSystem for compatibility
// This ensures all existing pages continue to work without any code changes
import { SEOMetaTags as CompatibleSEOMetaTags } from './seo/SEOCompatibilityLayer';
import { BUILDDESK_LOGO_URL } from '@/lib/utils';

export interface SEOMetaTagsProps {
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

// Export the compatible version that uses the new unified system
export const SEOMetaTags = CompatibleSEOMetaTags;

// Re-export structured data for backward compatibility
export const constructionSoftwareStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BuildDesk Construction Management",
  "applicationCategory": "Construction Management Software",
  "operatingSystem": "Web, iOS, Android",
  "description": "Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.",
  "offers": {
    "@type": "Offer",
    "price": "149",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "247"
  }
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "BuildDesk",
  "url": "https://builddesk.com",
  "logo": BUILDDESK_LOGO_URL,
  "sameAs": [
    "https://linkedin.com/company/builddesk",
    "https://twitter.com/builddesk"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-BUILD-DESK",
    "contactType": "Customer Service"
  }
};

export default SEOMetaTags;