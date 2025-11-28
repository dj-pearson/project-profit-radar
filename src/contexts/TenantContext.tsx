import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TenantRow = Database['public']['Tables']['tenants']['Row'];

export interface TenantBranding {
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  favicon_url?: string | null;
  email_logo_url?: string | null;
}

export interface TenantFeatures {
  white_label?: boolean;
  custom_domain?: boolean;
  custom_integrations?: boolean;
  advanced_automation?: boolean;
  dedicated_support?: boolean;
  multi_company_management?: boolean;
}

export interface Tenant extends TenantRow {
  branding: TenantBranding;
  features: TenantFeatures;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  resolveTenant: (domain?: string) => Promise<void>;
  applyBranding: (branding: TenantBranding) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Default BuildDesk tenant configuration
const DEFAULT_TENANT: Partial<Tenant> = {
  id: 'default',
  name: 'BuildDesk',
  display_name: 'BuildDesk',
  slug: 'builddesk',
  custom_domain: null,
  domain_verified: false,
  branding: {
    logo_url: null,
    primary_color: '#F97316', // construction-orange
    secondary_color: '#1F2937', // construction-dark
    favicon_url: null,
    email_logo_url: null,
  },
  features: {
    white_label: false,
    custom_domain: false,
  },
  plan_tier: 'professional',
  is_active: true,
};

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply branding CSS variables to the document
  const applyBranding = (branding: TenantBranding) => {
    const root = document.documentElement;

    if (branding.primary_color) {
      root.style.setProperty('--tenant-primary', branding.primary_color);
      root.style.setProperty('--construction-orange', branding.primary_color);
    }

    if (branding.secondary_color) {
      root.style.setProperty('--tenant-secondary', branding.secondary_color);
      root.style.setProperty('--construction-dark', branding.secondary_color);
    }

    // Update favicon if custom one is provided
    if (branding.favicon_url) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) {
        favicon.href = branding.favicon_url;
      }
    }
  };

  // Resolve tenant from domain
  const resolveTenant = async (customDomain?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get the current hostname
      const hostname = customDomain || window.location.hostname;

      // Skip tenant resolution for localhost and default domains
      const isDefaultDomain =
        hostname === 'localhost' ||
        hostname.includes('127.0.0.1') ||
        hostname.includes('builddesk.com') ||
        hostname.includes('build-desk.com') ||
        hostname.includes('builddesk.pearsonperformance.workers.dev') ||
        hostname.includes('.pages.dev');

      if (isDefaultDomain) {
        // Use default BuildDesk tenant
        setTenant(DEFAULT_TENANT as Tenant);
        applyBranding(DEFAULT_TENANT.branding!);
        setLoading(false);
        return;
      }

      // Query for tenant by custom_domain
      const { data, error: queryError } = await supabase
        .from('tenants')
        .select('*')
        .eq('custom_domain', hostname)
        .eq('domain_verified', true)
        .eq('is_active', true)
        .single();

      if (queryError || !data) {
        console.warn('No verified tenant found for domain (or query failed):', hostname, queryError?.message);
        // Fall back to default tenant - don't block auth if tenant query fails
        setTenant(DEFAULT_TENANT as Tenant);
        applyBranding(DEFAULT_TENANT.branding!);
        setLoading(false);
        return;
      }

      // Parse JSONB fields
      const tenantData: Tenant = {
        ...data,
        branding: (data.branding as TenantBranding) || DEFAULT_TENANT.branding!,
        features: (data.features as TenantFeatures) || DEFAULT_TENANT.features!,
      };

      setTenant(tenantData);
      applyBranding(tenantData.branding);

    } catch (err) {
      console.error('Error resolving tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve tenant');
      // Fall back to default tenant on error
      setTenant(DEFAULT_TENANT as Tenant);
      applyBranding(DEFAULT_TENANT.branding!);
    } finally {
      setLoading(false);
    }
  };

  // Resolve tenant on mount
  useEffect(() => {
    resolveTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, resolveTenant, applyBranding }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
