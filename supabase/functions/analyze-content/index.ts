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
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
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
      return new Response(JSON.stringify({ error: 'Access denied. Root admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url, primary_keyword } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url);
    const html = await response.text();

    // Parse content
    const text = html.replace(/<script[^>]*>.*?<\/script>/gis, '')
                    .replace(/<style[^>]*>.*?<\/style>/gis, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

    const words = text.split(/\s+/);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = html.match(/<p[^>]*>.*?<\/p>/gi) || [];

    // Basic readability (Flesch Reading Ease approximation)
    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = 1.5; // Simplified
    const readabilityScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    // Keyword analysis
    let keywordCount = 0;
    let keywordDensity = 0;
    if (primary_keyword) {
      const regex = new RegExp(primary_keyword, 'gi');
      const matches = text.match(regex);
      keywordCount = matches ? matches.length : 0;
      keywordDensity = (keywordCount / wordCount) * 100;
    }

    const contentData = {
      url,
      primary_keyword: primary_keyword || null,
      overall_seo_score: Math.min(100, Math.round(60 + (wordCount > 300 ? 20 : 0) + (keywordDensity > 0.5 && keywordDensity < 3 ? 20 : 0))),
      word_count: wordCount,
      paragraph_count: paragraphs.length,
      sentence_count: sentences.length,
      avg_sentence_length: avgWordsPerSentence,
      readability_score: Math.max(0, Math.min(100, readabilityScore)),
      primary_keyword_count: keywordCount,
      primary_keyword_density: keywordDensity,
      optimization_status: 'analyzed',
    };

    const { data: saved } = await supabaseClient
      .from('seo_content_optimization')
      .insert(contentData)
      .select()
      .single();

    return new Response(JSON.stringify({ success: true, content_analysis: saved || contentData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    console.error('Content Analysis Error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
