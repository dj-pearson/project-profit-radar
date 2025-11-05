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

    const {
      topic,
      primary_keyword,
      secondary_keywords = [],
      target_word_count = 1500,
      tone = 'professional',
      include_sections = true,
      template_id = null,
    } = await req.json();

    if (!topic && !template_id) {
      return new Response(JSON.stringify({ error: 'Topic or template_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check for OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    let generatedContent = '';
    let generationMethod = 'template';

    if (openaiKey && topic) {
      // Use OpenAI to generate content
      try {
        const prompt = `Write a comprehensive, SEO-optimized blog post about "${topic}".

Primary keyword: ${primary_keyword || topic}
${secondary_keywords.length > 0 ? `Secondary keywords: ${secondary_keywords.join(', ')}` : ''}
Target length: ${target_word_count} words
Tone: ${tone}

Requirements:
1. Start with an engaging H1 title
2. Include an introduction that hooks the reader
3. Use H2 and H3 subheadings to structure the content
4. Naturally incorporate the primary keyword throughout
5. Include the secondary keywords where relevant
6. Write in a ${tone} tone
7. End with a strong conclusion and call-to-action
8. Format in HTML with proper heading tags

Generate the complete blog post now:`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are an expert SEO content writer who creates engaging, well-structured blog posts.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: Math.ceil(target_word_count * 1.5),
            temperature: 0.7,
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          generatedContent = openaiData.choices[0].message.content;
          generationMethod = 'ai';
        }
      } catch (error) {
        console.error('OpenAI generation failed:', error);
      }
    }

    // Fallback to template generation
    if (!generatedContent) {
      generatedContent = `
<h1>${topic}</h1>

<p><strong>Introduction:</strong> ${topic} is an important topic that deserves comprehensive coverage. In this article, we'll explore the key aspects of ${primary_keyword || topic} and provide actionable insights.</p>

${include_sections ? `
<h2>What is ${primary_keyword || topic}?</h2>
<p>[Define the topic clearly and concisely. Include the primary keyword naturally in the first 100 words.]</p>

<h2>Why ${primary_keyword || topic} Matters</h2>
<p>[Explain the importance and relevance of this topic. Include statistics or examples to support your points.]</p>

<h2>Key Components of ${primary_keyword || topic}</h2>
<p>[Break down the main elements or aspects. Use bullet points or numbered lists for clarity:]</p>
<ul>
  <li>[Component 1 with explanation]</li>
  <li>[Component 2 with explanation]</li>
  <li>[Component 3 with explanation]</li>
</ul>

<h2>Best Practices for ${primary_keyword || topic}</h2>
<p>[Provide actionable advice and recommendations. This section should be highly practical.]</p>

${secondary_keywords.length > 0 ? `
<h2>Related Topics</h2>
<p>[Discuss related concepts: ${secondary_keywords.join(', ')}]</p>
` : ''}

<h2>Common Challenges and Solutions</h2>
<p>[Address common problems and provide solutions. This helps with user engagement.]</p>

<h2>Future Trends</h2>
<p>[Discuss where this topic is heading and what to expect in the future.]</p>
` : ''}

<h2>Conclusion</h2>
<p>Understanding ${primary_keyword || topic} is essential for [benefit]. By following the guidelines and best practices outlined in this article, you'll be well-equipped to [desired outcome].</p>

<p><strong>Call to Action:</strong> Ready to take the next step? [Insert relevant CTA here]</p>
      `.trim();
    }

    // Analyze generated content
    const plainText = generatedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).length;
    const keywordOccurrences = primary_keyword
      ? (plainText.toLowerCase().match(new RegExp(primary_keyword.toLowerCase(), 'g')) || []).length
      : 0;

    // Create slug
    const slug = topic.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Generate meta description
    const metaDescription = plainText.substring(0, 155) + '...';

    // Save to database
    const contentData = {
      title: topic,
      slug,
      content_html: generatedContent,
      meta_description: metaDescription,
      primary_keyword,
      secondary_keywords: secondary_keywords,
      word_count: wordCount,
      target_audience: tone,
      content_type: 'blog_post',
      generation_method: generationMethod,
      seo_score: 75,
      readability_score: 80,
      status: 'draft',
      created_by: user.id,
    };

    const { data: saved } = await supabaseClient
      .from('seo_content_optimization')
      .insert(contentData)
      .select()
      .single();

    return new Response(JSON.stringify({
      success: true,
      content: {
        ...contentData,
        id: saved?.id,
        keyword_occurrences: keywordOccurrences,
        keyword_density: ((keywordOccurrences / wordCount) * 100).toFixed(2),
      },
      generation_method: generationMethod,
      note: generationMethod === 'template'
        ? 'Template-based content generated. Configure OPENAI_API_KEY for AI-powered generation.'
        : 'AI-powered content generated successfully.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
