// Get Audit History Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;

    // Check user role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url, limit = 50 } = await req.json();

    // Query with site isolation
    let query = supabaseClient
      .from('seo_audit_history')
      .select('*')
        // CRITICAL: Site isolation
      .order('created_at', { ascending: false })
      .limit(limit);

    if (url) {
      query = query.eq('url', url);
    }

    const { data: audits, error: fetchError } = await query;

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      audits: audits || [],
      total: audits?.length || 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
