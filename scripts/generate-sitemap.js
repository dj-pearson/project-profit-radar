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
    { path: '/blog', priority: '0.8', changefreq: 'weekly' },
    { path: '/solutions', priority: '0.8', changefreq: 'monthly' },
    { path: '/faq', priority: '0.7', changefreq: 'monthly' },
    { path: '/tools', priority: '0.7', changefreq: 'monthly' },
    { path: '/roi-calculator', priority: '0.8', changefreq: 'monthly' },
    { path: '/tools/schedule-builder', priority: '0.8', changefreq: 'monthly' },

    // Authentication & onboarding (low priority)
    { path: '/auth', priority: '0.2', changefreq: 'yearly' },
    { path: '/setup', priority: '0.2', changefreq: 'yearly' },

    // Legal pages
    { path: '/privacy-policy', priority: '0.4', changefreq: 'yearly' },
    { path: '/terms-of-service', priority: '0.4', changefreq: 'yearly' },

    // HIGH PRIORITY: Comparison pages (high intent keywords)
    { path: '/procore-alternative', priority: '0.9', changefreq: 'weekly' },
    { path: '/procore-alternative-detailed', priority: '0.8', changefreq: 'weekly' },
    { path: '/buildertrend-alternative', priority: '0.9', changefreq: 'weekly' },
    { path: '/builddesk-vs-buildertrend-comparison', priority: '0.8', changefreq: 'monthly' },
    { path: '/builddesk-vs-coconstruct', priority: '0.8', changefreq: 'monthly' },

    // HIGH PRIORITY: Solution pages (feature-specific)
    { path: '/job-costing-software', priority: '0.9', changefreq: 'weekly' },
    { path: '/construction-management-software', priority: '0.9', changefreq: 'weekly' },
    { path: '/construction-project-management-software', priority: '0.8', changefreq: 'weekly' },
    { path: '/construction-scheduling-software', priority: '0.8', changefreq: 'weekly' },
    { path: '/construction-field-management', priority: '0.8', changefreq: 'weekly' },
    { path: '/osha-compliance-software', priority: '0.8', changefreq: 'weekly' },

    // Industry pages (vertical-specific)
    { path: '/residential-contractors', priority: '0.8', changefreq: 'monthly' },
    { path: '/commercial-contractors', priority: '0.8', changefreq: 'monthly' },
    { path: '/electrical-contractor-software', priority: '0.8', changefreq: 'monthly' },
    { path: '/hvac-contractor-software', priority: '0.8', changefreq: 'monthly' },
    { path: '/plumbing-contractor-software', priority: '0.8', changefreq: 'monthly' },

    // Resource guides (high-value content)
    { path: '/resources/best-construction-management-software-small-business-2025', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/job-costing-construction-setup-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/osha-safety-logs-digital-playbook', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-scheduling-software-prevent-delays', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-daily-logs-best-practices', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/procore-vs-builddesk-small-contractors', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/quickbooks-integration-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-mobile-app-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/procore-alternatives-smb-contractors-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/top-10-construction-platforms-august-2025', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/construction-management-software-comparison', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/small-business-construction-software-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-management-software-small-business-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/construction-project-management-best-practices', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-roi-calculator-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-scheduling-templates', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-cost-estimation-methods', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-compliance-checklist', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-crm-implementation-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/7-hidden-costs-of-poor-project-scheduling-and-how-to-avoid-them', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/construction-material-management-control-costs-reduce-waste-2025', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/7-hidden-costs-of-construction-project-delays-and-how-to-avoid-them', priority: '0.8', changefreq: 'monthly' },

    // Topic pages
    { path: '/topics/construction-management-basics', priority: '0.7', changefreq: 'monthly' },
    { path: '/topics/safety-and-osha-compliance', priority: '0.7', changefreq: 'monthly' },

    // Knowledge base articles
    { path: '/knowledge-base/article/getting-started-complete-setup-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/knowledge-base/article/mobile-app-field-guide', priority: '0.7', changefreq: 'monthly' },
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
