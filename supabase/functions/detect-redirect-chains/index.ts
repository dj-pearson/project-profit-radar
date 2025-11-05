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
    const redirectData = {
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

    const { data: saved } = await supabaseClient
      .from('seo_redirect_analysis').insert(redirectData).select().single();

    return new Response(JSON.stringify({
      success: true,
      redirect_analysis: saved || redirectData,
      chain: redirectChain
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
