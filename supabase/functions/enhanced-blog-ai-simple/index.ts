import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// The caller, src/components/admin/BlogAIDebugger.tsx, sends
// { action: 'test-generation' | 'test-claude', topic }. topic is interpolated
// into a model prompt, so it is bounded.
const EnhancedBlogAiSimpleSchema = z.object({
  action: z.string().max(50),
  topic: z.string().max(1000).nullish(),
  customSettings: z.record(z.unknown()).nullish(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller: invoked from src/components/admin/BlogAIDebugger.tsx.
    // verify_jwt = true is a signature check the publishable anon key
    // satisfies, not authentication (US-241).
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    // Admin only, the same roles enhanced-blog-ai-fixed admits through
    // requireSystemOrAdmin. A signed-in check alone let any user of any tenant
    // spend CLAUDE_API_KEY tokens through the test-claude action. The role is
    // checked directly rather than through requireSystemOrAdmin because that
    // guard admits everyone while CRON_SECRET is unset, and this function has
    // no scheduler caller.
    const { data: callerProfile } = await authContext.supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authContext.user.id)
      .maybeSingle();
    if (!callerProfile || !['admin', 'root_admin'].includes(callerProfile.role)) {
      return errorResponse('Forbidden - admin access required', 403, req);
    }

    console.log("Enhanced Blog AI Simple - Function started");
    
    const parsed = await validateBody(req, EnhancedBlogAiSimpleSchema, { name: 'enhanced-blog-ai-simple' });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const { action, topic, customSettings } = body;

    // Test environment variables
    const claudeKey = Deno.env.get("CLAUDE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Presence only. Never log or return any part of a key (prefix, length):
    // a prefix narrows the search space and identifies the key in a leak.
    console.log("Environment check:", {
      hasClaudeKey: !!claudeKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
    });

    if (action === 'test-generation') {
      // Return diagnostic information
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        success: true,
        diagnostic: true,
        environment: {
          hasClaudeKey: !!claudeKey,
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
        },
        content: {
          title: `Test: ${topic}`,
          body: `# ${topic}\n\nThis is a test response from the simplified Edge Function.\n\n## Environment Status\n\n- Claude API Key: ${claudeKey ? '✓ Configured' : '✗ Missing'}\n- Supabase URL: ${supabaseUrl ? '✓ Configured' : '✗ Missing'}\n- Service Role Key: ${supabaseKey ? '✓ Configured' : '✗ Missing'}\n\n## Next Steps\n\nIf all environment variables are configured, try the full AI generation.`,
          excerpt: `Test response for ${topic}`,
          seo_title: `Test: ${topic}`,
          seo_description: `Test SEO description for ${topic}`,
          keywords: ["test", "construction"],
          estimated_read_time: 2
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If Claude key is available, try a simple Claude call
    if (claudeKey && action === 'test-claude') {
      try {
        console.log("Testing Claude API...");
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': claudeKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Write a comprehensive 400-word article about "${topic}" for construction professionals. Return as JSON with fields: title, body, excerpt.`
            }],
          }),
        });

        console.log("Claude response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("Claude error:", errorText);
          throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Claude response received");

        const content = data.content[0].text;
        
        // Try to parse JSON, if it fails, create structured response
        let generatedContent;
        try {
          generatedContent = JSON.parse(content);
        } catch {
          generatedContent = {
            title: `${topic}: Professional Guide`,
            body: content,
            excerpt: `Professional insights on ${topic} for construction teams.`
          };
        }

        return new Response(JSON.stringify({
          timestamp: new Date().toISOString(),
          success: true,
          claudeTest: true,
          content: {
            ...generatedContent,
            seo_title: generatedContent.title || topic,
            seo_description: generatedContent.excerpt || `Learn about ${topic}`,
            keywords: ["construction", "management"],
            estimated_read_time: 3
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error: any) {
        console.error("Claude API error:", error);
        return new Response(JSON.stringify({
          timestamp: new Date().toISOString(),
          success: false,
          error: `Claude API failed: ${error.message}`,
          fallback: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Default fallback response
    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: true,
      fallback: true,
      message: "Simplified function working",
      availableActions: ["test-generation", "test-claude"],
      receivedAction: action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    await captureException(error, { fn: 'enhanced-blog-ai-simple', req });
    console.error("Function error:", error);
    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 