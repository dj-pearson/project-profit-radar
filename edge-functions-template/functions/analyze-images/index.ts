// Analyze Images Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;

    // Check user role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
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
    const html = await response.text();
    const imageMatches = html.matchAll(/<img([^>]*)>/gi);
    const images = [];

    for (const match of imageMatches) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src=["']([^"']*)["']/i);
      const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
      const titleMatch = imgTag.match(/title=["']([^"']*)["']/i);

      if (srcMatch) {
        const imageUrl = new URL(srcMatch[1], url).href;
        images.push({
          site_id: siteId,  // CRITICAL: Include site_id
          source_page_url: url,
          image_url: imageUrl,
          image_alt: altMatch ? altMatch[1] : null,
          image_title: titleMatch ? titleMatch[1] : null,
          has_alt_text: !!altMatch,
        });
      }
    }

    if (images.length > 0) {
      await supabaseClient.from('seo_image_analysis').insert(images);
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_images: images.length,
        images_with_alt: images.filter(i => i.has_alt_text).length,
        images_without_alt: images.filter(i => !i.has_alt_text).length,
      },
      images
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
