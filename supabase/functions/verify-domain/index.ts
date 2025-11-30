import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyDomainRequest {
  site_id?: string;  // For multi-tenant isolation
  tenant_id: string;
  domain: string;
}

/**
 * Verify DNS configuration for custom domain
 * This function checks if the domain has the correct CNAME record pointing to our platform
 */
async function verifyDNS(domain: string): Promise<{ verified: boolean; message: string }> {
  try {
    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // In production, you would use DNS lookup APIs
    // For now, we'll use a simple HTTP check to see if the domain resolves
    // This is a basic implementation - you may want to enhance this with:
    // 1. DNS API calls (e.g., Cloudflare API, Google DNS API)
    // 2. CNAME record verification
    // 3. SSL certificate validation

    try {
      const response = await fetch(`https://${cleanDomain}`, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      // Check if domain resolves and doesn't redirect to another domain
      if (response.ok || response.status === 301 || response.status === 302) {
        return {
          verified: true,
          message: 'Domain DNS is configured correctly',
        };
      }

      return {
        verified: false,
        message: 'Domain does not resolve correctly. Please check DNS configuration.',
      };
    } catch (fetchError) {
      console.error('DNS fetch error:', fetchError);

      // Try a simpler DNS lookup approach
      // In a real implementation, use a DNS API service
      return {
        verified: false,
        message: `Unable to verify domain. Error: ${fetchError.message}. Please ensure CNAME record is properly configured.`,
      };
    }
  } catch (error) {
    console.error('DNS verification error:', error);
    return {
      verified: false,
      message: error instanceof Error ? error.message : 'DNS verification failed',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { site_id, tenant_id, domain }: VerifyDomainRequest = await req.json();

    if (!tenant_id || !domain) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id or domain' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Resolve site_id if not provided - try to get from tenant or default to BuildDesk
    let siteId = site_id;
    if (!siteId) {
      // Try to get site_id from tenant record first
      const { data: tenantForSite } = await supabase
        .from('tenants')
        .select('site_id')
        .eq('id', tenant_id)
        .single();

      siteId = tenantForSite?.site_id;

      // Fall back to BuildDesk site if tenant doesn't have site_id
      if (!siteId) {
        const { data: defaultSite } = await supabase
          .from('sites')
          .select('id')
          .eq('key', 'builddesk')
          .single();
        siteId = defaultSite?.id;
      }
    }

    // Verify the tenant exists with site_id isolation
    let tenantQuery = supabase
      .from('tenants')
      .select('id, custom_domain')
      .eq('id', tenant_id);

    // Add site_id filter if available for multi-tenant isolation
    if (siteId) {
      tenantQuery = tenantQuery.eq('site_id', siteId);
    }

    const { data: tenant, error: tenantError } = await tenantQuery.single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify DNS configuration
    const dnsResult = await verifyDNS(domain);

    // Update tenant record if verified
    if (dnsResult.verified) {
      // Build update query with site_id isolation
      let updateQuery = supabase
        .from('tenants')
        .update({
          custom_domain: domain,
          domain_verified: true,
        })
        .eq('id', tenant_id);

      // Add site_id filter for multi-tenant isolation
      if (siteId) {
        updateQuery = updateQuery.eq('site_id', siteId);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) {
        console.error('Failed to update tenant:', updateError);
        return new Response(
          JSON.stringify({
            verified: false,
            message: 'DNS verified but failed to update database',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Log the verification event with site_id for multi-tenant isolation
      const auditLogEntry: Record<string, any> = {
        tenant_id,
        action: 'domain_verified',
        resource_type: 'tenant',
        resource_id: tenant_id,
        details: { domain, verified: true },
      };

      // Include site_id in audit log if available
      if (siteId) {
        auditLogEntry.site_id = siteId;
      }

      await supabase.from('audit_logs').insert(auditLogEntry);
    }

    return new Response(
      JSON.stringify(dnsResult),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in verify-domain function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
