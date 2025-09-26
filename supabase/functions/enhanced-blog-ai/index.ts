import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[ENHANCED-BLOG-AI] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

interface GenerationSettings {
  preferred_ai_provider: string;
  preferred_model: string;
  fallback_model: string;
  model_temperature: number;
  target_word_count: number;
  content_style: string;
  industry_focus: string[];
  target_keywords: string[];
  optimize_for_geographic: boolean; // Geographic/Local SEO
  target_locations: string[];
  seo_focus: string;
  geo_optimization: boolean; // Generative Engine Optimization
  perplexity_optimization: boolean;
  ai_search_optimization: boolean;
  topic_diversity_enabled: boolean;
  minimum_topic_gap_days: number;
  content_analysis_depth: string;
  custom_instructions?: string;
  brand_voice_guidelines?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Enhanced Blog AI Function started", { method: req.method });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    // Check if user is root admin
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile.role !== 'root_admin') {
      throw new Error("Insufficient permissions");
    }

    const { action, topic, queueId, customSettings } = await req.json();

    if (action === 'generate-auto-content') {
      return await handleAutoGeneration(supabaseClient, userProfile.company_id, topic, customSettings);
    }

    if (action === 'generate-manual-content') {
      return await handleManualGeneration(supabaseClient, userProfile.company_id, topic, customSettings);
    }

    if (action === 'process-queue-item') {
      return await processQueueItem(supabaseClient, queueId);
    }

    if (action === 'analyze-content-diversity') {
      return await analyzeContentDiversity(supabaseClient, userProfile.company_id);
    }

    if (action === 'update-model-config') {
      return await updateModelConfiguration(supabaseClient, customSettings);
    }

    if (action === 'test-generation') {
      return await testGeneration(supabaseClient, userProfile.company_id, topic, customSettings);
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function handleAutoGeneration(
  supabaseClient: any, 
  companyId: string, 
  suggestedTopic?: string, 
  customSettings?: Partial<GenerationSettings>
) {
  logStep("Starting auto generation", { companyId, suggestedTopic });

  // Get generation settings
  const { data: settings, error: settingsError } = await supabaseClient
    .from('blog_auto_generation_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (settingsError || !settings?.is_enabled) {
    throw new Error("Auto-generation not enabled or configured");
  }

  // Merge custom settings if provided
  const finalSettings = { ...settings, ...customSettings };

  // Check topic diversity if enabled
  let selectedTopic = suggestedTopic;
  if (finalSettings.topic_diversity_enabled && !suggestedTopic) {
    selectedTopic = await generateDiverseTopic(supabaseClient, companyId, finalSettings);
  }

  // Generate content using the selected AI provider
  const generatedContent = await generateContentWithAI(finalSettings, selectedTopic || "construction industry best practices", companyId, supabaseClient);

  // Create blog post
  const { data: blogPost, error: postError } = await supabaseClient
    .from('blog_posts')
    .insert([{
      title: generatedContent.title,
      slug: generateSlug(generatedContent.title),
      body: generatedContent.body,
      excerpt: generatedContent.excerpt,
      seo_title: generatedContent.seo_title,
      seo_description: generatedContent.seo_description,
      status: finalSettings.auto_publish ? 'published' : 'draft',
      published_at: finalSettings.auto_publish ? new Date().toISOString() : null,
      created_by: companyId // Using company_id as placeholder for system generation
    }])
    .select()
    .single();

  if (postError) throw postError;

  // Record topic history for diversity tracking
  await recordTopicHistory(supabaseClient, companyId, blogPost.id, selectedTopic || '', generatedContent, finalSettings);

  // Analyze content
  await analyzeGeneratedContent(supabaseClient, blogPost.id, generatedContent, finalSettings);

  // Send notifications if enabled
  if (finalSettings.notify_on_generation && finalSettings.notification_emails?.length > 0) {
    await sendGenerationNotification(supabaseClient, finalSettings.notification_emails, blogPost, generatedContent);
  }

  return new Response(JSON.stringify({ 
    success: true,
    blogPost,
    content: generatedContent,
    topic: selectedTopic
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleManualGeneration(
  supabaseClient: any, 
  companyId: string, 
  suggestedTopic?: string, 
  customSettings?: Partial<GenerationSettings>
) {
  logStep("Starting manual content generation", { companyId, suggestedTopic });

  // Get generation settings or use defaults if not configured
  const { data: settings, error: settingsError } = await supabaseClient
    .from('blog_auto_generation_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  let finalSettings: GenerationSettings;
  
  if (settingsError || !settings) {
    // Use default settings if none configured
    finalSettings = {
      preferred_ai_provider: 'claude',
      preferred_model: 'claude-sonnet-4-20250514',
      fallback_model: 'claude-3-5-haiku-20241022',
      model_temperature: 0.7,
      target_word_count: 1200,
      content_style: 'professional',
      industry_focus: ['construction', 'project management', 'technology'],
      target_keywords: [],
      optimize_for_geographic: false,
      target_locations: [],
      seo_focus: 'balanced',
      geo_optimization: true,
      perplexity_optimization: true,
      ai_search_optimization: true,
      topic_diversity_enabled: false,
      minimum_topic_gap_days: 30,
      content_analysis_depth: 'excerpt',
      brand_voice_guidelines: 'Professional, authoritative, but approachable. Use industry expertise while remaining accessible to various skill levels.',
      ...customSettings
    };
  } else {
    // Merge with existing settings
    finalSettings = { ...settings, ...customSettings };
  }

  if (!suggestedTopic) {
    throw new Error("Topic is required for manual generation");
  }

  // Generate content using the selected AI provider (don't create blog post)
  const generatedContent = await generateContentWithAI(finalSettings, suggestedTopic, companyId, supabaseClient);

  return new Response(JSON.stringify({ 
    success: true,
    generatedContent,
    topic: suggestedTopic
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateDiverseTopic(
  supabaseClient: any, 
  companyId: string, 
  settings: GenerationSettings
): Promise<string> {
  logStep("Generating diverse topic", { companyId });

  // Get recent topics based on analysis depth
  let recentTopicsQuery = supabaseClient
    .from('blog_topic_history')
    .select('primary_topic, secondary_topics, keywords_used, created_at')
    .eq('company_id', companyId)
    .gte('created_at', new Date(Date.now() - settings.minimum_topic_gap_days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (settings.content_analysis_depth === 'title') {
    recentTopicsQuery = recentTopicsQuery.limit(10);
  } else if (settings.content_analysis_depth === 'excerpt') {
    recentTopicsQuery = recentTopicsQuery.limit(20);
  } else {
    recentTopicsQuery = recentTopicsQuery.limit(50);
  }

  const { data: recentTopics } = await recentTopicsQuery;

  // Generate topic suggestion using Claude with diversity context
  const apiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!apiKey) throw new Error("Claude API key not configured");

  const diversityContext = recentTopics?.map((t: any) => 
    `- ${t.primary_topic} (${new Date(t.created_at).toLocaleDateString()})`
  ).join('\n') || "No recent topics found";

  const topicPrompt = `You are an expert content strategist for a construction management platform. Generate a fresh, engaging blog topic using these proven formats:

RECENT TOPICS TO AVOID (within ${settings.minimum_topic_gap_days} days):
${diversityContext}

TOPIC FORMATS TO USE (choose one):
- "X Essential [Topic] Every [Audience] Should Know"
- "X Common [Problem] and How to Solve Them"
- "Complete Guide to [Topic]: X Expert Tips"  
- "X Proven Strategies for [Goal/Challenge]"
- "How to [Action]: X Step-by-Step Process"
- "X [Tool/Method] That Transform [Process]"
- "X Hidden Costs of [Topic] and How to Avoid Them"
- "Future of [Topic]: X Trends to Watch in 2025"

REQUIREMENTS:
- Target industry focus: ${settings.industry_focus.join(', ')}
- Content style: ${settings.content_style}
- Target word count: ${settings.target_word_count}
- Geographic focus: ${settings.target_locations.join(', ') || 'General'}
- Must be completely different from recent topics listed above
- Use specific numbers (5, 7, 10) to make titles more engaging

TOPICS TO EXPLORE:
- Project scheduling and delays
- Safety protocols and compliance  
- Cost management and budgeting
- Technology integration (BIM, drones, software)
- Team management and communication
- Quality control and inspections
- Equipment management and maintenance
- Sustainable building practices
- Risk management and insurance
- Permit and regulatory compliance

${settings.seo_focus === 'geo' ? 'OPTIMIZE FOR GEO (Local search and "near me" queries)' : ''}
${settings.perplexity_optimization ? 'OPTIMIZE FOR AI SEARCH (Perplexity, ChatGPT browsing, etc.)' : ''}
${settings.ai_search_optimization ? 'OPTIMIZE FOR GOOGLE AI OVERVIEWS' : ''}

Generate a topic that construction professionals would find immediately valuable and actionable.

Please respond with ONLY the topic title (no quotes, no explanations).`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.preferred_model,
      max_tokens: 100,
      temperature: settings.model_temperature,
      messages: [{ role: 'user', content: topicPrompt }],
    }),
  });

  if (!response.ok) {
    logStep("Claude API error, using fallback");
    const fallbackTopics = [
      "7 Construction Scheduling Challenges and How to Overcome Them",
      "5 Essential Safety Protocols Every Construction Team Should Follow", 
      "10 Cost Management Strategies for Construction Projects",
      "8 Technology Tools Transforming Construction Management",
      "6 Common Project Delays and Prevention Strategies",
      "5 Quality Control Methods for Better Construction Outcomes",
      "7 Equipment Management Best Practices for Construction Companies",
      "10 Sustainable Building Practices for Modern Construction",
      "5 Risk Management Strategies Every Contractor Should Know",
      "8 Communication Tools That Improve Construction Team Efficiency"
    ];
    return fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

async function generateContentWithAI(
  settings: GenerationSettings,
  topic: string,
  companyId: string,
  supabaseClient: any
): Promise<BlogContent> {
  logStep("Generating content with AI", { provider: settings.preferred_ai_provider, model: settings.preferred_model, topic });

  // Get existing content context for diversity
  const { data: existingPosts } = await supabaseClient
    .from('blog_posts')
    .select('title, excerpt, body')
    .limit(settings.content_analysis_depth === 'full' ? 10 : 5);

  const existingContext = existingPosts?.map((p: any) => 
    settings.content_analysis_depth === 'title' ? p.title :
    settings.content_analysis_depth === 'excerpt' ? `${p.title}: ${p.excerpt}` :
    `${p.title}: ${p.excerpt}\n${p.body.substring(0, 500)}...`
  ).join('\n\n') || '';

  if (settings.preferred_ai_provider === 'claude') {
    return await generateWithClaude(settings, topic, existingContext);
  } else if (settings.preferred_ai_provider === 'openai') {
    return await generateWithOpenAI(settings, topic, existingContext);
  } else if (settings.preferred_ai_provider === 'gemini') {
    return await generateWithGemini(settings, topic, existingContext);
  } else {
    throw new Error("Unsupported AI provider");
  }
}

async function generateWithClaude(
  settings: GenerationSettings,
  topic: string,
  existingContext: string
): Promise<BlogContent> {
  const apiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!apiKey) throw new Error("Claude API key not configured");

  const seoInstructions = generateSEOInstructions(settings);
  const brandVoice = settings.brand_voice_guidelines || "Professional, authoritative, but approachable. Use industry expertise while remaining accessible to various skill levels.";

  const prompt = `You are an expert content writer for a leading construction management platform. Write a comprehensive blog article about: "${topic}"

EXISTING CONTENT TO AVOID DUPLICATING:
${existingContext}

CONTENT REQUIREMENTS:
- Target word count: ${settings.target_word_count} words
- Content style: ${settings.content_style}
- Industry focus: ${settings.industry_focus.join(', ')}
- Target keywords: ${settings.target_keywords.join(', ')}

BRAND VOICE:
${brandVoice}

CUSTOM INSTRUCTIONS:
${settings.custom_instructions || 'None'}

SEO OPTIMIZATION:
${seoInstructions}

RESPONSE FORMAT - Return valid JSON:
{
  "title": "Compelling blog title (60 chars max)",
  "body": "Full article in markdown format with proper headings, bullet points, and structure",
  "excerpt": "Engaging 2-3 sentence summary (160 chars max)",
  "seo_title": "SEO-optimized title (60 chars max)",
  "seo_description": "SEO meta description (160 chars max)",
  "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
  "estimated_read_time": 8
}

Make the content authoritative, actionable, and valuable for construction professionals. Include specific examples, best practices, and practical tips.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: settings.preferred_model,
        max_tokens: 4000,
        temperature: settings.model_temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      // Log the actual error response
      const errorText = await response.text();
      logStep("Primary model failed", { 
        primary: settings.preferred_model, 
        fallback: settings.fallback_model,
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return await generateWithClaudeFallback(settings, topic, existingContext);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Log the full Claude response for debugging
    logStep("Raw Claude response", { 
      contentLength: content.length,
      contentPreview: content.substring(0, 1000),
      contentEnd: content.substring(Math.max(0, content.length - 500))
    });
    
    // Extract JSON from response - try multiple patterns
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    
    // If no match, try looking for JSON with markdown code blocks
    if (!jsonMatch) {
      jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) jsonMatch[0] = jsonMatch[1]; // Use the captured group
    }
    
    // If still no match, try looking for JSON without markdown
    if (!jsonMatch) {
      jsonMatch = content.match(/```\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) jsonMatch[0] = jsonMatch[1]; // Use the captured group
    }
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        logStep("Claude generation successful", { topic, title: parsed.title });
        return parsed;
      } catch (parseError) {
        logStep("JSON parse error", { 
          jsonText: jsonMatch[0],
          error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          jsonLength: jsonMatch[0].length
        });
        throw new Error("Failed to parse JSON response from Claude");
      }
    } else {
      logStep("No JSON found in Claude response", { 
        contentLength: content.length,
        contentSample: content.substring(0, 1000)
      });
      throw new Error("No JSON found in Claude response");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Claude generation error", { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    return await generateWithClaudeFallback(settings, topic, existingContext);
  }
}

async function generateWithClaudeFallback(
  settings: GenerationSettings,
  topic: string,
  existingContext: string
): Promise<BlogContent> {
  const apiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!apiKey) throw new Error("Claude API key not configured");

  const fallbackModel = settings.fallback_model || 'claude-3-5-haiku-20241022';
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: fallbackModel,
        max_tokens: 4000,
        temperature: settings.model_temperature,
        messages: [{ 
          role: 'user', 
          content: `Write a ${settings.target_word_count}-word blog article about "${topic}" for construction professionals. Return as JSON with fields: title, body, excerpt, seo_title, seo_description, keywords, estimated_read_time.` 
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Fallback model also failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      // Return structured fallback content
      return createFallbackContent(topic, settings);
    }
  } catch (error) {
    logStep("Fallback model also failed", { error: error instanceof Error ? error.message : 'Unknown error' });
    return createFallbackContent(topic, settings);
  }
}

async function generateWithOpenAI(
  settings: GenerationSettings,
  topic: string,
  existingContext: string
): Promise<BlogContent> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const seoInstructions = generateSEOInstructions(settings);

  const prompt = `Write a comprehensive blog article about: "${topic}" for construction management professionals.

Target word count: ${settings.target_word_count}
Content style: ${settings.content_style}
Keywords to include: ${settings.target_keywords.join(', ')}

${seoInstructions}

Return as JSON: {"title": "", "body": "", "excerpt": "", "seo_title": "", "seo_description": "", "keywords": [], "estimated_read_time": 0}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.preferred_model,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.model_temperature,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    return createFallbackContent(topic, settings);
  }
}

async function generateWithGemini(
  settings: GenerationSettings,
  topic: string,
  existingContext: string
): Promise<BlogContent> {
  // Placeholder for Gemini implementation
  return createFallbackContent(topic, settings);
}

function generateSEOInstructions(settings: GenerationSettings): string {
  let instructions = "OPTIMIZATION STRATEGY:\n";
  
  // Generative Engine Optimization (GEO) - Primary focus
  if (settings.geo_optimization) {
    instructions += "\nGENERATIVE ENGINE OPTIMIZATION (GEO):\n";
    instructions += "- Use clear, authoritative statements that AI can easily cite\n";
    instructions += "- Include statistics, data, and credible sources for AI fact-checking\n";
    instructions += "- Structure content with definitive answers to common questions\n";
    instructions += "- Use natural language that flows well when read aloud by AI\n";
    instructions += "- Include step-by-step processes and numbered lists for AI parsing\n";
    instructions += "- Add context and background information for comprehensive understanding\n";
    instructions += "- Use entity-rich content (people, places, organizations, concepts)\n";
    instructions += "- Provide multiple perspectives on complex topics for AI balance\n";
    instructions += "- Include relevant examples and case studies for AI context\n";
    instructions += "- Use clear cause-and-effect relationships in explanations\n";
  }

  // Traditional SEO
  if (settings.seo_focus === 'traditional' || settings.seo_focus === 'balanced') {
    instructions += "\nTRADITIONAL SEO:\n";
    instructions += "- Focus on keyword density, meta tags, heading structure\n";
    instructions += "- Use target keywords naturally throughout content\n";
    instructions += "- Create descriptive headings (H1-H6) with keyword variations\n";
    instructions += "- Include internal and external linking opportunities\n";
  }

  // AI Search Engines (Perplexity, ChatGPT, Claude, etc.)
  if (settings.perplexity_optimization) {
    instructions += "\nAI SEARCH ENGINE OPTIMIZATION:\n";
    instructions += "- Write with high information density and factual accuracy\n";
    instructions += "- Use conversational yet authoritative tone\n";
    instructions += "- Structure content for easy extraction and summarization\n";
    instructions += "- Include comparative analysis and pros/cons when relevant\n";
    instructions += "- Provide actionable insights and practical recommendations\n";
    instructions += "- Use topic clustering and semantic keyword relationships\n";
  }

  // Google AI Overviews and Featured Snippets
  if (settings.ai_search_optimization) {
    instructions += "\nGOOGLE AI OVERVIEWS OPTIMIZATION:\n";
    instructions += "- Create content in Q&A format for featured snippets\n";
    instructions += "- Use tables and lists for structured data presentation\n";
    instructions += "- Include 'People Also Ask' style questions and answers\n";
    instructions += "- Provide concise definitions and explanations\n";
    instructions += "- Use schema markup concepts in content structure\n";
  }

  // Geographic/Local SEO (traditional location-based)
  if (settings.optimize_for_geographic && settings.target_locations.length > 0) {
    instructions += "\nGEOGRAPHIC/LOCAL SEO:\n";
    instructions += `- Include location-specific terms: ${settings.target_locations.join(', ')}\n`;
    instructions += "- Add 'near me' and local search optimization\n";
    instructions += "- Reference local building codes, regulations, and practices\n";
    instructions += "- Include regional construction trends and market data\n";
  }

  // Content focus based on SEO strategy
  if (settings.seo_focus === 'geo') {
    instructions += "\nPRIMARY FOCUS: Generative Engine Optimization\n";
    instructions += "- Prioritize AI-readable, authoritative content structure\n";
    instructions += "- Ensure content can be easily cited and referenced by AI systems\n";
  }

  return instructions;
}

function createFallbackContent(topic: string, settings: GenerationSettings): BlogContent {
  const currentYear = new Date().getFullYear();
  const targetWordCount = settings.target_word_count || 1200;
  
  // Generate more comprehensive fallback content
  const introduction = `In the rapidly evolving construction industry of ${currentYear}, ${topic.toLowerCase()} has become a critical factor for project success. Construction companies that fail to implement modern approaches to ${topic.toLowerCase()} often struggle with cost overruns, safety incidents, and project delays. This comprehensive guide explores the essential elements, best practices, and innovative strategies that construction professionals need to understand about ${topic.toLowerCase()}.`;

  const challenges = [
    "Budget constraints and cost management pressures",
    "Evolving safety regulations and compliance requirements", 
    "Skilled labor shortages across the industry",
    "Integration of new technologies and digital tools",
    "Environmental sustainability and green building standards",
    "Complex project coordination and stakeholder management"
  ];

  const benefits = [
    "**Enhanced Project Efficiency**: Streamlined processes reduce waste and optimize resource allocation",
    "**Improved Safety Outcomes**: Proactive safety measures protect workers and reduce liability",
    "**Cost Control and Budget Management**: Better planning and monitoring prevent cost overruns",
    "**Quality Assurance**: Systematic approaches ensure high-quality deliverables",
    "**Technology Integration**: Modern tools improve communication and project visibility",
    "**Regulatory Compliance**: Staying current with industry standards and building codes"
  ];

  const bestPractices = [
    "**Comprehensive Planning Phase**: Develop detailed project plans with clear milestones, resource requirements, and risk assessments before breaking ground",
    "**Technology-Driven Project Management**: Implement construction management software, BIM modeling, and mobile communication tools for real-time project tracking",
    "**Safety-First Culture**: Establish daily safety briefings, regular safety training, and zero-tolerance policies for safety violations",
    "**Quality Control Systems**: Implement systematic inspection processes, material testing protocols, and documentation requirements at each project phase",
    "**Stakeholder Communication**: Maintain regular communication with clients, subcontractors, suppliers, and regulatory bodies through scheduled meetings and progress reports",
    "**Continuous Training and Development**: Invest in ongoing education for your team on new techniques, technologies, and industry best practices"
  ];

  const implementation = [
    "Start with a thorough assessment of your current processes and identify areas for improvement",
    "Develop a phased implementation plan that allows for gradual adoption and team training",
    "Invest in the necessary tools, software, and equipment to support your new processes",
    "Train your team comprehensively on new procedures and ensure everyone understands their role",
    "Monitor progress closely and be prepared to make adjustments based on real-world results",
    "Document lessons learned and continuously refine your approach based on project outcomes"
  ];

  const bodyContent = `# ${topic}

${introduction}

## Current Industry Challenges

The construction industry faces numerous challenges that make ${topic.toLowerCase()} more important than ever:

${challenges.map(challenge => `- ${challenge}`).join('\n')}

These challenges require construction companies to adopt more sophisticated approaches to ${topic.toLowerCase()}, leveraging both proven methodologies and innovative solutions.

## Key Benefits and Advantages

Implementing effective ${topic.toLowerCase()} strategies delivers significant benefits:

${benefits.join('\n\n')}

## Essential Best Practices

Based on industry research and real-world experience, here are the most effective practices for ${topic.toLowerCase()}:

${bestPractices.map((practice, index) => `### ${index + 1}. ${practice.split(':')[0].replace(/\*\*/g, '')}\n\n${practice.split(':').slice(1).join(':').trim()}`).join('\n\n')}

## Implementation Strategy

To successfully implement these ${topic.toLowerCase()} strategies in your organization:

${implementation.map((step, index) => `${index + 1}. **${step.split(' ')[0]} ${step.split(' ')[1]}**: ${step.split(' ').slice(2).join(' ')}`).join('\n\n')}

## Technology Integration

Modern construction projects benefit significantly from technology integration in ${topic.toLowerCase()}:

- **Project Management Software**: Platforms like Procore, PlanGrid, or BuildingConnected provide comprehensive project oversight
- **Building Information Modeling (BIM)**: 3D modeling helps visualize potential issues before construction begins
- **Mobile Applications**: Field teams can access plans, submit reports, and communicate in real-time
- **Drone Surveys and Monitoring**: Aerial imagery provides accurate progress tracking and site analysis
- **IoT Sensors and Monitoring**: Real-time data collection improves safety and quality control

## Measuring Success

Track the effectiveness of your ${topic.toLowerCase()} implementation through key performance indicators:

- Project completion times compared to planned schedules
- Budget variance and cost control metrics
- Safety incident rates and near-miss reporting
- Quality scores and defect rates
- Client satisfaction and repeat business rates
- Team productivity and efficiency metrics

## Future Trends and Considerations

The construction industry continues to evolve, and ${topic.toLowerCase()} must adapt to new trends:

- **Sustainable Construction**: Green building practices and environmental considerations
- **Prefabrication and Modular Construction**: Off-site manufacturing for improved quality and efficiency  
- **Artificial Intelligence**: AI-powered project management and predictive analytics
- **Virtual and Augmented Reality**: Enhanced training and project visualization
- **Blockchain Technology**: Improved contract management and supply chain transparency

## Conclusion

Success in ${topic.toLowerCase()} requires a combination of proven best practices, modern technology, and continuous improvement. Construction companies that invest in comprehensive ${topic.toLowerCase()} strategies position themselves for long-term success in an increasingly competitive market.

By implementing the strategies outlined in this guide, construction professionals can improve project outcomes, enhance safety performance, control costs, and deliver superior value to their clients. The key is to start with solid fundamentals and gradually incorporate more advanced techniques as your team develops expertise and confidence.

Remember that ${topic.toLowerCase()} is not a one-time implementation but an ongoing process of refinement and improvement. Stay current with industry developments, invest in your team's education, and remain flexible in your approach to achieve the best results.`;

  return {
    title: `${topic}: Complete Guide for Construction Professionals`,
    body: bodyContent,
    excerpt: `Comprehensive guide to ${topic.toLowerCase()} in construction, covering best practices, technology integration, and implementation strategies for ${currentYear}.`,
    seo_title: `${topic} Guide for Construction | ${currentYear}`,
    seo_description: `Master ${topic.toLowerCase()} in construction with proven strategies, best practices, and technology solutions. Complete guide for construction professionals.`,
    keywords: settings.target_keywords.length > 0 ? settings.target_keywords : [
      "construction management",
      "project planning", 
      "construction best practices",
      "building industry",
      "construction technology"
    ],
    estimated_read_time: Math.ceil(targetWordCount / 200)
  };
}

async function processQueueItem(supabaseClient: any, queueId: string) {
  logStep("Processing queue item", { queueId });

  // Get queue item
  const { data: queueItem, error: queueError } = await supabaseClient
    .from('blog_generation_queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (queueError) throw queueError;

  // Update status to processing
  await supabaseClient
    .from('blog_generation_queue')
    .update({ 
      status: 'processing',
      processing_started_at: new Date().toISOString()
    })
    .eq('id', queueId);

  try {
    // Generate content
    const result = await handleAutoGeneration(
      supabaseClient, 
      queueItem.company_id, 
      queueItem.suggested_topic,
      queueItem.content_parameters
    );

    // Update queue item with success
    await supabaseClient
      .from('blog_generation_queue')
      .update({ 
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        generated_blog_id: JSON.parse(await result.text()).blogPost.id
      })
      .eq('id', queueId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Update queue item with error
    await supabaseClient
      .from('blog_generation_queue')
      .update({ 
        status: 'failed',
        processing_completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_count: queueItem.retry_count + 1
      })
      .eq('id', queueId);

    throw error;
  }
}

async function recordTopicHistory(
  supabaseClient: any,
  companyId: string,
  blogPostId: string,
  topic: string,
  content: BlogContent,
  settings: GenerationSettings
) {
  await supabaseClient
    .from('blog_topic_history')
    .insert([{
      company_id: companyId,
      blog_post_id: blogPostId,
      primary_topic: topic,
      secondary_topics: content.keywords || [],
      keywords_used: settings.target_keywords,
      topic_category: settings.industry_focus[0] || 'construction',
      content_type: 'article',
      target_keywords: content.keywords || [],
      geo_targets: settings.target_locations,
      generation_model: settings.preferred_model,
      generation_time_seconds: 0 // TODO: Track actual generation time
    }]);
}

async function analyzeGeneratedContent(
  supabaseClient: any,
  blogPostId: string,
  content: BlogContent,
  settings: GenerationSettings
) {
  const wordCount = content.body.split(/\s+/).length;
  const headingMatches = content.body.match(/#{1,6}\s/g);
  const linkMatches = content.body.match(/\[.*?\]\(.*?\)/g);

  await supabaseClient
    .from('blog_content_analysis')
    .insert([{
      blog_post_id: blogPostId,
      word_count: wordCount,
      readability_score: 7.5, // TODO: Calculate actual readability
      seo_score: 8.0, // TODO: Calculate actual SEO score
      extracted_topics: content.keywords || [],
      key_phrases: settings.target_keywords,
      heading_structure: { count: headingMatches?.length || 0 },
      internal_links_count: 0,
      external_links_count: linkMatches?.length || 0,
      generation_model: settings.preferred_model,
      generation_temperature: settings.model_temperature,
      ai_confidence: 8.5 // TODO: Get actual confidence from AI response
    }]);
}

async function sendGenerationNotification(
  supabaseClient: any,
  emails: string[],
  blogPost: any,
  content: BlogContent
) {
  // TODO: Implement email notification
  logStep("Sending generation notification", { emails, blogPostId: blogPost.id });
}

async function analyzeContentDiversity(supabaseClient: any, companyId: string) {
  const { data: topicHistory } = await supabaseClient
    .from('blog_topic_history')
    .select('primary_topic, created_at, topic_category')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Analyze topic diversity
  const topicCounts = topicHistory?.reduce((acc: any, item: any) => {
    acc[item.primary_topic] = (acc[item.primary_topic] || 0) + 1;
    return acc;
  }, {}) || {};

  const categoryDiversity = topicHistory?.reduce((acc: any, item: any) => {
    acc[item.topic_category] = (acc[item.topic_category] || 0) + 1;
    return acc;
  }, {}) || {};

  return new Response(JSON.stringify({
    topicCounts,
    categoryDiversity,
    totalPosts: topicHistory?.length || 0,
    uniqueTopics: Object.keys(topicCounts).length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateModelConfiguration(supabaseClient: any, config: any) {
  // Update AI model configurations
  const { error } = await supabaseClient
    .from('ai_model_configurations')
    .upsert(config);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function testGeneration(
  supabaseClient: any,
  companyId: string,
  topic: string,
  settings: any
) {
  const content = await generateContentWithAI(settings, topic, companyId, supabaseClient);
  
  return new Response(JSON.stringify({
    success: true,
    content,
    preview: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
} 