import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// og_image_url is not .url(): the SEO manager posts whatever is in the input,
// including an empty string.
const MetaSettingsSchema = z.object({
  meta_description_template: z.string().max(1000).nullish(),
  og_image_url: z.string().max(2048).nullish(),
  twitter_card_type: z.string().max(32).nullish(),
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

    const parsed = await validateBody(req, MetaSettingsSchema, { name: 'save-meta-settings' });
    if (!parsed.ok) return parsed.response;
    const { meta_description_template, og_image_url, twitter_card_type } = parsed.data;

    // The user presses Save and is told it saved. The error was discarded
    // and supabase-js returns it rather than throwing, so a rejected upsert
    // still answered 'Meta settings saved successfully' - with `saved: null`
    // in the body as the only hint, which nothing reads (US-300).
    const { data: saved, error: saveError } = await supabaseClient
      .from('seo_settings')
      .upsert({
        company_id: null,
        setting_key: 'meta_tags',
        setting_value: {
          meta_description_template,
          og_image_url,
          twitter_card_type: twitter_card_type || 'summary_large_image',
        },
        updated_by: user.id,
      }, {
        onConflict: 'company_id,setting_key',
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Meta settings were NOT saved: ${saveError.message}`);
    }

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Meta settings saved successfully',
      saved,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    await captureException(error, { fn: 'save-meta-settings', req });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
