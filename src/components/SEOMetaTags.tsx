// Legacy SEOMetaTags component - now uses UnifiedSEOSystem for compatibility
// This ensures all existing pages continue to work without any code changes
import { SEOMetaTags as CompatibleSEOMetaTags } from './seo/SEOCompatibilityLayer';
import { BRIKLY_LOGO_URL } from '@/lib/utils';

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
  "applicationCategory": "Construction Management Software",
  "operatingSystem": "Web, iOS, Android",
  "description": "Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.",
  "offers": {
    "@type": "Offer",
    "price": "149",
    "priceCurrency": "USD"
  }
};

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Brikly",
  "url": "https://brikly.net",
  "logo": BRIKLY_LOGO_URL,
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