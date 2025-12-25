/**
 * Centralized SEO Configuration
 *
 * This file contains all SEO metadata for programmatic page generation.
 * It serves as the single source of truth for:
 * - Page titles and descriptions
 * - Keywords and canonical URLs
 * - Schema.org structured data
 * - Internal linking relationships
 * - Sitemap priorities
 *
 * Benefits:
 * 1. Consistent metadata across all pages
 * 2. Easy bulk updates and maintenance
 * 3. Programmatic sitemap generation
 * 4. Type-safe configuration
 * 5. Internal linking automation
 */

export interface SEOPageConfig {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  priority: number; // 0.0 - 1.0 for sitemap
  changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  ogType?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  schemaType?: 'WebPage' | 'FAQPage' | 'Article' | 'Product' | 'SoftwareApplication' | 'HowTo' | 'Organization';
  category: SEOCategory;
  relatedPages?: string[]; // Paths to related pages for internal linking
  breadcrumbs?: Array<{ name: string; path: string }>;
  lastModified?: string;
  heroImage?: string;
}

export type SEOCategory =
  | 'core'
  | 'features'
  | 'industry'
  | 'comparison'
  | 'resources'
  | 'tools'
  | 'topics'
  | 'legal'
  | 'support';

// Base URL for all canonical URLs
export const SITE_URL = 'https://builddesk.com';

// Default OG Image
export const DEFAULT_OG_IMAGE = 'https://builddesk.com/og-image.png';

// Company info for schema
export const COMPANY_INFO = {
  name: 'BuildDesk',
  description: 'Construction management software for small and mid-size contractors in the United States.',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  foundingDate: '2024',
  priceRange: '$199 - $799',
  telephone: '+1-555-BUILD-01',
  email: 'support@builddesk.com',
  address: {
    '@type': 'PostalAddress' as const,
    addressCountry: 'US',
  },
  sameAs: [
    'https://linkedin.com/company/builddesk',
    'https://twitter.com/builddesk',
    'https://facebook.com/builddesk',
  ],
};

// Software product info for schema
export const SOFTWARE_INFO = {
  name: 'BuildDesk',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  price: '350',
  priceCurrency: 'USD',
  billingPeriod: 'P1M',
  ratingValue: '4.8',
  reviewCount: '247',
  features: [
    'Real-time job costing',
    'Mobile crew tracking',
    'Daily progress reports',
    'OSHA compliance reporting',
    'QuickBooks integration',
    'Project scheduling',
    'Change order management',
    'Client portal',
    'Document management',
    'GPS time tracking',
  ],
};

/**
 * Core Marketing Pages
 */
