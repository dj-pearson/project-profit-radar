import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
const LlmsTxtSchema = z.object({
  content: z.string().min(1).max(100_000),
}).passthrough();

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
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role').eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, LlmsTxtSchema, { name: 'save-llms-txt' });
    if (!parsed.ok) return parsed.response;
    const { content } = parsed.data;
    if (!content) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Content required' }),
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
      timestamp: new Date().toISOString(),
      success: true,
      message: 'llms.txt saved successfully',
      saved,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
