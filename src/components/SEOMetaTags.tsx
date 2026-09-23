// Legacy SEOMetaTags component - now uses UnifiedSEOSystem for compatibility
// This ensures all existing pages continue to work without any code changes
import { SEOMetaTags as CompatibleSEOMetaTags } from './seo/SEOCompatibilityLayer';
import { COMPANY_INFO, SCHEMA_PRICE, getPriceValidUntil } from '@/config/seoConfig';

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
  "name": "Brikly Construction Management",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.",
  "offers": {
    "@type": "Offer",
    "price": SCHEMA_PRICE,
    "priceCurrency": "USD",
    "priceValidUntil": getPriceValidUntil()
  }
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Brikly",
  "url": "https://brikly.net",
  "logo": COMPANY_INFO.logo,
  "sameAs": [
    "https://linkedin.com/company/brikly",
    "https://twitter.com/brikly"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-BRIKLY",
    "contactType": "Customer Service"
  }
};

export default SEOMetaTags;