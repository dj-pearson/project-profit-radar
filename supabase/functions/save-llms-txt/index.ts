import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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

    const { content } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: 'Content required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // The user presses Save and is told it saved. The error was discarded
    // and supabase-js returns it rather than throwing, so a rejected upsert
    // still answered 'llms.txt saved successfully' - with `saved: null`
    // in the body as the only hint, which nothing reads (US-300).
    const { data: saved, error: saveError } = await supabaseClient
      .from('seo_settings')
      .upsert({
        company_id: null,
        setting_key: 'llms_txt',
        setting_value: { content },
        updated_by: user.id,
      }, {
        onConflict: 'company_id,setting_key',
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`llms.txt was NOT saved: ${saveError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'llms.txt saved successfully',
      saved,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
