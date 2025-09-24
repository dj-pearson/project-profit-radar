/**
 * SEO Backend Synchronization Utilities
 * Ensures frontend SEO implementations are synced with backend systems
 */

import { supabase } from '@/integrations/supabase/client';

interface SEOPageData {
  page_path: string;
  title: string;
  description: string;
  keywords: string[];
  schema_markup?: object;
  priority: number;
  change_frequency: string;
  no_index?: boolean;
  no_follow?: boolean;
}

/**
 * Sync all new SEO-optimized pages to the backend database
 * This ensures sitemaps, robots.txt, and other backend systems include our content
 */
export const syncSEOPagesToBackend = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const seoPages: SEOPageData[] = [
      // Homepage
      {
        page_path: '/',
        title: 'Construction Management Software for Small & Mid GC Teams | BuildDesk',
        description: 'Job costing, scheduling, daily logs, OSHA reporting, and time tracking in one simple tool for U.S. contractors. Simple setup, fast onboarding, clear dashboards for jobs, crews, and costs.',
        keywords: ['construction management software', 'construction software for small business', 'job costing software construction', 'procore alternative small contractors'],
        priority: 1.0,
        change_frequency: 'daily',
        no_index: false,
        no_follow: false
      },

      // Resource Guides
      {
        page_path: '/resources/best-construction-management-software-small-business-2025',
        title: 'Best Construction Management Software for Small Business (2025) | BuildDesk',
        description: 'Complete guide to choosing construction management software for small contractors. Compare features, pricing, and ROI of top 10 platforms.',
        keywords: ['best construction management software', 'construction software small business', 'contractor software comparison'],
        priority: 0.8,
        change_frequency: 'monthly'
      },

      {
        page_path: '/resources/job-costing-construction-setup-guide',
        title: 'Job Costing in Construction: Setup Guide & Common Mistakes | BuildDesk',
        description: 'Master job costing with our step-by-step guide. Learn to track costs, improve margins, and avoid costly mistakes.',
        keywords: ['job costing construction', 'construction cost tracking', 'construction profit margins'],
        priority: 0.7,
        change_frequency: 'monthly'
      },

      {
        page_path: '/resources/osha-safety-logs-digital-playbook',
        title: 'OSHA Safety Logs: Digital Playbook for Construction Teams | BuildDesk',
        description: 'Complete guide to OSHA compliance. Templates, workflows, and digital tools to keep your team safe and compliant.',
        keywords: ['OSHA safety logs', 'construction safety compliance', 'OSHA digital forms'],
        priority: 0.7,
        change_frequency: 'monthly'
      },

      {
        page_path: '/resources/construction-scheduling-software-prevent-delays',
        title: 'Construction Scheduling Software: Stop Project Delays | BuildDesk',
        description: 'Simple scheduling rules that prevent delays. Learn how small contractors can improve project timelines.',
        keywords: ['construction scheduling software', 'project scheduling construction', 'prevent construction delays'],
        priority: 0.7,
        change_frequency: 'monthly'
      },

      {
        page_path: '/resources/construction-daily-logs-best-practices',
        title: 'Construction Daily Logs: What to Track and Why It Pays | BuildDesk',
        description: 'Essential guide to daily logs that reduce rework and improve project outcomes. Templates and best practices included.',
        keywords: ['construction daily logs', 'construction field reports', 'daily log templates'],
        priority: 0.7,
        change_frequency: 'monthly'
      },

      {
        page_path: '/resources/quickbooks-integration-guide',
        title: 'QuickBooks Integration Guide for Construction Companies | BuildDesk',
        description: 'Step-by-step guide to integrate QuickBooks with construction management software. Eliminate double entry, sync job costs automatically.',
        keywords: ['quickbooks construction integration', 'construction accounting software', 'job cost accounting'],
        priority: 0.7,
        change_frequency: 'monthly'
      },

      {
        page_path: '/resources/construction-mobile-app-guide',
        title: 'Best Construction Mobile Apps 2025 | Field Management Software',
        description: 'Discover the top construction mobile apps for field teams. Compare features, pricing, and benefits of leading construction management mobile solutions.',
        keywords: ['construction mobile app', 'field management software', 'construction app offline'],
        priority: 0.7,
        change_frequency: 'monthly'
      },

      // Comparison Pages
      {
        page_path: '/resources/procore-vs-builddesk-small-contractors',
        title: 'Procore vs BuildDesk: Which is Better for Small GC Teams? | 2025 Comparison',
        description: 'Honest comparison of Procore and BuildDesk for small contractors. Features, pricing, and ease of use compared.',
        keywords: ['procore vs builddesk', 'procore alternative', 'construction software comparison'],
        priority: 0.8,
        change_frequency: 'monthly'
      },

      {
        page_path: '/builddesk-vs-buildertrend-comparison',
        title: 'BuildDesk vs Buildertrend: Feature & Pricing Comparison 2025',
        description: 'Side-by-side comparison of BuildDesk and Buildertrend for residential and commercial contractors.',
        keywords: ['builddesk vs buildertrend', 'buildertrend alternative', 'residential construction software'],
        priority: 0.8,
        change_frequency: 'monthly'
      },

      {
        page_path: '/builddesk-vs-coconstruct',
        title: 'BuildDesk vs CoConstruct 2025: Which is Better for Your Construction Business?',
        description: 'Compare BuildDesk and CoConstruct construction management software. See pricing, features, pros and cons.',
        keywords: ['builddesk vs coconstruct', 'coconstruct alternative', 'construction management software comparison'],
        priority: 0.8,
        change_frequency: 'monthly'
      },

      // Topic Hubs
      {
        page_path: '/topics/construction-management-basics',
        title: 'Construction Management Basics: Complete Guide for Small Contractors',
        description: 'Master construction management fundamentals: project planning, cost control, team management, and execution strategies.',
        keywords: ['construction management basics', 'construction project management', 'contractor management guide'],
        priority: 0.6,
        change_frequency: 'monthly'
      },

      {
        page_path: '/topics/safety-and-osha-compliance',
        title: 'Safety & OSHA Compliance Hub: Construction Safety Management',
        description: 'Comprehensive safety management resources: OSHA compliance, digital safety tools, incident reporting, and best practices.',
        keywords: ['construction safety management', 'OSHA compliance', 'construction safety tools'],
        priority: 0.6,
        change_frequency: 'monthly'
      },

      // Core Pages
      {
        page_path: '/faq',
        title: 'Frequently Asked Questions | BuildDesk Construction Management',
        description: 'Get answers to common questions about BuildDesk construction management software. Pricing, features, implementation, and more.',
        keywords: ['builddesk faq', 'construction software questions', 'construction management help'],
        priority: 0.5,
        change_frequency: 'monthly'
      }
    ];

    // Batch upsert all pages
    const { error } = await supabase
      .from('seo_meta_tags')
      .upsert(
        seoPages.map(page => ({
          page_path: page.page_path,
          title: page.title,
          description: page.description,
          keywords: page.keywords, // Keep as array
          no_index: page.no_index || false,
          no_follow: page.no_follow || false,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'page_path' }
      );

    if (error) {
      console.error('Error syncing SEO pages:', error);
      return { success: false, message: `Database error: ${error.message}` };
    }

    return { 
      success: true, 
      message: `Successfully synced ${seoPages.length} SEO pages to backend database` 
    };

  } catch (error) {
    console.error('SEO sync error:', error);
    return { 
      success: false, 
      message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Update SEO configuration in the backend
 */
export const updateSEOConfiguration = async () => {
  try {
    const seoConfig = {
      canonical_domain: 'https://builddesk.com',
      site_name: 'BuildDesk',
      site_description: 'Construction Management Platform for SMB Contractors',
      meta_defaults: {
        title_suffix: ' | BuildDesk',
        og_type: 'website',
        twitter_card: 'summary_large_image',
        twitter_site: '@builddesk'
      },
      performance_thresholds: {
        lcp: 2500,
        fid: 100,
        cls: 0.1,
        fcp: 1800,
        ttfb: 600
      },
      ai_search_optimization: true,
      local_seo_enabled: true,
      service_areas: ['Colorado', 'Wyoming', 'Utah', 'New Mexico'],
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('seo_configurations')
      .upsert({
        canonical_domain: 'https://builddesk.com',
        site_name: 'BuildDesk',
        site_description: 'Construction Management Platform for SMB Contractors',
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return { success: true, message: 'SEO configuration updated successfully' };
  } catch (error) {
    console.error('Error updating SEO config:', error);
    return { success: false, message: `Configuration update failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

/**
 * Initialize SEO backend integration
 * Call this to ensure all SEO systems are properly synchronized
 */
export const initializeSEOBackendIntegration = async () => {
  try {
    console.log('🚀 Initializing SEO backend integration...');
    
    // Step 1: Sync all SEO pages
    const syncResult = await syncSEOPagesToBackend();
    if (!syncResult.success) {
      throw new Error(`Page sync failed: ${syncResult.message}`);
    }
    console.log('✅ SEO pages synced to database');

    // Step 2: Update SEO configuration
    const configResult = await updateSEOConfiguration();
    if (!configResult.success) {
      throw new Error(`Config update failed: ${configResult.message}`);
    }
    console.log('✅ SEO configuration updated');

    console.log('🎉 SEO backend integration complete!');
    return { success: true, message: 'SEO backend integration initialized successfully' };

  } catch (error) {
    console.error('❌ SEO backend integration failed:', error);
    return { 
      success: false, 
      message: `Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Check if SEO pages are properly synced
 */
export const checkSEOSyncStatus = async () => {
  try {
    const { data, error } = await supabase
      .from('seo_meta_tags')
      .select('page_path, title, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const expectedPaths = [
      '/',
      '/resources/best-construction-management-software-small-business-2025',
      '/resources/job-costing-construction-setup-guide',
      '/resources/osha-safety-logs-digital-playbook',
      '/builddesk-vs-coconstruct',
      '/topics/construction-management-basics',
      '/faq'
    ];

    const syncedPaths = data?.map(page => page.page_path) || [];
    const missingSyncPaths = expectedPaths.filter(path => !syncedPaths.includes(path));

    return {
      success: true,
      syncedPages: data?.length || 0,
      missingPages: missingSyncPaths.length,
      missingPaths: missingSyncPaths,
      lastSync: data?.[0]?.updated_at || null
    };

  } catch (error) {
    console.error('Error checking sync status:', error);
    return { 
      success: false, 
      message: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

export default {
  syncSEOPagesToBackend,
  updateSEOConfiguration,
  initializeSEOBackendIntegration,
  checkSEOSyncStatus
};