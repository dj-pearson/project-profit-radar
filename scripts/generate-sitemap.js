import fs from 'fs';
import path from 'path';

// Generate sitemap during build process
function generateSitemap() {
  const currentDate = new Date().toISOString().split('T')[0];
  const domain = 'https://build-desk.com';
  
  const pages = [
    // Core pages
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/features', priority: '0.9', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { path: '/support', priority: '0.7', changefreq: 'monthly' },
    { path: '/knowledge-base', priority: '0.7', changefreq: 'weekly' },
    { path: '/tutorials', priority: '0.7', changefreq: 'weekly' },
    { path: '/resources', priority: '0.8', changefreq: 'weekly' },
    { path: '/tools', priority: '0.7', changefreq: 'monthly' },
    { path: '/roi-calculator', priority: '0.8', changefreq: 'monthly' },
    { path: '/tools/schedule-builder', priority: '0.8', changefreq: 'monthly' },
    
    // Authentication & onboarding
    { path: '/auth', priority: '0.3', changefreq: 'monthly' },
    { path: '/setup', priority: '0.3', changefreq: 'monthly' },
    
    // Legal pages
    { path: '/privacy-policy', priority: '0.4', changefreq: 'yearly' },
    { path: '/terms-of-service', priority: '0.4', changefreq: 'yearly' },
    
    // Industry/SEO pages
    { path: '/construction-management-software', priority: '0.8', changefreq: 'monthly' },
    { path: '/procore-alternative', priority: '0.8', changefreq: 'monthly' },
    { path: '/buildertrend-alternative', priority: '0.8', changefreq: 'monthly' },
    { path: '/job-costing-software', priority: '0.8', changefreq: 'monthly' },
    { path: '/construction-field-management', priority: '0.8', changefreq: 'monthly' },
    { path: '/osha-compliance-software', priority: '0.8', changefreq: 'monthly' },

    // Industry pages
    { path: '/residential-contractors', priority: '0.7', changefreq: 'monthly' },
    { path: '/commercial-contractors', priority: '0.7', changefreq: 'monthly' },
    { path: '/electrical-contractor-software', priority: '0.7', changefreq: 'monthly' },
    { path: '/hvac-contractor-software', priority: '0.7', changefreq: 'monthly' },
    { path: '/plumbing-contractor-software', priority: '0.7', changefreq: 'monthly' },

    // Blog/Resource articles with /resources prefix
    { path: '/resources/procore-alternatives-smb-contractors-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/top-10-construction-platforms-august-2025', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/construction-management-software-comparison', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/small-business-construction-software-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-project-management-best-practices', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-roi-calculator-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-scheduling-templates', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-cost-estimation-methods', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-compliance-checklist', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-crm-implementation-guide', priority: '0.7', changefreq: 'monthly' },
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
`;

  for (const page of pages) {
    const url = `${domain}${page.path}`;
    sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
  
`;
  }

  sitemap += `</urlset>`;

  // Write to public directory
  const publicDir = path.join(process.cwd(), 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log(`✅ Sitemap generated: ${sitemapPath}`);
  console.log(`📊 Total pages: ${pages.length}`);
  console.log(`📅 Last modified: ${currentDate}`);
}

// Run the generator
generateSitemap();
