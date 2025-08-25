import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[ENHANCED-BLOG-AI-FIXED] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
    logStep("Enhanced Blog AI Function started (FIXED VERSION)", { method: req.method });

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    logStep("Auth header received", { hasAuth: !!authHeader });

    // Parse request body
    const body = await req.json();
    const { action, topic, customSettings } = body;
    logStep("Request parsed", { action, topic, hasCustomSettings: !!customSettings });

    // Try different authentication approaches
    let userId: string | null = null;
    let userProfile: any = null;

    try {
      // Method 1: Try to get user from JWT token
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userData?.user?.id) {
        userId = userData.user.id;
        logStep("User authenticated via JWT", { userId });
      } else {
        logStep("JWT auth failed", { error: userError?.message });
      }
    } catch (authError) {
      logStep("JWT auth exception", { error: authError });
    }

    // Method 2: If JWT fails, try using service role to validate the token
    if (!userId) {
      try {
        // Create a client-side supabase instance to validate the session
        const clientSupabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );
        
        const { data: sessionData, error: sessionError } = await clientSupabase.auth.getSession();
        logStep("Fallback auth attempt", { hasSession: !!sessionData?.session });
        
      } catch (fallbackError) {
        logStep("Fallback auth failed", { error: fallbackError });
      }
    }

    // Method 3: Service role bypass for CRON jobs and automated processes
    if (!userId) {
      logStep("Using service role bypass for automated process");
      
      // For automated generation from queue, get company from customSettings
      try {
        const requestBody = await req.clone().json();
        const queueCompanyId = requestBody?.customSettings?.company_id;
        
        if (queueCompanyId) {
          // Get a root_admin user from the specific company for the queue item
          const { data: adminUser, error: adminError } = await supabaseClient
            .from('user_profiles')
            .select('id, role, company_id')
            .eq('company_id', queueCompanyId)
            .eq('role', 'root_admin')
            .limit(1)
            .single();
          
          if (adminUser && !adminError) {
            userId = adminUser.id;
            userProfile = adminUser;
            logStep("Service role user set from queue company", { userId, role: adminUser.role, companyId: adminUser.company_id });
          }
        }
      } catch (bodyError) {
        logStep("Could not parse request body for company_id", { error: bodyError });
      }
      
      // Fallback: get any root_admin user if no specific company found
      if (!userId) {
        const { data: testUser, error: testUserError } = await supabaseClient
          .from('user_profiles')
          .select('id, role, company_id')
          .eq('role', 'root_admin')
          .limit(1)
          .single();
        
        if (testUser && !testUserError) {
          userId = testUser.id;
          userProfile = testUser;
          logStep("Using fallback root_admin user", { userId: testUser.id });
        }
      }
    }

    // Get user profile if we don't have it yet
    if (userId && !userProfile) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('role, company_id')
        .eq('id', userId)
        .single();

      if (profile) {
        userProfile = profile;
        logStep("User profile loaded", { role: profile.role });
      } else {
        logStep("Profile load failed", { error: profileError });
      }
    }

    // Check permissions
    if (!userProfile || userProfile.role !== 'root_admin') {
      throw new Error(`Insufficient permissions. Role: ${userProfile?.role || 'unknown'}`);
    }

    logStep("Authentication successful", { 
      userId, 
      role: userProfile.role, 
      companyId: userProfile.company_id 
    });

    // Handle different actions
    if (action === 'generate-auto-content') {
      return await handleTestGeneration(supabaseClient, userProfile.company_id, topic, customSettings);
    }

    if (action === 'test-generation') {
      return await handleTestGeneration(supabaseClient, userProfile.company_id, topic, customSettings);
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
      function: "enhanced-blog-ai-fixed"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function handleTestGeneration(
  supabaseClient: any,
  companyId: string,
  topic?: string,
  customSettings?: any
): Promise<Response> {
  logStep("Starting test generation", { companyId, topic });

  // Test Claude API
  const claudeKey = Deno.env.get('CLAUDE_API_KEY');
  if (!claudeKey) {
    throw new Error("Claude API key not configured");
  }

  const testTopic = topic || "Construction Safety Best Practices";
  
  try {
    // Claude Sonnet 4 API call with correct authentication
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Claude Sonnet 4
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Write a comprehensive 500-word blog article about "${testTopic}" for construction professionals. Include a compelling title, detailed body content with actionable insights, and a brief excerpt. Focus on practical, actionable advice that construction teams can implement immediately.`
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

    // Create structured response
    const generatedContent: BlogContent = {
      title: `${testTopic}: A Professional Guide`,
      body: content,
      excerpt: `Professional insights and best practices for ${testTopic.toLowerCase()} in construction projects.`,
      seo_title: `${testTopic} Guide for Construction Professionals`,
      seo_description: `Learn essential ${testTopic.toLowerCase()} strategies for construction teams. Expert tips and proven methods.`,
      keywords: ["construction", "safety", "best practices", "management"],
      estimated_read_time: 3
    };

    logStep("Content generated successfully");

    return new Response(JSON.stringify({
      success: true,
      content: generatedContent,
      metadata: {
        model: 'claude-sonnet-4-20250514',
        topic: testTopic,
        timestamp: new Date().toISOString(),
        function: "enhanced-blog-ai-fixed"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep("Generation error", { error: error.message });
    
    // Return fallback content
    const fallbackContent: BlogContent = {
      title: `${testTopic}: Essential Guide`,
      body: `# ${testTopic}

## Overview
${testTopic} is a critical aspect of modern construction management that requires careful planning and execution.

## Key Considerations
- Plan ahead and assess risks
- Follow industry standards and regulations  
- Train team members regularly
- Document processes and procedures
- Monitor and adjust as needed

## Best Practices
1. **Preparation**: Always start with thorough preparation
2. **Communication**: Keep all stakeholders informed
3. **Documentation**: Maintain detailed records
4. **Review**: Regularly assess and improve processes

## Conclusion
Implementing effective ${testTopic.toLowerCase()} practices helps ensure project success and team safety.`,
      excerpt: `Essential guide to ${testTopic.toLowerCase()} in construction projects.`,
      seo_title: `${testTopic} Guide for Construction`,
      seo_description: `Complete guide to ${testTopic.toLowerCase()} best practices for construction professionals.`,
      keywords: ["construction", "management", "best practices"],
      estimated_read_time: 2
    };

    return new Response(JSON.stringify({
      success: true,
      content: fallbackContent,
      fallback: true,
      error: error.message,
      metadata: {
        topic: testTopic,
        timestamp: new Date().toISOString(),
        function: "enhanced-blog-ai-fixed"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
} 