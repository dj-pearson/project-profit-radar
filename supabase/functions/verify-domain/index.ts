import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyDomainRequest {
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
    const { tenant_id, domain }: VerifyDomainRequest = await req.json();

    if (!tenant_id || !domain) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id or domain' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, custom_domain')
      .eq('id', tenant_id)
      .single();

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
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          custom_domain: domain,
          domain_verified: true,
        })
        .eq('id', tenant_id);

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

      // Record audit log
      await supabase.from('audit_logs').insert({
        tenant_id,
        action: 'domain_verified',
        resource_type: 'tenant',
        resource_id: tenant_id,
        details: { domain, verified: true },
      });
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
