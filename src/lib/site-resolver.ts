import { supabase } from '@/integrations/supabase/client';

export interface SiteConfig {
  id: string;
  key: string;
  name: string;
  domain: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    favicon_url?: string;
  };
  features?: Record<string, boolean>;
}

/**
 * Get site configuration based on current domain
 */
export async function getSiteConfig(): Promise<SiteConfig | null> {
  try {
    const hostname = window.location.hostname;
    
    // Map domains to site keys
    const siteKeyMap: Record<string, string> = {
      'build-desk.com': 'builddesk',
      'www.build-desk.com': 'builddesk',
      'builddesk.pearsonperformance.workers.dev': 'builddesk',
      'localhost': 'builddesk',  // Development
      '127.0.0.1': 'builddesk',  // Development
      
      // Add future sites here:
      // 'realestatebio.com': 'realestate',
      // 'salonpros.bio': 'salonpros',
    };
    
    const siteKey = siteKeyMap[hostname];
    if (!siteKey) {
      console.error(`Unknown domain: ${hostname}, defaulting to builddesk`);
      // Default to builddesk for unknown domains in development
      return getSiteByKey('builddesk');
    }
    
    return getSiteByKey(siteKey);
  } catch (error) {
    console.error('Error resolving site:', error);
    return null;
  }
}

/**
 * Get site by key
 */
async function getSiteByKey(siteKey: string): Promise<SiteConfig | null> {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('key', siteKey)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.error('Failed to fetch site config:', error);
      return null;
    }
    
    return data as SiteConfig;
  } catch (error) {
    console.error('Error fetching site by key:', error);
    return null;
  }
}

/**
 * Get the current site ID from localStorage or resolve it
 */
export async function getCurrentSiteId(): Promise<string | null> {
  // Try localStorage first (cached)
  const cachedSiteId = localStorage.getItem('site_id');
  const cachedSiteKey = localStorage.getItem('site_key');
  
  if (cachedSiteId && cachedSiteKey) {
    // Verify cache is still valid
    const currentConfig = await getSiteConfig();
    if (currentConfig && currentConfig.id === cachedSiteId) {
      return cachedSiteId;
    }
  }
  
  // Resolve from domain
  const siteConfig = await getSiteConfig();
  if (siteConfig) {
    localStorage.setItem('site_id', siteConfig.id);
    localStorage.setItem('site_key', siteConfig.key);
    localStorage.setItem('site_config', JSON.stringify(siteConfig));
    return siteConfig.id;
  }
  
  return null;
}

/**
 * Clear cached site data (call on logout)
 */
export function clearSiteCache() {
  localStorage.removeItem('site_id');
  localStorage.removeItem('site_key');
  localStorage.removeItem('site_config');
}

/**
 * Get cached site config
 */
export function getCachedSiteConfig(): SiteConfig | null {
  try {
    const cached = localStorage.getItem('site_config');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

