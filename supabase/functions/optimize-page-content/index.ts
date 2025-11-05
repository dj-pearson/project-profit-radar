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

    const { url, target_keyword, content, optimization_goal = 'seo' } = await req.json();
    if (!url && !content) {
      return new Response(JSON.stringify({ error: 'URL or content required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let pageContent = content;
    if (!pageContent && url) {
      const response = await fetch(url);
      const html = await response.text();
      pageContent = html
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Analyze content
    const words = pageContent.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const wordCount = words.length;
    const sentences = pageContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);

    // Calculate reading metrics
    const readingTimeMinutes = Math.ceil(wordCount / 200);
    const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence * 2)));

    // Keyword density analysis
    let keywordDensity = 0;
    let keywordOccurrences = 0;
    if (target_keyword) {
      const keywordLower = target_keyword.toLowerCase();
      keywordOccurrences = (pageContent.toLowerCase().match(new RegExp(keywordLower, 'g')) || []).length;
      keywordDensity = (keywordOccurrences / words.length) * 100;
    }

    // Generate optimization suggestions
    const suggestions: Array<{
      category: string;
      priority: string;
      suggestion: string;
      expected_impact: string;
    }> = [];

    // Word count recommendations
    if (wordCount < 300) {
      suggestions.push({
        category: 'content_length',
        priority: 'high',
        suggestion: 'Content is too short. Aim for at least 1000 words for better SEO performance.',
        expected_impact: 'Longer content typically ranks better and provides more value to readers.',
      });
    } else if (wordCount < 1000) {
      suggestions.push({
        category: 'content_length',
        priority: 'medium',
        suggestion: `Content length is ${wordCount} words. Consider expanding to 1500+ words for competitive keywords.`,
        expected_impact: 'Comprehensive content tends to rank higher in search results.',
      });
    }

    // Keyword density recommendations
    if (target_keyword) {
      if (keywordDensity < 0.5) {
        suggestions.push({
          category: 'keyword_optimization',
          priority: 'high',
          suggestion: `Keyword "${target_keyword}" density is too low (${keywordDensity.toFixed(2)}%). Include it more naturally throughout the content.`,
          expected_impact: 'Proper keyword usage helps search engines understand your content topic.',
        });
      } else if (keywordDensity > 3) {
        suggestions.push({
          category: 'keyword_optimization',
          priority: 'high',
          suggestion: `Keyword "${target_keyword}" density is too high (${keywordDensity.toFixed(2)}%). Risk of keyword stuffing - reduce usage.`,
          expected_impact: 'Excessive keyword use can result in search engine penalties.',
        });
      } else {
        suggestions.push({
          category: 'keyword_optimization',
          priority: 'low',
          suggestion: `Keyword density is optimal at ${keywordDensity.toFixed(2)}%.`,
          expected_impact: 'Good keyword balance helps with rankings without penalty risk.',
        });
      }
    }

    // Readability recommendations
    if (avgWordsPerSentence > 25) {
      suggestions.push({
        category: 'readability',
        priority: 'medium',
        suggestion: 'Sentences are too long on average. Break them into shorter, more digestible sentences.',
        expected_impact: 'Better readability improves user engagement and time on page.',
      });
    }

    if (readabilityScore < 60) {
      suggestions.push({
        category: 'readability',
        priority: 'medium',
        suggestion: 'Content readability is low. Use simpler language and shorter paragraphs.',
        expected_impact: 'Improved readability leads to better user experience and engagement.',
      });
    }

    // Heading recommendations
    const h1Count = (pageContent.match(/<h1[^>]*>/gi) || []).length;
    const h2Count = (pageContent.match(/<h2[^>]*>/gi) || []).length;

    if (h1Count === 0) {
      suggestions.push({
        category: 'structure',
        priority: 'high',
        suggestion: 'Missing H1 heading. Add a clear, keyword-rich H1 tag.',
        expected_impact: 'H1 tags are critical for SEO and content structure.',
      });
    }

    if (h2Count < 3 && wordCount > 500) {
      suggestions.push({
        category: 'structure',
        priority: 'medium',
        suggestion: 'Add more H2 subheadings to break up content and improve scanability.',
        expected_impact: 'Well-structured content improves readability and SEO.',
      });
    }

    // Save optimization analysis
    const optimizationData = {
      url: url || null,
      page_id: null,
      target_keyword,
      current_word_count: wordCount,
      recommended_word_count: Math.max(1500, wordCount),
      current_keyword_density: Math.round(keywordDensity * 100) / 100,
      target_keyword_density: 1.5,
      readability_score: Math.round(readabilityScore),
      content_quality_score: Math.min(100, Math.round((wordCount / 15) + readabilityScore) / 2),
      optimization_suggestions: suggestions,
      priority_actions: suggestions.filter(s => s.priority === 'high').map(s => s.suggestion),
      estimated_improvement_percentage: suggestions.filter(s => s.priority === 'high').length * 10,
      optimization_status: suggestions.filter(s => s.priority === 'high').length === 0 ? 'optimized' : 'needs_work',
    };

    const { data: saved } = await supabaseClient
      .from('seo_content_optimization')
      .insert(optimizationData)
      .select()
      .single();

    return new Response(JSON.stringify({
      success: true,
      optimization_analysis: saved || optimizationData,
      metrics: {
        word_count: wordCount,
        reading_time_minutes: readingTimeMinutes,
        readability_score: Math.round(readabilityScore),
        keyword_density: Math.round(keywordDensity * 100) / 100,
        keyword_occurrences: keywordOccurrences,
      },
      suggestions,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
