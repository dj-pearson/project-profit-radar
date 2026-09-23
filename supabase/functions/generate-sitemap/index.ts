import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// root_admin only; no caller in src/ or Brikly-iOS/. Each entry is
// interpolated into XML, so the fields are bounded; priority is accepted as a
// number or a string because the template prints either.
const GenerateSitemapSchema = z.object({
  base_url: z.string().min(1).max(2048),
  urls: z.array(z.object({
    url: z.string().max(2048),
    lastmod: z.string().max(64).nullish(),
    changefreq: z.string().max(20).nullish(),
    priority: z.union([z.number(), z.string().max(10)]).nullish(),
  }).passthrough()).max(50000).nullish(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, GenerateSitemapSchema, { name: 'generate-sitemap' });
    if (!parsed.ok) return parsed.response;
    const { base_url, urls } = parsed.data;
    if (!base_url) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'base_url required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate sitemap XML
    const urlEntries = (urls || []).map((entry: any) => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${entry.changefreq || 'weekly'}</changefreq>
    <priority>${entry.priority || '0.5'}</priority>
  </url>`).join('');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    return new Response(JSON.stringify({ timestamp: new Date().toISOString(), success: true, sitemap, url_count: urls?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
