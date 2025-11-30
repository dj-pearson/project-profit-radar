// Validate Structured Data Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;
    console.log("[VALIDATE-STRUCTURED-DATA] User authenticated", { userId: user.id, siteId });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url);
    const html = await response.text();

    // Extract JSON-LD structured data
    const schemaMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    const schemas = [];

    for (const match of schemaMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        const schemaType = jsonData['@type'] || 'Unknown';

        schemas.push({
          site_id: siteId,  // CRITICAL: Site isolation
          url,
          schema_type: schemaType,
          schema_format: 'json-ld',
          schema_data: jsonData,
          schema_raw: match[1],
          is_valid: true,
          validation_errors: [],
          eligible_for_rich_results: true,
          is_implemented_correctly: true,
        });
      } catch (e) {
        schemas.push({
          site_id: siteId,  // CRITICAL: Site isolation
          url,
          schema_type: 'Invalid',
          schema_format: 'json-ld',
          schema_data: {},
          schema_raw: match[1],
          is_valid: false,
          validation_errors: [(e as Error).message],
          eligible_for_rich_results: false,
          is_implemented_correctly: false,
        });
      }
    }

    if (schemas.length > 0) {
      await supabaseClient.from('seo_structured_data').insert(schemas);
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_schemas: schemas.length,
        valid_schemas: schemas.filter(s => s.is_valid).length,
        invalid_schemas: schemas.filter(s => !s.is_valid).length,
      },
      schemas
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
