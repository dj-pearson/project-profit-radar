/**
 * Advanced SEO optimization utilities for enterprise-grade performance
 */

// Enhanced meta tag management
export const generateAdvancedMetaTags = (page: string, data: any) => {
  const baseTags = {
    // Core SEO
    title: data.title,
    description: data.description,
    keywords: data.keywords?.join(', '),
    
    // Open Graph Enhanced
    'og:title': data.ogTitle || data.title,
    'og:description': data.ogDescription || data.description,
    'og:image': data.ogImage || 'https://builddesk.com/og-image.jpg',
    'og:url': `https://builddesk.com${data.canonicalUrl || ''}`,
    'og:type': data.ogType || 'website',
    'og:site_name': 'BuildDesk',
    'og:locale': 'en_US',
    
    // Twitter Card Enhanced
    'twitter:card': data.twitterCard || 'summary_large_image',
    'twitter:site': '@builddesk',
    'twitter:creator': '@builddesk',
    'twitter:title': data.twitterTitle || data.title,
    'twitter:description': data.twitterDescription || data.description,
    'twitter:image': data.twitterImage || data.ogImage || 'https://builddesk.com/twitter-card.jpg',
    
    // Advanced SEO
    'article:author': data.author,
    'article:published_time': data.publishedTime,
    'article:modified_time': data.modifiedTime,
    'article:section': data.section,
    'article:tag': data.tags?.join(', '),
    
    // Mobile & App
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'BuildDesk',
    
    // Robots & Indexing
    robots: data.noIndex ? 'noindex,nofollow' : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1',
    googlebot: 'index,follow',
    
    // Geographic
    'geo.region': 'US-CO',
    'geo.placename': 'Denver, Colorado',
    'geo.position': '39.7392;-104.9903',
    'ICBM': '39.7392, -104.9903',
    
    // Performance
    'dns-prefetch': 'https://fonts.googleapis.com',
    'preconnect': 'https://fonts.gstatic.com'
  };

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(baseTags).filter(([_, value]) => value !== undefined)
  );
};

// AI Search optimization prompts
export const generateAISearchPrompts = (pageType: string, keywords: string[]) => {
  const prompts = {
    homepage: [
      `What is the best construction management software for small contractors?`,
      `Compare BuildDesk vs Procore for small construction companies`,
      `How much does construction project management software cost?`,
      `What features should construction management software have?`
    ],
    comparison: [
      `BuildDesk vs ${keywords[0]} comparison`,
      `Which is better: BuildDesk or ${keywords[0]}?`,
      `${keywords[0]} alternative for small contractors`,
      `BuildDesk ${keywords[0]} pricing comparison`
    ],
    guide: [
      `How to ${keywords[0]} in construction`,
      `${keywords[0]} best practices for contractors`,
      `${keywords[0]} guide for small construction companies`,
      `Construction ${keywords[0]} software comparison`
    ],
    pricing: [
      `How much does BuildDesk cost?`,
      `BuildDesk pricing vs competitors`,
      `Affordable construction management software pricing`,
      `Construction software cost comparison`
    ]
  };

  return prompts[pageType as keyof typeof prompts] || [];
};

// Enhanced keyword density optimization
export const optimizeKeywordDensity = (content: string, primaryKeyword: string, targetDensity = 0.02) => {
  const words = content.toLowerCase().split(/\s+/);
  const keywordCount = words.filter(word => 
    word.includes(primaryKeyword.toLowerCase().replace(/\s+/g, ''))
  ).length;
  
  const currentDensity = keywordCount / words.length;
  
  return {
    currentDensity: Math.round(currentDensity * 10000) / 100,
    targetDensity: Math.round(targetDensity * 10000) / 100,
    isOptimal: currentDensity >= targetDensity * 0.8 && currentDensity <= targetDensity * 1.5,
    recommendation: currentDensity < targetDensity ? 'increase' : 
                   currentDensity > targetDensity * 2 ? 'decrease' : 'maintain'
  };
};

