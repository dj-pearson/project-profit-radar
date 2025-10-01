import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { enterpriseSeoService, SEOPageConfig } from '@/services/EnterpriseSeOService';

export interface DynamicSEOOptimizerProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  product?: {
    price?: string;
    currency?: string;
    availability?: string;
    condition?: string;
  };
  customSchema?: Record<string, any>;
  noIndex?: boolean;
  canonicalUrl?: string;
}

export const DynamicSEOOptimizer: React.FC<DynamicSEOOptimizerProps> = ({
  title,
  description,
  keywords,
  image,
  article,
  product,
  customSchema,
  noIndex = false,
  canonicalUrl
}) => {
  const location = useLocation();
  const [seoConfig, setSeoConfig] = useState<SEOPageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSEOConfig = async () => {
      try {
        setIsLoading(true);
        const config = await enterpriseSeoService.optimizePage(location.pathname);
        setSeoConfig(config);
      } catch (error) {
        console.error('Error loading SEO config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSEOConfig();
  }, [location.pathname]);

  if (isLoading || !seoConfig) {
    return null;
  }

  // Merge provided props with SEO config
  const finalTitle = title || seoConfig.title;
  const finalDescription = description || seoConfig.description;
  const finalKeywords = keywords || seoConfig.keywords;
  const finalCanonical = canonicalUrl || seoConfig.canonicalUrl;
  const finalImage = image || seoConfig.openGraph.image;

  // Generate structured data
  const structuredData = customSchema || seoConfig.schema;

  // Add article schema if article props provided
  if (article) {
    structuredData['@type'] = 'Article';
    structuredData.headline = finalTitle;
    structuredData.description = finalDescription;
    structuredData.author = {
      '@type': 'Person',
      name: article.author || 'BuildDesk Team'
    };
    structuredData.publisher = {
      '@type': 'Organization',
      name: 'BuildDesk',
      logo: {
        '@type': 'ImageObject',
        url: 'https://build-desk.com/logo.png'
      }
    };
    if (article.publishedTime) {
      structuredData.datePublished = article.publishedTime;
    }
    if (article.modifiedTime) {
      structuredData.dateModified = article.modifiedTime;
    }
    if (article.section) {
      structuredData.articleSection = article.section;
    }
    if (article.tags) {
      structuredData.keywords = article.tags.join(', ');
    }
  }

  // Add product schema if product props provided
  if (product) {
    structuredData['@type'] = 'Product';
    structuredData.name = finalTitle;
    structuredData.description = finalDescription;
    structuredData.image = finalImage;
    
    if (product.price) {
      structuredData.offers = {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency || 'USD',
        availability: product.availability || 'https://schema.org/InStock',
        itemCondition: product.condition || 'https://schema.org/NewCondition'
      };
    }
  }

  // Generate breadcrumb schema for non-home pages
  const breadcrumbSchema = location.pathname !== '/' ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: generateBreadcrumbs(location.pathname)
  } : null;

  // Generate FAQ schema for pages with common questions
  const faqSchema = generateFAQSchema(location.pathname);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords.join(', ')} />
      <link rel="canonical" href={finalCanonical} />
      
      {/* Robots Meta */}
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={seoConfig.openGraph.title} />
      <meta property="og:description" content={seoConfig.openGraph.description} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={seoConfig.openGraph.url} />
      <meta property="og:type" content={seoConfig.openGraph.type} />
      <meta property="og:site_name" content={seoConfig.openGraph.siteName} />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={seoConfig.twitterCard.card} />
      <meta name="twitter:title" content={seoConfig.twitterCard.title} />
      <meta name="twitter:description" content={seoConfig.twitterCard.description} />
      <meta name="twitter:image" content={seoConfig.twitterCard.image} />
      <meta name="twitter:creator" content={seoConfig.twitterCard.creator} />
      
      {/* Additional Meta Tags */}
      {Object.entries(seoConfig.metaTags).map(([name, content]) => (
        <meta key={name} name={name} content={content} />
      ))}
      
      {/* Article-specific meta tags */}
      {article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:modified_time" content={article.modifiedTime} />
          <meta property="article:author" content={article.author} />
          {article.section && <meta property="article:section" content={article.section} />}
          {article.tags?.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      
      {/* Breadcrumb Schema */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      
      {/* FAQ Schema */}
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
      
      {/* Performance Hints */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Security Headers (only those valid via meta) */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
    </Helmet>
  );
};

// Helper function to generate breadcrumbs
function generateBreadcrumbs(pathname: string) {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://build-desk.com'
    }
  ];

  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const name = path.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    breadcrumbs.push({
      '@type': 'ListItem',
      position: index + 2,
      name,
      item: `https://build-desk.com${currentPath}`
    });
  });

  return breadcrumbs;
}

// Helper function to generate FAQ schema for specific pages
function generateFAQSchema(pathname: string) {
  const faqData: Record<string, Array<{ question: string; answer: string }>> = {
    '/': [
      {
        question: 'What is construction management software?',
        answer: 'Construction management software is a digital platform that helps construction companies manage projects, track costs, schedule tasks, and collaborate with team members from a centralized system.'
      },
      {
        question: 'How much does BuildDesk cost?',
        answer: 'BuildDesk pricing starts at $149/month for small teams, with scalable plans for growing construction businesses. All plans include a 14-day free trial with no credit card required.'
      },
      {
        question: 'Does BuildDesk integrate with QuickBooks?',
        answer: 'Yes, BuildDesk offers seamless QuickBooks integration to sync your financial data, invoices, and job costing information automatically.'
      }
    ],
    '/procore-alternative': [
      {
        question: 'How does BuildDesk compare to Procore?',
        answer: 'BuildDesk offers similar functionality to Procore but at 60% lower cost, with faster setup, better mobile experience, and more intuitive interface designed for small to medium construction businesses.'
      },
      {
        question: 'Can I migrate from Procore to BuildDesk?',
        answer: 'Yes, BuildDesk provides free migration assistance to help you transfer your project data, contacts, and documents from Procore with minimal downtime.'
      }
    ],
    '/pricing': [
      {
        question: 'Is there a free trial?',
        answer: 'Yes, BuildDesk offers a 14-day free trial with full access to all features. No credit card required to start.'
      },
      {
        question: 'Are there setup fees?',
        answer: 'No, BuildDesk has no setup fees, hidden costs, or long-term contracts. You only pay the monthly subscription fee.'
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

export default DynamicSEOOptimizer;
