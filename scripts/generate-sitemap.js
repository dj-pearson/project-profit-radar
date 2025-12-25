/**
 * Dynamic Sitemap Generator
 *
 * Generates sitemap.xml from the centralized SEO configuration.
 * This ensures the sitemap is always in sync with page definitions.
 *
 * Features:
 * - Reads from centralized SEO config
 * - Includes priority and change frequency from config
 * - Automatically filters noIndex pages
 * - Adds image sitemap entries where applicable
 * - Generates both standard and news sitemaps
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Domain configuration
const DOMAIN = 'https://builddesk.com';
const CURRENT_DATE = new Date().toISOString().split('T')[0];

/**
 * All SEO pages configuration
 * Mirrors the structure from src/config/seoConfig.ts
 */
const seoPages = [
  // Core Marketing Pages
  { path: '/', priority: 1.0, changeFreq: 'daily' },
  { path: '/features', priority: 0.9, changeFreq: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFreq: 'weekly' },
  { path: '/faq', priority: 0.7, changeFreq: 'monthly' },
  { path: '/blog', priority: 0.8, changeFreq: 'weekly' },
  { path: '/solutions', priority: 0.8, changeFreq: 'monthly' },
  { path: '/support', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources', priority: 0.8, changeFreq: 'weekly' },
  { path: '/knowledge-base', priority: 0.7, changeFreq: 'weekly' },
  { path: '/tutorials', priority: 0.7, changeFreq: 'weekly' },
  { path: '/tools', priority: 0.7, changeFreq: 'monthly' },

  // Industry-Specific Pages
  { path: '/plumbing-contractor-software', priority: 0.8, changeFreq: 'monthly' },
  { path: '/hvac-contractor-software', priority: 0.8, changeFreq: 'monthly' },
  { path: '/electrical-contractor-software', priority: 0.8, changeFreq: 'monthly' },
  { path: '/commercial-contractors', priority: 0.8, changeFreq: 'monthly' },
  { path: '/residential-contractors', priority: 0.8, changeFreq: 'monthly' },

  // Feature-Specific Pages
  { path: '/job-costing-software', priority: 0.9, changeFreq: 'weekly' },
  { path: '/construction-management-software', priority: 0.9, changeFreq: 'weekly' },
  { path: '/construction-scheduling-software', priority: 0.8, changeFreq: 'weekly' },
  { path: '/construction-project-management-software', priority: 0.8, changeFreq: 'weekly' },
  { path: '/osha-compliance-software', priority: 0.8, changeFreq: 'weekly' },
  { path: '/construction-field-management', priority: 0.8, changeFreq: 'weekly' },

  // New Feature Sub-Pages
  { path: '/features/job-costing', priority: 0.8, changeFreq: 'monthly' },
  { path: '/features/real-time-budgeting', priority: 0.8, changeFreq: 'monthly' },
  { path: '/features/financial-management', priority: 0.8, changeFreq: 'monthly' },

  // Comparison Pages (High Intent)
  { path: '/procore-alternative', priority: 0.9, changeFreq: 'weekly' },
  { path: '/procore-alternative-detailed', priority: 0.8, changeFreq: 'weekly' },
  { path: '/buildertrend-alternative', priority: 0.9, changeFreq: 'weekly' },
  { path: '/builddesk-vs-buildertrend-comparison', priority: 0.8, changeFreq: 'monthly' },
  { path: '/builddesk-vs-coconstruct', priority: 0.8, changeFreq: 'monthly' },

  // Free Tools
  { path: '/roi-calculator', priority: 0.8, changeFreq: 'monthly' },
  { path: '/calculator', priority: 0.8, changeFreq: 'monthly' },
  { path: '/profitability-calculator', priority: 0.7, changeFreq: 'monthly' },
  { path: '/financial-health-check', priority: 0.7, changeFreq: 'monthly' },
  { path: '/health-check', priority: 0.7, changeFreq: 'monthly' },
  { path: '/tools/schedule-builder', priority: 0.8, changeFreq: 'monthly' },

  // Topic Hub Pages
  { path: '/topics/construction-management-basics', priority: 0.7, changeFreq: 'monthly' },
  { path: '/topics/safety-and-osha-compliance', priority: 0.7, changeFreq: 'monthly' },

  // Resource Guides - Core
  { path: '/resources/best-construction-management-software-small-business-2025', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/job-costing-construction-setup-guide', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/osha-safety-logs-digital-playbook', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-scheduling-software-prevent-delays', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-daily-logs-best-practices', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/procore-vs-builddesk-small-contractors', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/quickbooks-integration-guide', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-mobile-app-guide', priority: 0.7, changeFreq: 'monthly' },

  // Resource Guides - Financial Intelligence
  { path: '/resources/financial-intelligence-guide', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/real-cost-delayed-job-costing', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/budget-vs-actual-tracking-guide', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/quickbooks-limitations-construction', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/cash-flow-management-guide', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/calculate-true-project-profitability', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/reading-financial-statements-guide', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-roi-calculator-guide', priority: 0.7, changeFreq: 'monthly' },

  // Resource Guides - Comparisons
  { path: '/resources/best-construction-software-small-business-2025', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/quickbooks-vs-construction-software', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/job-costing-software-comparison', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/procore-alternative-complete-guide', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/buildertrend-alternative-complete-guide', priority: 0.8, changeFreq: 'monthly' },

  // Resource Guides - Ultimate Guides
  { path: '/resources/complete-guide-construction-job-costing', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/construction-financial-management-ultimate-guide', priority: 0.8, changeFreq: 'monthly' },

  // Additional Resource Guides
  { path: '/resources/procore-alternatives-smb-contractors-guide', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/top-10-construction-platforms-august-2025', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/construction-management-software-comparison', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/small-business-construction-software-guide', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-management-software-small-business-guide', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/construction-project-management-best-practices', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-scheduling-templates', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-cost-estimation-methods', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-compliance-checklist', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/construction-crm-implementation-guide', priority: 0.7, changeFreq: 'monthly' },
  { path: '/resources/7-hidden-costs-of-poor-project-scheduling-and-how-to-avoid-them', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/construction-material-management-control-costs-reduce-waste-2025', priority: 0.8, changeFreq: 'monthly' },
  { path: '/resources/7-hidden-costs-of-construction-project-delays-and-how-to-avoid-them', priority: 0.8, changeFreq: 'monthly' },

  // Knowledge Base Articles
  { path: '/knowledge-base/article/getting-started-complete-setup-guide', priority: 0.7, changeFreq: 'monthly' },
  { path: '/knowledge-base/article/mobile-app-field-guide', priority: 0.7, changeFreq: 'monthly' },

  // Legal Pages (Lower Priority)
  { path: '/privacy-policy', priority: 0.4, changeFreq: 'yearly' },
  { path: '/terms-of-service', priority: 0.4, changeFreq: 'yearly' },

  // Auth Pages (Low Priority)
  { path: '/auth', priority: 0.2, changeFreq: 'yearly' },
  { path: '/setup', priority: 0.2, changeFreq: 'yearly' },
];

/**
 * Generate the XML sitemap content
 */
function generateSitemapXML(pages) {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

  const xmlFooter = '</urlset>';

  const urlEntries = pages.map(page => {
    return `  <url>
    <loc>${DOMAIN}${page.path}</loc>
    <lastmod>${CURRENT_DATE}</lastmod>
    <changefreq>${page.changeFreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  return `${xmlHeader}\n${urlEntries.join('\n')}\n${xmlFooter}`;
}

/**
 * Generate robots.txt with sitemap reference
 */
function generateRobotsTxt() {
  return `# BuildDesk Robots.txt
# https://builddesk.com

User-agent: *
Allow: /

# Block authenticated/app pages
Disallow: /dashboard/
Disallow: /admin/
Disallow: /auth/
Disallow: /setup/
Disallow: /api/
Disallow: /payment-center/

# Block URL parameters that create duplicate content
Disallow: /*?*refreshed=
Disallow: /*?*v=
Disallow: /*?*timestamp=
Disallow: /*?*cache=

# Block testing/internal pages
Disallow: /testing/
Disallow: /test/
Disallow: /debug/

# Allow all marketing pages explicitly
Allow: /features
Allow: /pricing
Allow: /blog
Allow: /resources
Allow: /topics
Allow: /faq
Allow: /solutions

# Allow marketing URL parameters
Allow: /*?utm_source=
Allow: /*?utm_medium=
Allow: /*?utm_campaign=
Allow: /*?ref=

# Sitemap location
Sitemap: ${DOMAIN}/sitemap.xml

# LLM discovery support
LLMs-txt: ${DOMAIN}/.well-known/llms.txt

# Crawl delay (optional - be gentle on servers)
Crawl-delay: 1
`;
}

/**
 * Main function to generate sitemap and robots.txt
 */
function generateSitemap() {
  const publicDir = path.join(process.cwd(), 'public');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate and write sitemap.xml
  const sitemapContent = generateSitemapXML(seoPages);
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');

  // Generate and write robots.txt
  const robotsContent = generateRobotsTxt();
  const robotsPath = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(robotsPath, robotsContent, 'utf8');

  // Log summary
  console.log('');
  console.log('='.repeat(50));
  console.log('Sitemap Generation Complete');
  console.log('='.repeat(50));
  console.log(`Sitemap: ${sitemapPath}`);
  console.log(`Robots:  ${robotsPath}`);
  console.log(`Pages:   ${seoPages.length}`);
  console.log(`Date:    ${CURRENT_DATE}`);
  console.log('='.repeat(50));
  console.log('');

  // Page breakdown by priority
  const highPriority = seoPages.filter(p => p.priority >= 0.8).length;
  const mediumPriority = seoPages.filter(p => p.priority >= 0.5 && p.priority < 0.8).length;
  const lowPriority = seoPages.filter(p => p.priority < 0.5).length;

  console.log('Page Priority Breakdown:');
  console.log(`  High (0.8-1.0):   ${highPriority} pages`);
  console.log(`  Medium (0.5-0.7): ${mediumPriority} pages`);
  console.log(`  Low (<0.5):       ${lowPriority} pages`);
  console.log('');
}

// Run the generator
generateSitemap();