// Advanced internal linking
export const generateInternalLinks = (currentPage: string, allPages: string[]) => {
  const linkingStrategy = {
    homepage: ['/pricing', '/features', '/resources', '/auth'],
    pricing: ['/features', '/comparison', '/auth'],
    features: ['/pricing', '/resources', '/auth'],
    resources: ['/topics/construction-management-basics', '/topics/safety-osha-compliance'],
    comparison: ['/pricing', '/features', '/auth'],
    guide: ['/resources', '/pricing', '/auth']
  };

  const pageType = Object.keys(linkingStrategy).find(type => 
    currentPage.includes(type)
  ) || 'guide';

  return linkingStrategy[pageType as keyof typeof linkingStrategy] || [];
};

// Performance-based SEO scoring
export const calculateSEOScore = (pageMetrics: {
  hasTitle: boolean;
  hasDescription: boolean;
  hasH1: boolean;
  hasCanonical: boolean;
  hasSchema: boolean;
  hasImages: boolean;
  hasAltText: boolean;
  wordCount: number;
  loadTime?: number;
  mobileSpeed?: number;
}) => {
  let score = 0;
  
  // Basic SEO elements (60 points)
  if (pageMetrics.hasTitle) score += 15;
  if (pageMetrics.hasDescription) score += 15;
  if (pageMetrics.hasH1) score += 10;
  if (pageMetrics.hasCanonical) score += 10;
  if (pageMetrics.hasSchema) score += 10;
  
  // Content quality (20 points)
  if (pageMetrics.wordCount > 300) score += 10;
  if (pageMetrics.wordCount > 1000) score += 5;
  if (pageMetrics.hasImages && pageMetrics.hasAltText) score += 5;
  
  // Performance (20 points)
  if (pageMetrics.loadTime && pageMetrics.loadTime < 3000) score += 10;
  if (pageMetrics.mobileSpeed && pageMetrics.mobileSpeed > 90) score += 10;
  
  return {
    score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
    recommendations: generateSEORecommendations(pageMetrics, score)
  };
};

const generateSEORecommendations = (metrics: any, score: number) => {
  const recommendations = [];
  
  if (!metrics.hasTitle) recommendations.push('Add a descriptive title tag');
  if (!metrics.hasDescription) recommendations.push('Add a meta description');
  if (!metrics.hasH1) recommendations.push('Add an H1 heading');
  if (!metrics.hasCanonical) recommendations.push('Add a canonical URL');
  if (!metrics.hasSchema) recommendations.push('Add structured data markup');
  if (metrics.wordCount < 300) recommendations.push('Increase content length to 300+ words');
  if (!metrics.hasAltText) recommendations.push('Add alt text to all images');
  if (metrics.loadTime && metrics.loadTime > 3000) recommendations.push('Improve page load speed');
  
  return recommendations;
};

// Enhanced sitemap generation
export const generateAdvancedSitemap = (pages: any[]) => {
  const priorities = {
    homepage: 1.0,
    pricing: 0.9,
    features: 0.8,
    comparison: 0.7,
    resources: 0.6,
    guides: 0.5
  };

  const changeFreqs = {
    homepage: 'weekly',
    pricing: 'monthly',
    features: 'monthly',
    comparison: 'monthly',
    resources: 'weekly',
    guides: 'monthly'
  };

  return pages.map(page => ({
    url: `https://builddesk.com${page.path}`,
    lastmod: page.lastModified || new Date().toISOString().split('T')[0],
    changefreq: changeFreqs[page.type as keyof typeof changeFreqs] || 'monthly',
    priority: priorities[page.type as keyof typeof priorities] || 0.5,
    images: page.images || [],
    videos: page.videos || []
  }));
};

export default {
  generateAdvancedMetaTags,
  generateAISearchPrompts,
  optimizeKeywordDensity,
  generateInternalLinks,
  calculateSEOScore,
  generateAdvancedSitemap
};