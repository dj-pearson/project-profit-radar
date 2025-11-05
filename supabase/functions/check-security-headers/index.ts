import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      .from('user_profiles')
      .select('role')
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
    const headers = response.headers;

    const securityData = {
      url,
      has_https: url.startsWith('https://'),
      has_hsts: headers.has('strict-transport-security'),
      hsts_max_age: headers.get('strict-transport-security')?.match(/max-age=(\d+)/)?.[1] || null,
      has_csp: headers.has('content-security-policy'),
      csp_policy: headers.get('content-security-policy')?.substring(0, 500) || null,
      has_x_frame_options: headers.has('x-frame-options'),
      x_frame_options_value: headers.get('x-frame-options') || null,
      has_x_content_type_options: headers.has('x-content-type-options'),
      has_referrer_policy: headers.has('referrer-policy'),
      referrer_policy_value: headers.get('referrer-policy') || null,
      security_score: calculateSecurityScore(url, headers),
      security_grade: 'A',
      security_issues: [],
      impacts_seo: !url.startsWith('https://'),
    };

    const { data: saved } = await supabaseClient
      .from('seo_security_analysis')
      .insert(securityData)
      .select()
      .single();

    return new Response(JSON.stringify({ success: true, security_analysis: saved || securityData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function calculateSecurityScore(url: string, headers: Headers): number {
  let score = url.startsWith('https://') ? 50 : 0;
  if (headers.has('strict-transport-security')) score += 15;
  if (headers.has('content-security-policy')) score += 15;
  if (headers.has('x-frame-options')) score += 10;
  if (headers.has('x-content-type-options')) score += 5;
  if (headers.has('referrer-policy')) score += 5;
  return Math.min(100, score);
}
