import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BUILDDESK_LOGO_URL } from '@/lib/utils';

export interface UnifiedSEOProps {
  // Allow manual override (existing pattern)
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
  
  // New enterprise features
  autoOptimize?: boolean;
  enableAnalytics?: boolean;
  competitorAnalysis?: boolean;
}

interface ExistingSEOConfig {
  page_path: string;
  title?: string;
  description?: string;
  keywords?: string[];
  og_title?: string;
  og_description?: string;
  og_image?: string;
  canonical_url?: string;
  no_index?: boolean;
  no_follow?: boolean;
  schema_markup?: any;
}

export const UnifiedSEOSystem: React.FC<UnifiedSEOProps> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage = BUILDDESK_LOGO_URL,
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterSite = '@builddesk',
  twitterCreator = '@builddesk',
  canonicalUrl,
  noIndex = false,
  noFollow = false,
  structuredData,
  autoOptimize = true,
  enableAnalytics = true,
  competitorAnalysis = false
}) => {
  const location = useLocation();
  const [dbConfig, setDbConfig] = useState<ExistingSEOConfig | null>(null);
  const [enterpriseConfig, setEnterpriseConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSEOConfig = async () => {
      try {
        setIsLoading(true);
        
        // 1. First, try to get existing SEO config from database
        const { data: existingConfig, error: metaError } = await supabase
          .from('seo_meta_tags')
          .select('*')
          .eq('page_path', location.pathname)
          .maybeSingle();

        if (metaError && metaError.code !== 'PGRST116') {
          console.warn('SEO meta fetch warning:', metaError.message);
        }

        if (existingConfig) {
          setDbConfig(existingConfig);
        }

        // 2. If auto-optimize is enabled, enhance with enterprise features
        if (autoOptimize) {
          const enhancedConfig = await generateEnterpriseEnhancements(
            location.pathname,
            existingConfig
          );
          setEnterpriseConfig(enhancedConfig);
        }

      } catch (error) {
        console.error('Error loading SEO config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSEOConfig();
  }, [location.pathname, autoOptimize]);

  // Priority system for SEO values (manual props > db config > enterprise config > defaults)
  const getFinalValue = (
    manualValue: any, 
    dbValue: any, 
    enterpriseValue: any, 
    defaultValue: any
  ) => {
    return manualValue || dbValue || enterpriseValue || defaultValue;
  };

  // Determine final values using priority system
  const siteUrl = 'https://builddesk.com';
  const finalTitle = getFinalValue(
    title,
    dbConfig?.title,
    enterpriseConfig?.title,
    'BuildDesk - Construction Management Platform'
  );
  
  const finalDescription = getFinalValue(
    description,
    dbConfig?.description,
    enterpriseConfig?.description,
    'Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.'
  );

  const finalKeywords = getFinalValue(
    keywords,
    dbConfig?.keywords,
    enterpriseConfig?.keywords,
    ['construction', 'project management', 'contractor software']
  );

  const finalCanonical = getFinalValue(
    canonicalUrl,
    dbConfig?.canonical_url,
    enterpriseConfig?.canonicalUrl,
    `${siteUrl}${location.pathname}`
  );

  const finalOgTitle = getFinalValue(
    ogTitle,
    dbConfig?.og_title,
    enterpriseConfig?.ogTitle,
    finalTitle
  );

  const finalOgDescription = getFinalValue(
    ogDescription,
    dbConfig?.og_description,
    enterpriseConfig?.ogDescription,
    finalDescription
  );

  const finalOgImage = getFinalValue(
    ogImage,
    dbConfig?.og_image,
    enterpriseConfig?.ogImage,
    BUILDDESK_LOGO_URL
  );

  const finalOgUrl = getFinalValue(
    ogUrl,
    null,
    enterpriseConfig?.ogUrl,
    `${siteUrl}${location.pathname}`
  );

  const finalNoIndex = getFinalValue(
    noIndex,
    dbConfig?.no_index,
    enterpriseConfig?.noIndex,
    false
  );

  const finalNoFollow = getFinalValue(
    noFollow,
    dbConfig?.no_follow,
    enterpriseConfig?.noFollow,
    false
  );

  // Combine structured data from all sources
  const combinedStructuredData = [
    ...(structuredData ? [structuredData] : []),
    ...(dbConfig?.schema_markup ? [dbConfig.schema_markup] : []),
    ...(enterpriseConfig?.schema ? [enterpriseConfig.schema] : [])
  ].filter(Boolean);

  // Generate FAQ schema for high-value pages
  const faqSchema = generateFAQSchema(location.pathname);
  if (faqSchema) {
    combinedStructuredData.push(faqSchema);
  }

  // Track analytics if enabled
  useEffect(() => {
    if (enableAnalytics && !isLoading && finalTitle && finalKeywords) {
      // Only call trackSEOPerformance if it exists and all dependencies are stable
      try {
        if (typeof trackSEOPerformance === 'function') {
          trackSEOPerformance({
            path: location.pathname,
            title: finalTitle,
            keywords: finalKeywords,
            source: dbConfig ? 'database' : enterpriseConfig ? 'enterprise' : 'manual'
          });
        }
      } catch (error) {
      }
    }
  }, [enableAnalytics, isLoading, location.pathname]);

  if (isLoading) {
    return null; // Don't render anything while loading
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={Array.isArray(finalKeywords) ? finalKeywords.join(', ') : finalKeywords} />
      <meta name="author" content="BuildDesk" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonical} />
      
      {/* Robots Meta */}
      <meta name="robots" content={`${finalNoIndex ? 'noindex' : 'index'}, ${finalNoFollow ? 'nofollow' : 'follow'}`} />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={finalOgImage} />
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
      <meta name="twitter:image" content={finalOgImage} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#ff6b00" />
      <meta name="msapplication-TileColor" content="#ff6b00" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Performance and Security Headers (only those valid via meta) */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* DNS Prefetch for Performance */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Structured Data */}
      {combinedStructuredData.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
      
      {/* Enterprise Analytics (if enabled) */}
      {enableAnalytics && enterpriseConfig?.analyticsCode && (
        <script>
          {enterpriseConfig.analyticsCode}
        </script>
      )}
    </Helmet>
  );
};

// Helper function to generate enterprise enhancements
async function generateEnterpriseEnhancements(
  pathname: string, 
  existingConfig: ExistingSEOConfig | null
): Promise<any> {
  // Enhanced SEO suggestions based on pathname
  const enhancements: any = {};

  // High-value construction software keywords
  const keywordMap: Record<string, string[]> = {
    '/': [
      'construction management software',
      'construction project management software', 
      'procore alternative',
      'buildertrend alternative',
      'contractor software'
    ],
    '/pricing': [
      'construction management software pricing',
      'construction software cost',
      'contractor software pricing'
    ],
    '/features': [
      'construction management features',
      'construction software features',
      'project management tools'
    ]
  };

  // Enhanced titles for better CTR
  const titleEnhancements: Record<string, string> = {
    '/': 'Construction Management Software - Save 40% on Projects | BuildDesk',
    '/pricing': 'Construction Software Pricing - Transparent, No Hidden Fees | BuildDesk',
    '/features': 'Construction Management Features - Everything You Need | BuildDesk'
  };

  // Enhanced descriptions for better conversion
  const descriptionEnhancements: Record<string, string> = {
    '/': 'Stop losing money on construction projects. BuildDesk delivers real-time job costing, mobile field management, and OSHA compliance. Join 500+ contractors saving $50K+ annually.',
    '/pricing': 'Transparent construction management software pricing starting at $149/month. No setup fees, free 14-day trial, and migration assistance included.',
    '/features': 'Complete construction management features including job costing, scheduling, document management, OSHA compliance, and QuickBooks integration.'
  };

  // Apply enhancements if no existing config or if existing config needs improvement
  if (!existingConfig || !existingConfig.title) {
    enhancements.title = titleEnhancements[pathname];
  }

  if (!existingConfig || !existingConfig.description) {
    enhancements.description = descriptionEnhancements[pathname];
  }

  if (!existingConfig || !existingConfig.keywords?.length) {
    enhancements.keywords = keywordMap[pathname] || ['construction', 'project management'];
  }

  // Add enhanced schema markup
  enhancements.schema = generateEnhancedSchema(pathname, enhancements);

  return enhancements;
}

// Helper function to generate FAQ schema
function generateFAQSchema(pathname: string): any {
  const faqData: Record<string, Array<{ question: string; answer: string }>> = {
    '/': [
      {
        question: 'What is construction management software?',
        answer: 'Construction management software helps construction companies manage projects, track costs, schedule tasks, and collaborate with team members from a centralized platform.'
      },
      {
        question: 'How much does BuildDesk cost?',
        answer: 'BuildDesk pricing starts at $149/month with a 14-day free trial. No setup fees or hidden costs.'
      },
      {
        question: 'Does BuildDesk integrate with QuickBooks?',
        answer: 'Yes, BuildDesk offers seamless QuickBooks integration for automatic financial data synchronization.'
      }
    ],
    '/pricing': [
      {
        question: 'Is there a free trial?',
        answer: 'Yes, BuildDesk offers a 14-day free trial with full access to all features. No credit card required.'
      },
      {
        question: 'Are there setup fees?',
        answer: 'No, BuildDesk has no setup fees, hidden costs, or long-term contracts.'
      }
    ]
  };

  const faqs = faqData[pathname];
  if (!faqs) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

// Helper function to generate enhanced schema
function generateEnhancedSchema(pathname: string, config: any): any {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: config.title,
    description: config.description,
    url: `https://builddesk.com${pathname}`
  };

  if (pathname === '/') {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'BuildDesk Construction Management',
      applicationCategory: 'Construction Management Software',
      operatingSystem: 'Web, iOS, Android',
      description: config.description,
      offers: {
        '@type': 'Offer',
        price: '149',
        priceCurrency: 'USD',
        priceValidUntil: '2025-12-31'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '247'
      }
    };
  }

  return baseSchema;
}

// Helper function to track SEO performance
function trackSEOPerformance(data: any): void {
  // Log SEO performance for analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'seo_optimization', {
      page_path: data.path,
      seo_source: data.source,
      primary_keyword: data.keywords?.[0],
      custom_parameter_1: data.title?.length || 0
    });
  }
}

export default UnifiedSEOSystem;
