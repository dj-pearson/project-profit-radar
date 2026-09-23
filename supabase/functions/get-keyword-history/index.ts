// Get Keyword History Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// root_admin only; no caller in src/ or Brikly-iOS/.
const KeywordHistorySchema = z.object({
  keyword_id: z.string().max(255).nullish(),
  limit: z.number().int().positive().max(1000).optional(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[GET-KEYWORD-HISTORY] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, KeywordHistorySchema, { name: 'get-keyword-history' });
    if (!parsed.ok) return parsed.response;
    const { keyword_id, limit = 30 } = parsed.data;

    if (!keyword_id) {
      // Get all keywords with latest position and site isolation
      const { data: keywords } = await supabaseClient
        .from('seo_keywords')
        .select('*')
          // CRITICAL: Site isolation
        .order('created_at', { ascending: false })
        .limit(limit);

      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        success: true,
        keywords: keywords || [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Get history for specific keyword with site isolation
    const { data: history } = await supabaseClient
      .from('seo_keyword_history')
      .select('*')
        // CRITICAL: Site isolation
      .eq('keyword_id', keyword_id)
      .order('checked_at', { ascending: false })
      .limit(limit);

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: true,
      history: history || [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
