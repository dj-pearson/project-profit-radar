// Detect Redirect Chains Edge Function
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
    console.log("[DETECT-REDIRECTS] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const redirectChain: string[] = [url];
    let currentUrl = url;
    let maxHops = 10;

    while (maxHops > 0) {
      try {
        const response = await fetch(currentUrl, { method: 'HEAD', redirect: 'manual' });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            currentUrl = new URL(location, currentUrl).href;
            redirectChain.push(currentUrl);
            maxHops--;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (error) {
        break;
      }
    }

    const hasChain = redirectChain.length > 2;
    const redirectData = {  // CRITICAL: Site isolation
      source_url: url,
      destination_url: redirectChain[redirectChain.length - 1],
      redirect_type: 301,
      redirect_chain: redirectChain,
      chain_length: redirectChain.length - 1,
      has_issues: hasChain,
      issue_type: hasChain ? 'chain' : null,
      issue_description: hasChain ? `Redirect chain detected with ${redirectChain.length - 1} hops` : null,
      recommendation: hasChain ? 'Replace redirect chain with direct 301 redirect' : 'No issues found',
      priority: hasChain ? 'medium' : 'low',
    };

    // The insert's error was discarded and supabase-js returns it rather than
    // throwing. The `saved || <data>` fallback below then hid the consequence
    // perfectly: when the insert failed, `saved` was null and the response fell
    // back to the in-memory object, so the caller received what looked like a
    // stored analysis record while the table it is supposed to live in stayed
    // empty (US-300). The computed analysis is still returned - one caller uses
    // it inline - but `stored` now says whether it was persisted.
    const { data: saved, error: saveError } = await supabaseClient
      .from('seo_redirect_analysis').insert(redirectData).select().single();

    if (saveError) {
      console.error(
        '[DETECT-REDIRECT-CHAINS] Analysis completed but was NOT stored:',
        saveError.message,
      );
    }

    return new Response(JSON.stringify({
      success: true,
      redirect_analysis: saved || redirectData,
      stored: !saveError,
      storage_error: saveError?.message ?? null,
      chain: redirectChain
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
