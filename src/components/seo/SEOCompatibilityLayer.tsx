import React from 'react';
import { UnifiedSEOSystem, UnifiedSEOProps } from './UnifiedSEOSystem';

/**
 * Compatibility layer for existing SEOMetaTags component
 * This ensures all existing code continues to work without changes
 */
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

/**
 * Drop-in replacement for SEOMetaTags that uses the new unified system
 * This allows existing pages to work without any code changes
 */
export const SEOMetaTags: React.FC<SEOMetaTagsProps> = (props) => {
  // Convert old props to new unified props
  const unifiedProps: UnifiedSEOProps = {
    ...props,
    autoOptimize: true, // Enable enterprise features by default
    enableAnalytics: true, // Enable analytics tracking
    competitorAnalysis: false // Conservative default
  };

  return <UnifiedSEOSystem {...unifiedProps} />;
};

/**
 * Enhanced SEO component with all enterprise features enabled
 * Use this for new pages that want full enterprise SEO capabilities
 */
export const EnhancedSEOMetaTags: React.FC<UnifiedSEOProps> = (props) => {
  const enhancedProps: UnifiedSEOProps = {
    autoOptimize: true,
    enableAnalytics: true,
    competitorAnalysis: true,
    ...props
  };

  return <UnifiedSEOSystem {...enhancedProps} />;
};

// Re-export for backward compatibility
export default SEOMetaTags;