export const corePages: SEOPageConfig[] = [
  {
    path: '/',
    title: 'Construction Management Software for Small Contractors | BuildDesk',
    description: 'BuildDesk is the #1 construction management software for small contractors. Real-time job costing, mobile crew tracking, and OSHA compliance. Start your free trial today.',
    keywords: [
      'construction management software',
      'contractor software',
      'construction project management',
      'job costing software',
      'procore alternative',
      'buildertrend alternative',
    ],
    priority: 1.0,
    changeFreq: 'daily',
    schemaType: 'SoftwareApplication',
    category: 'core',
    relatedPages: ['/features', '/pricing', '/procore-alternative'],
  },
  {
    path: '/features',
    title: 'Construction Software Features - Project Management, Job Costing & More | BuildDesk',
    description: 'Explore BuildDesk features: real-time job costing, project scheduling, mobile apps, OSHA compliance, QuickBooks integration, and more. Built for small contractors.',
    keywords: [
      'construction software features',
      'job costing features',
      'project management features',
      'construction scheduling',
      'mobile construction app',
    ],
    priority: 0.9,
    changeFreq: 'weekly',
    schemaType: 'WebPage',
    category: 'core',
    relatedPages: ['/pricing', '/job-costing-software', '/construction-management-software'],
  },
  {
    path: '/pricing',
    title: 'Construction Software Pricing - Transparent, No Hidden Fees | BuildDesk',
    description: 'BuildDesk pricing: $350/month with unlimited users. No setup fees, no per-user charges. Start your 14-day free trial. Compare to Procore and Buildertrend pricing.',
    keywords: [
      'construction software pricing',
      'contractor software cost',
      'procore pricing',
      'buildertrend pricing',
      'affordable construction software',
    ],
    priority: 0.9,
    changeFreq: 'weekly',
    schemaType: 'Product',
    category: 'core',
    relatedPages: ['/features', '/procore-alternative', '/faq'],
  },
  {
    path: '/faq',
    title: 'Frequently Asked Questions | BuildDesk Construction Management',
    description: 'Get answers to common questions about BuildDesk construction management software. Setup, features, pricing, support, and more for small contractors.',
    keywords: [
      'builddesk faq',
      'construction software questions',
      'builddesk help',
      'construction management software support',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    schemaType: 'FAQPage',
    category: 'core',
    relatedPages: ['/features', '/pricing', '/support'],
  },
  {
    path: '/blog',
    title: 'Construction Industry Blog - Tips, Guides & Best Practices | BuildDesk',
    description: 'Expert construction industry insights, project management tips, job costing guides, and best practices for small contractors. Stay ahead with BuildDesk.',
    keywords: [
      'construction blog',
      'contractor tips',
      'construction management tips',
      'project management blog',
    ],
    priority: 0.8,
    changeFreq: 'weekly',
    schemaType: 'WebPage',
    category: 'core',
    relatedPages: ['/resources', '/topics/construction-management-basics'],
  },
  {
    path: '/solutions',
    title: 'Construction Management Solutions for Every Trade | BuildDesk',
    description: 'Industry-specific construction management solutions for general contractors, specialty trades, residential builders, and commercial contractors.',
    keywords: [
      'construction solutions',
      'contractor solutions',
      'trade-specific software',
      'specialty contractor software',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'core',
    relatedPages: ['/residential-contractors', '/commercial-contractors', '/features'],
  },
];

/**
 * Industry-Specific Pages
 */
export const industryPages: SEOPageConfig[] = [
  {
    path: '/plumbing-contractor-software',
    title: 'Plumbing Contractor Software - Service & Project Management | BuildDesk',
    description: 'The best plumbing contractor software for managing jobs, tracking time, invoicing, and growing your plumbing business. Try BuildDesk free for 14 days.',
    keywords: [
      'plumbing contractor software',
      'plumbing business software',
      'plumber management software',
      'plumbing job tracking',
      'plumbing invoicing software',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'SoftwareApplication',
    category: 'industry',
    relatedPages: ['/hvac-contractor-software', '/electrical-contractor-software', '/features'],
  },
  {
    path: '/hvac-contractor-software',
    title: 'HVAC Contractor Software - Service Management & Scheduling | BuildDesk',
    description: 'Complete HVAC contractor software for managing technicians, scheduling service calls, tracking equipment, and growing your HVAC business.',
    keywords: [
      'hvac contractor software',
      'hvac business software',
      'hvac service management',
      'hvac scheduling software',
      'hvac job management',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'SoftwareApplication',
    category: 'industry',
    relatedPages: ['/plumbing-contractor-software', '/electrical-contractor-software', '/features'],
  },
  {
    path: '/electrical-contractor-software',
    title: 'Electrical Contractor Software - Project & Job Management | BuildDesk',
    description: 'Best electrical contractor software for job costing, project management, crew tracking, and compliance. Designed for electrical contractors of all sizes.',
    keywords: [
      'electrical contractor software',
      'electrician software',
      'electrical job costing',
      'electrical project management',
      'electrical business software',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'SoftwareApplication',
    category: 'industry',
    relatedPages: ['/plumbing-contractor-software', '/hvac-contractor-software', '/features'],
  },
  {
    path: '/commercial-contractors',
    title: 'Commercial Construction Software - Enterprise Project Management | BuildDesk',
    description: 'Commercial construction management software for large projects. Multi-project tracking, subcontractor management, and enterprise-grade features.',
    keywords: [
      'commercial construction software',
      'commercial contractor software',
      'enterprise construction management',
      'large project management',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'SoftwareApplication',
    category: 'industry',
    relatedPages: ['/residential-contractors', '/features', '/construction-management-software'],
  },
  {
    path: '/residential-contractors',
    title: 'Residential Construction Software - Home Builder Management | BuildDesk',
    description: 'Residential construction software for home builders and remodelers. Manage projects, track costs, and deliver quality homes on time and on budget.',
    keywords: [
      'residential construction software',
      'home builder software',
      'remodeling contractor software',
      'residential project management',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'SoftwareApplication',
    category: 'industry',
    relatedPages: ['/commercial-contractors', '/features', '/construction-management-software'],
  },
];

/**
 * Feature-Specific Pages
 */
export const featurePages: SEOPageConfig[] = [
  {
    path: '/job-costing-software',
    title: 'Construction Job Costing Software - Real-Time Cost Tracking | BuildDesk',
    description: 'Best job costing software for construction. Track labor, materials, and overhead in real-time. Compare budget vs actual instantly. Free 14-day trial.',
    keywords: [
      'job costing software',
      'construction job costing',
      'real-time cost tracking',
      'project cost management',
      'construction budgeting software',
    ],
    priority: 0.9,
    changeFreq: 'weekly',
    schemaType: 'SoftwareApplication',
    category: 'features',
    relatedPages: ['/features/job-costing', '/resources/complete-guide-construction-job-costing', '/pricing'],
  },
  {
    path: '/construction-management-software',
    title: 'Construction Management Software for Small Business | BuildDesk',
    description: 'All-in-one construction management software for small businesses. Project tracking, job costing, scheduling, and more. No enterprise complexity.',
    keywords: [
      'construction management software',
      'small business construction software',
      'construction project software',
      'contractor management software',
    ],
    priority: 0.9,
    changeFreq: 'weekly',
    schemaType: 'SoftwareApplication',
    category: 'features',
    relatedPages: ['/features', '/pricing', '/procore-alternative'],
  },
  {
    path: '/construction-scheduling-software',
    title: 'Construction Scheduling Software - Gantt Charts & Resource Planning | BuildDesk',
    description: 'Construction scheduling software with Gantt charts, resource planning, and milestone tracking. Keep projects on schedule and on budget.',
    keywords: [
      'construction scheduling software',
      'project scheduling',
      'gantt chart construction',
      'construction timeline',
      'resource planning',
    ],
    priority: 0.8,
    changeFreq: 'weekly',
    schemaType: 'SoftwareApplication',
    category: 'features',
    relatedPages: ['/features', '/construction-management-software', '/resources/construction-scheduling-software-prevent-delays'],
  },
  {
    path: '/osha-compliance-software',
    title: 'OSHA Compliance Software for Construction - Safety Management | BuildDesk',
    description: 'OSHA compliance software for construction safety. Digital safety logs, incident reporting, inspections, and automated compliance tracking.',
    keywords: [
      'osha compliance software',
      'construction safety software',
      'safety management software',
      'osha reporting',
      'construction compliance',
    ],
    priority: 0.8,
    changeFreq: 'weekly',
    schemaType: 'SoftwareApplication',
    category: 'features',
    relatedPages: ['/topics/safety-and-osha-compliance', '/resources/osha-safety-logs-digital-playbook', '/features'],
  },
  {
    path: '/construction-field-management',
    title: 'Construction Field Management Software - Mobile Crew Tracking | BuildDesk',
    description: 'Field management software for construction crews. GPS time tracking, daily reports, photo documentation, and offline capability.',
    keywords: [
      'construction field management',
      'field crew software',
      'mobile construction app',
      'gps time tracking',
      'daily report software',
    ],
    priority: 0.8,
    changeFreq: 'weekly',
    schemaType: 'SoftwareApplication',
    category: 'features',
    relatedPages: ['/features', '/construction-management-software', '/resources/construction-mobile-app-guide'],
  },
  {
    path: '/construction-project-management-software',
    title: 'Construction Project Management Software - All-in-One Platform | BuildDesk',
    description: 'Complete construction project management software. Manage schedules, budgets, documents, and teams from one platform designed for contractors.',
    keywords: [
      'construction project management software',
      'project management for contractors',
      'construction pm software',
      'contractor project tracking',
    ],
    priority: 0.8,
    changeFreq: 'weekly',
    schemaType: 'SoftwareApplication',
    category: 'features',
    relatedPages: ['/construction-management-software', '/features', '/pricing'],
  },
];

/**
 * Comparison Pages
 */
export const comparisonPages: SEOPageConfig[] = [
  {
    path: '/procore-alternative',
    title: 'Best Procore Alternative for Small Contractors 2025 | BuildDesk',
    description: 'Looking for a Procore alternative? BuildDesk offers the same features at 60% less cost. Perfect for small contractors who need powerful software without complexity.',
    keywords: [
      'procore alternative',
      'procore competitor',
      'procore vs builddesk',
      'cheaper than procore',
      'procore for small contractors',
    ],
    priority: 0.9,
    changeFreq: 'weekly',
    schemaType: 'WebPage',
    category: 'comparison',
    relatedPages: ['/buildertrend-alternative', '/pricing', '/resources/procore-alternative-complete-guide'],
  },
  {
    path: '/buildertrend-alternative',
    title: 'Best Buildertrend Alternative for Contractors 2025 | BuildDesk',
    description: 'Looking for a Buildertrend alternative? BuildDesk offers better job costing, unlimited users, and no per-user fees. Compare features and pricing.',
    keywords: [
      'buildertrend alternative',
      'buildertrend competitor',
      'buildertrend vs builddesk',
      'cheaper than buildertrend',
    ],
    priority: 0.9,
    changeFreq: 'weekly',
    schemaType: 'WebPage',
    category: 'comparison',
    relatedPages: ['/procore-alternative', '/builddesk-vs-buildertrend-comparison', '/pricing'],
  },
  {
    path: '/builddesk-vs-buildertrend-comparison',
    title: 'BuildDesk vs Buildertrend - Complete Feature Comparison 2025',
    description: 'In-depth comparison of BuildDesk vs Buildertrend. Compare features, pricing, ease of use, and customer reviews. Find the best fit for your construction business.',
    keywords: [
      'builddesk vs buildertrend',
      'buildertrend comparison',
      'construction software comparison',
      'contractor software comparison',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'comparison',
    relatedPages: ['/buildertrend-alternative', '/procore-alternative', '/pricing'],
  },
  {
    path: '/builddesk-vs-coconstruct',
    title: 'BuildDesk vs CoConstruct - Which is Better for Your Business?',
    description: 'Compare BuildDesk vs CoConstruct for construction management. Side-by-side feature comparison, pricing analysis, and recommendations.',
    keywords: [
      'builddesk vs coconstruct',
      'coconstruct alternative',
      'coconstruct comparison',
      'home builder software comparison',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'comparison',
    relatedPages: ['/buildertrend-alternative', '/residential-contractors', '/pricing'],
  },
];

/**
 * Resource Guide Pages
 */
export const resourcePages: SEOPageConfig[] = [
  {
    path: '/resources/complete-guide-construction-job-costing',
    title: 'Complete Guide to Construction Job Costing (2025) | BuildDesk',
    description: 'Master construction job costing with our comprehensive guide. Learn cost codes, tracking methods, software selection, and best practices for contractors.',
    keywords: [
      'construction job costing guide',
      'job costing tutorial',
      'construction cost tracking',
      'cost code setup',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'Article',
    category: 'resources',
    relatedPages: ['/job-costing-software', '/resources/calculate-true-project-profitability', '/features/job-costing'],
  },
  {
    path: '/resources/best-construction-management-software-small-business-2025',
    title: 'Best Construction Management Software for Small Business 2025',
    description: 'Top construction management software for small businesses in 2025. Compare features, pricing, and find the perfect solution for your contracting company.',
    keywords: [
      'best construction software 2025',
      'small business construction software',
      'top contractor software',
      'construction software reviews',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'Article',
    category: 'resources',
    relatedPages: ['/construction-management-software', '/procore-alternative', '/pricing'],
  },
  {
    path: '/resources/quickbooks-integration-guide',
    title: 'QuickBooks Integration for Construction - Complete Setup Guide',
    description: 'Step-by-step guide to integrating QuickBooks with construction management software. Sync invoices, expenses, and financial data automatically.',
    keywords: [
      'quickbooks construction integration',
      'quickbooks contractor',
      'accounting integration',
      'financial sync',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'HowTo',
    category: 'resources',
    relatedPages: ['/resources/quickbooks-limitations-construction', '/features', '/pricing'],
  },
  {
    path: '/resources/osha-safety-logs-digital-playbook',
    title: 'OSHA Safety Logs Digital Playbook for Construction',
    description: 'Complete guide to digital OSHA safety logs. Learn how to track safety incidents, maintain compliance, and create a safer job site.',
    keywords: [
      'osha safety logs',
      'construction safety tracking',
      'digital safety forms',
      'osha compliance guide',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'HowTo',
    category: 'resources',
    relatedPages: ['/osha-compliance-software', '/topics/safety-and-osha-compliance', '/features'],
  },
  {
    path: '/resources/construction-scheduling-software-prevent-delays',
    title: 'How Construction Scheduling Software Prevents Project Delays',
    description: 'Learn how construction scheduling software helps prevent costly delays. Resource planning, dependency tracking, and real-time updates.',
    keywords: [
      'construction scheduling',
      'prevent project delays',
      'construction timeline management',
      'project scheduling tips',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'Article',
    category: 'resources',
    relatedPages: ['/construction-scheduling-software', '/features', '/construction-management-software'],
  },
  {
    path: '/resources/construction-mobile-app-guide',
    title: 'Construction Mobile App Guide - Field Management Best Practices',
    description: 'Ultimate guide to construction mobile apps. Learn how field teams use mobile apps for time tracking, daily reports, and project updates.',
    keywords: [
      'construction mobile app',
      'field management app',
      'construction app guide',
      'mobile construction software',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'Article',
    category: 'resources',
    relatedPages: ['/construction-field-management', '/features', '/pricing'],
  },
  {
    path: '/resources/financial-intelligence-guide',
    title: 'Financial Intelligence for Construction Contractors',
    description: 'Master financial intelligence for your construction business. Cash flow management, profitability analysis, and financial decision-making.',
    keywords: [
      'construction financial intelligence',
      'contractor finances',
      'construction cash flow',
      'financial management',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'Article',
    category: 'resources',
    relatedPages: ['/features/financial-management', '/resources/cash-flow-management-guide', '/job-costing-software'],
  },
  {
    path: '/resources/calculate-true-project-profitability',
    title: 'How to Calculate True Project Profitability in Construction',
    description: 'Learn to calculate true project profitability including hidden costs, overhead allocation, and margin analysis for construction projects.',
    keywords: [
      'project profitability',
      'construction profit calculation',
      'job profitability analysis',
      'contractor margins',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    ogType: 'article',
    schemaType: 'HowTo',
    category: 'resources',
    relatedPages: ['/calculator', '/job-costing-software', '/resources/complete-guide-construction-job-costing'],
  },
];

/**
 * Free Tools Pages
 */
export const toolPages: SEOPageConfig[] = [
  {
    path: '/roi-calculator',
    title: 'Construction Software ROI Calculator - Calculate Your Savings | BuildDesk',
    description: 'Free ROI calculator for construction software. See how much you could save with BuildDesk based on your team size and current processes.',
    keywords: [
      'construction roi calculator',
      'software roi calculator',
      'construction savings calculator',
      'builddesk roi',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'tools',
    relatedPages: ['/pricing', '/features', '/resources/construction-roi-calculator-guide'],
  },
  {
    path: '/calculator',
    title: 'Construction Profitability Calculator - Free Tool | BuildDesk',
    description: 'Free construction profitability calculator. Calculate job margins, overhead allocation, and true project profit for your construction business.',
    keywords: [
      'construction profitability calculator',
      'job profit calculator',
      'contractor calculator',
      'margin calculator',
    ],
    priority: 0.8,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'tools',
    relatedPages: ['/roi-calculator', '/job-costing-software', '/resources/calculate-true-project-profitability'],
  },
  {
    path: '/financial-health-check',
    title: 'Construction Business Financial Health Check - Free Assessment',
    description: 'Free financial health check for construction businesses. Assess your cash flow, profitability, and financial processes in minutes.',
    keywords: [
      'construction financial health',
      'business assessment',
      'contractor financial check',
      'construction finance',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'tools',
    relatedPages: ['/calculator', '/resources/financial-intelligence-guide', '/pricing'],
  },
];

/**
 * Topic Hub Pages
 */
export const topicPages: SEOPageConfig[] = [
  {
    path: '/topics/construction-management-basics',
    title: 'Construction Management Basics - Complete Learning Hub | BuildDesk',
    description: 'Learn construction management fundamentals. Comprehensive guides on project planning, cost control, scheduling, and team management for contractors.',
    keywords: [
      'construction management basics',
      'construction management guide',
      'project management fundamentals',
      'contractor education',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'topics',
    relatedPages: ['/resources/best-construction-management-software-small-business-2025', '/features', '/blog'],
  },
  {
    path: '/topics/safety-and-osha-compliance',
    title: 'Construction Safety & OSHA Compliance Guide | BuildDesk',
    description: 'Complete guide to construction safety and OSHA compliance. Safety protocols, documentation requirements, and compliance best practices.',
    keywords: [
      'construction safety',
      'osha compliance',
      'construction safety guide',
      'osha requirements',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'topics',
    relatedPages: ['/osha-compliance-software', '/resources/osha-safety-logs-digital-playbook', '/features'],
  },
];

/**
 * Support and Legal Pages
 */
export const supportPages: SEOPageConfig[] = [
  {
    path: '/support',
    title: 'Customer Support - Help Center & Contact | BuildDesk',
    description: 'Get help with BuildDesk construction management software. Contact support, browse help articles, and access video tutorials.',
    keywords: [
      'builddesk support',
      'construction software help',
      'builddesk help center',
      'customer support',
    ],
    priority: 0.7,
    changeFreq: 'monthly',
    schemaType: 'WebPage',
    category: 'support',
    relatedPages: ['/faq', '/resources', '/knowledge-base'],
  },
  {
    path: '/resources',
    title: 'Construction Resources & Guides | BuildDesk',
    description: 'Free construction resources, guides, and best practices for contractors. Job costing, scheduling, compliance, and more.',
    keywords: [
      'construction resources',
      'contractor guides',
      'construction best practices',
      'free construction tools',
    ],
    priority: 0.8,
    changeFreq: 'weekly',
    schemaType: 'WebPage',
    category: 'support',
    relatedPages: ['/blog', '/topics/construction-management-basics', '/faq'],
  },
];

/**
 * Legal Pages (low priority, no-follow typically)
 */
export const legalPages: SEOPageConfig[] = [
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | BuildDesk',
    description: 'BuildDesk privacy policy. Learn how we collect, use, and protect your data.',
    keywords: ['privacy policy', 'data protection', 'builddesk privacy'],
    priority: 0.4,
    changeFreq: 'yearly',
    schemaType: 'WebPage',
    category: 'legal',
    relatedPages: ['/terms-of-service'],
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service | BuildDesk',
    description: 'BuildDesk terms of service. Read our terms and conditions for using the platform.',
    keywords: ['terms of service', 'terms and conditions', 'builddesk terms'],
    priority: 0.4,
    changeFreq: 'yearly',
    schemaType: 'WebPage',
    category: 'legal',
    relatedPages: ['/privacy-policy'],
  },
];

/**
 * All SEO Pages Combined
 */
export const allSEOPages: SEOPageConfig[] = [
  ...corePages,
  ...industryPages,
  ...featurePages,
  ...comparisonPages,
  ...resourcePages,
  ...toolPages,
  ...topicPages,
  ...supportPages,
  ...legalPages,
];

/**
 * Get SEO configuration for a specific path
 */
export function getSEOConfig(path: string): SEOPageConfig | undefined {
  return allSEOPages.find(page => page.path === path);
}

/**
 * Get related pages for internal linking
 */
export function getRelatedPages(path: string, limit = 4): SEOPageConfig[] {
  const currentPage = getSEOConfig(path);
  if (!currentPage?.relatedPages) return [];

  return currentPage.relatedPages
    .map(relatedPath => getSEOConfig(relatedPath))
    .filter((page): page is SEOPageConfig => page !== undefined)
    .slice(0, limit);
}

/**
 * Get pages by category for category listing pages
 */
export function getPagesByCategory(category: SEOCategory): SEOPageConfig[] {
  return allSEOPages.filter(page => page.category === category);
}

/**
 * Get all pages for sitemap generation
 */
export function getSitemapPages(): SEOPageConfig[] {
  return allSEOPages.filter(page => !page.noIndex);
}

/**
 * Get breadcrumb trail for a page
 */
export function getBreadcrumbs(path: string): Array<{ name: string; path: string }> {
  const page = getSEOConfig(path);

  // Default breadcrumb structure
  const defaultBreadcrumbs = [{ name: 'Home', path: '/' }];

  if (!page) return defaultBreadcrumbs;

  // Use custom breadcrumbs if defined
  if (page.breadcrumbs) {
    return [{ name: 'Home', path: '/' }, ...page.breadcrumbs];
  }

  // Auto-generate breadcrumbs based on path and category
  const pathParts = path.split('/').filter(Boolean);
  const breadcrumbs = [...defaultBreadcrumbs];

  if (page.category === 'resources' && pathParts[0] === 'resources') {
    breadcrumbs.push({ name: 'Resources', path: '/resources' });
  } else if (page.category === 'topics' && pathParts[0] === 'topics') {
    breadcrumbs.push({ name: 'Topics', path: '/blog' });
  } else if (page.category === 'features' && pathParts[0] === 'features') {
    breadcrumbs.push({ name: 'Features', path: '/features' });
  }

  // Add current page
  breadcrumbs.push({
    name: page.title.split(' | ')[0].split(' - ')[0],
    path: page.path
  });

  return breadcrumbs;
}

export default allSEOPages;
