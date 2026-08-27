// Detect Duplicate Content Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[DETECT-DUPLICATE] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url_1, url_2 } = await req.json();
    if (!url_1 || !url_2) {
      return new Response(JSON.stringify({ error: 'Two URLs required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [response1, response2] = await Promise.all([
      fetch(url_1).then(r => r.text()),
      fetch(url_2).then(r => r.text())
    ]);

    const content1 = response1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const content2 = response2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Simple similarity calculation
    const words1 = content1.toLowerCase().split(' ');
    const words2 = content2.toLowerCase().split(' ');
    const commonWords = words1.filter(w => words2.includes(w)).length;
    const similarity = (commonWords / Math.max(words1.length, words2.length)) * 100;

    const duplicateData = {  // CRITICAL: Site isolation
      url_1,
      url_2,
      similarity_score: Math.round(similarity * 100) / 100,
      duplicate_type: similarity > 90 ? 'exact' : similarity > 70 ? 'near' : 'different',
      duplicate_scope: similarity > 90 ? 'full_page' : 'section',
      severity: similarity > 90 ? 'high' : similarity > 70 ? 'medium' : 'low',
      recommended_action: similarity > 90 ? 'add_canonical' : 'review',
      is_resolved: false,
    };

    // The insert's error was discarded and supabase-js returns it rather than
    // throwing. The `saved || <data>` fallback below then hid the consequence
    // perfectly: when the insert failed, `saved` was null and the response fell
    // back to the in-memory object, so the caller received what looked like a
    // stored analysis record while the table it is supposed to live in stayed
    // empty (US-300). The computed analysis is still returned - one caller uses
    // it inline - but `stored` now says whether it was persisted.
    const { data: saved, error: saveError } = await supabaseClient
      .from('seo_duplicate_content').insert(duplicateData).select().single();

    if (saveError) {
      console.error(
        '[DETECT-DUPLICATE-CONTENT] Analysis completed but was NOT stored:',
        saveError.message,
      );
    }

    return new Response(JSON.stringify({
      success: true,
      duplicate_analysis: saved || duplicateData,
      stored: !saveError,
      storage_error: saveError?.message ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
