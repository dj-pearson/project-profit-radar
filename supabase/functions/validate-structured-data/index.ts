import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role').eq('id', user.id).single();

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
          url,
          schema_type: 'Invalid',
          schema_format: 'json-ld',
          schema_data: {},
          schema_raw: match[1],
          is_valid: false,
          validation_errors: [e.message],
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
