// Analyze Semantic Keywords Edge Function
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
    console.log("[ANALYZE-SEMANTIC-KEYWORDS] User authenticated", { userId: user.id, siteId });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url, primary_keyword } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url);
    const html = await response.text();

    // Extract text content
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
      'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by',
      'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all',
      'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
      'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
      'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
      'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
    ]);

    // Extract words and phrases
    const words = textContent.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    const wordFrequency: Record<string, number> = {};

    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Extract 2-word phrases (bigrams)
    const bigrams: Record<string, number> = {};
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigrams[bigram] = (bigrams[bigram] || 0) + 1;
    }

    // Extract 3-word phrases (trigrams)
    const trigrams: Record<string, number> = {};
    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      trigrams[trigram] = (trigrams[trigram] || 0) + 1;
    }

    // Get top keywords
    const topWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([word, frequency]) => ({
        term: word,
        frequency,
        relevance_score: Math.min((frequency / words.length) * 100, 100),
      }));

    const topBigrams = Object.entries(bigrams)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([phrase, frequency]) => ({
        term: phrase,
        frequency,
        relevance_score: Math.min((frequency / (words.length - 1)) * 100, 100),
      }));

    const topTrigrams = Object.entries(trigrams)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([phrase, frequency]) => ({
        term: phrase,
        frequency,
        relevance_score: Math.min((frequency / (words.length - 2)) * 100, 100),
      }));

    // Combine all semantic keywords
    const semanticKeywords = [
      ...topWords.map(k => ({ ...k, type: 'single' })),
      ...topBigrams.map(k => ({ ...k, type: 'bigram' })),
      ...topTrigrams.map(k => ({ ...k, type: 'trigram' })),
    ];

    // Check primary keyword density if provided
    let primaryKeywordData = null;
    if (primary_keyword) {
      const keywordLower = primary_keyword.toLowerCase();
      const occurrences = (textContent.match(new RegExp(keywordLower, 'g')) || []).length;
      const density = (occurrences / words.length) * 100;

      primaryKeywordData = {
        keyword: primary_keyword,
        occurrences,
        density: Math.round(density * 100) / 100,
        target_density: 2.0,
        meets_target: density >= 1.0 && density <= 3.0,
      };
    }

    const analysisData = {
      site_id: siteId,  // CRITICAL: Site isolation
      url,
      page_id: null,
      keyword_count: semanticKeywords.length,
      primary_keyword: primary_keyword || null,
      primary_keyword_density: primaryKeywordData?.density || 0,
      secondary_keywords: topWords.slice(0, 10).map(k => k.term),
      lsi_keywords: topBigrams.map(k => k.term),
      keyword_density_map: Object.fromEntries(
        topWords.slice(0, 20).map(k => [k.term, k.relevance_score])
      ),
      content_themes: topTrigrams.map(k => k.term),
      semantic_relevance_score: 75,
      keyword_distribution_quality: 'good',
      recommendations: [] as string[],
    };

    // Generate recommendations
    if (!primary_keyword) {
      analysisData.recommendations.push('Define a primary keyword for this page');
    } else if (primaryKeywordData && !primaryKeywordData.meets_target) {
      if (primaryKeywordData.density < 1.0) {
        analysisData.recommendations.push(`Primary keyword "${primary_keyword}" density too low (${primaryKeywordData.density}%). Target: 1-3%`);
      } else {
        analysisData.recommendations.push(`Primary keyword "${primary_keyword}" density too high (${primaryKeywordData.density}%). Risk of keyword stuffing`);
      }
    }

    if (semanticKeywords.length < 10) {
      analysisData.recommendations.push('Content too short or lacks semantic depth');
    }

    const { data: saved } = await supabaseClient
      .from('seo_semantic_analysis')
      .insert(analysisData)
      .select()
      .single();

    return new Response(JSON.stringify({
      success: true,
      semantic_analysis: saved || analysisData,
      keywords: semanticKeywords,
      primary_keyword_data: primaryKeywordData,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
