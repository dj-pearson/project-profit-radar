// Blog AI Automation Edge Function
// Updated with multi-tenant site_id isolation
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { aiService } from "../_shared/ai-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const logStep = (step: string, details?: any) => {
  console.log(`[BLOG-AI-AUTOMATION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

interface BlogContent {
  title: string;
  body: string;
  excerpt: string;
  seo_title: string;
  seo_description: string;
  keywords?: string[];
  estimated_read_time?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Blog AI Automation Function started", { method: req.method });

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for API key authentication (for Make.com and other automation tools)
    const apiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("Authorization");

    // Allow authentication via either service role bearer token or custom API key
    const allowedApiKey = Deno.env.get("BLOG_AUTOMATION_API_KEY");

    let isAuthorized = false;
    let authMethod = "";

    // Method 1: Check for custom API key
    if (apiKey && allowedApiKey && apiKey === allowedApiKey) {
      isAuthorized = true;
      authMethod = "API_KEY";
      logStep("Authenticated via API key");
    }

    // Method 2: Check for service role token
    if (!isAuthorized && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (token === serviceRoleKey) {
        isAuthorized = true;
        authMethod = "SERVICE_ROLE";
        logStep("Authenticated via service role");
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({
        error: "Unauthorized. Provide either 'x-api-key' header or valid Bearer token.",
        methods: ["x-api-key: YOUR_API_KEY", "Authorization: Bearer SERVICE_ROLE_KEY"]
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { action, topic, customSettings, site_id, site_key } = body;
    logStep("Request parsed", { action, topic, authMethod, site_id, site_key });

    // Resolve site_id - can be passed directly or resolved from site_key
    let siteId = site_id;
    if (!siteId && site_key) {
      const { data: siteData } = await supabaseClient
        .from('sites')
        .select('id')
        .eq('key', site_key)
        .eq('is_active', true)
        .single();
      siteId = siteData?.id;
    }

    // Fall back to default BuildDesk site if no site specified
    if (!siteId) {
      const { data: defaultSite } = await supabaseClient
        .from('sites')
        .select('id')
        .eq('key', 'builddesk')
        .single();
      siteId = defaultSite?.id;
    }

    if (!siteId) {
      return new Response(JSON.stringify({
        error: "Site not found. Provide either 'site_id' or 'site_key' in the request body."
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep("Site resolved", { siteId });

    // Handle different actions
    if (action === 'generate-auto-content' || action === 'test-generation') {
      return await generateBlogContent(supabaseClient, siteId, topic, customSettings);
    }

    return new Response(JSON.stringify({
      error: "Invalid action",
      availableActions: ['generate-auto-content', 'test-generation']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });

    return new Response(JSON.stringify({
      error: errorMessage,
      timestamp: new Date().toISOString(),
      function: "blog-ai-automation"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function generateBlogContent(
  supabaseClient: any,
  siteId: string,
  topic?: string,
  customSettings?: any
): Promise<Response> {
  logStep("Starting content generation", { siteId, topic });

  // Check Claude API key
  const claudeKey = Deno.env.get('CLAUDE_API_KEY');
  if (!claudeKey) {
    throw new Error("Claude API key not configured");
  }

  const finalTopic = topic || generateRandomTopic();
  
  try {
    // Generate content with Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeKey}`,
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: customSettings?.preferred_model || 'claude-3-5-haiku-20241022',
        max_tokens: customSettings?.max_tokens || 2000,
        temperature: customSettings?.model_temperature || 0.7,
        messages: [{
          role: 'user',
          content: `Write a comprehensive blog article about "${finalTopic}" for construction professionals. 

Return your response in this exact JSON format:
{
  "title": "Compelling blog title (60 chars max)",
  "body": "Full article in markdown format with proper headings, bullet points, and structure",
  "excerpt": "Engaging 2-3 sentence summary (160 chars max)",
  "seo_title": "SEO-optimized title (60 chars max)",
  "seo_description": "SEO meta description (160 chars max)",
  "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
  "estimated_read_time": 8
}

Make the content authoritative, actionable, and valuable for construction professionals. Include specific examples, best practices, and practical tips.`
        }],
      }),
    });

    logStep("Claude API response", { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Extract JSON from response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    let parsed: any = null;
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        logStep("Content parsed successfully", { title: parsed.title });
      } catch (parseError) {
        logStep("JSON parsing failed, using fallback");
      }
    }

    // If parsing failed, create fallback content
    if (!parsed) {
      parsed = createFallbackContent(finalTopic);
    }

    // Create slug for the blog post
    let slug = parsed.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists and make it unique (within this site)
    let uniqueSlug = slug;
    let counter = 1;
    let slugExists = true;

    while (slugExists) {
      const { data: existingPost } = await supabaseClient
        .from('blog_posts')
        .select('id')
        .eq('site_id', siteId)  // CRITICAL: Site isolation
        .eq('slug', uniqueSlug)
        .maybeSingle();

      if (!existingPost) {
        slugExists = false;
      } else {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
    }

    // Create the blog post in database with site isolation
    const { data: blogPost, error: postError } = await supabaseClient
      .from('blog_posts')
      .insert([{
        site_id: siteId,  // CRITICAL: Site isolation
        title: parsed.title,
        slug: uniqueSlug,
        body: parsed.body,
        excerpt: parsed.excerpt,
        seo_title: parsed.seo_title,
        seo_description: parsed.seo_description,
        status: 'published',
        published_at: new Date().toISOString(),
        created_by: 'automation-system' // Since we're using API key auth
      }])
      .select()
      .single();

    if (postError) {
      logStep("Blog post creation failed", { error: postError });
      throw postError;
    }

    logStep("Blog post created successfully", { blogPostId: blogPost.id, title: blogPost.title });

    return new Response(JSON.stringify({
      success: true,
      content: parsed,
      blogPost: blogPost,
      metadata: {
        model: customSettings?.preferred_model || 'claude-3-5-haiku-20241022',
        topic: finalTopic,
        timestamp: new Date().toISOString(),
        function: "blog-ai-automation",
        slug: uniqueSlug
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Content generation error", { error: errorMessage });
    throw error;
  }
}

function createFallbackContent(topic: string): BlogContent {
  return {
    title: topic.length > 60 ? topic.substring(0, 60) : topic,
    body: `# ${topic}

## Overview
This comprehensive guide explores ${topic.toLowerCase()} and provides actionable insights for construction professionals.

## Key Strategies

### 1. Planning and Preparation
Effective planning is crucial for successful project management. Develop detailed schedules and resource allocation plans.

### 2. Communication and Coordination
Maintain clear communication channels between all stakeholders to ensure smooth project execution.

### 3. Quality Control
Implement rigorous quality control measures to prevent costly rework and delays.

### 4. Risk Management
Identify potential risks early and develop mitigation strategies to minimize project impacts.

### 5. Technology Integration
Leverage modern construction technology to improve efficiency and accuracy.

## Implementation Steps
1. **Assessment**: Evaluate current processes and identify improvement opportunities
2. **Planning**: Develop detailed implementation plans with clear timelines
3. **Training**: Ensure team members are properly trained on new procedures
4. **Monitoring**: Track progress and adjust strategies as needed
5. **Optimization**: Continuously refine processes for better outcomes

## Conclusion
By implementing these proven strategies, construction professionals can significantly improve project outcomes and profitability.`,
    excerpt: `Discover proven strategies for ${topic.toLowerCase()} that help construction teams improve efficiency and project outcomes.`,
    seo_title: topic.length > 60 ? topic.substring(0, 60) : topic,
    seo_description: `Learn effective strategies for ${topic.toLowerCase()}. Expert tips for construction professionals.`,
    keywords: ["construction", "project management", "efficiency", "best practices"],
    estimated_read_time: 6
  };
}

function generateRandomTopic(): string {
  const topics = [
    "5 Proven Strategies for Reducing Equipment Downtime in Construction",
    "Modern Safety Protocols That Every Construction Site Should Implement",
    "Technology Solutions for Streamlining Construction Project Management",
    "Cost Control Techniques for Construction Projects in 2025",
    "Effective Communication Strategies for Construction Teams",
    "Quality Control Best Practices in Commercial Construction",
    "Weather Management and Planning for Construction Projects",
    "Sustainable Construction Practices and Green Building Techniques",
    "Risk Assessment and Mitigation in Large Construction Projects",
    "Training and Development Programs for Construction Workers"
  ];
  
  return topics[Math.floor(Math.random() * topics.length)];
}
