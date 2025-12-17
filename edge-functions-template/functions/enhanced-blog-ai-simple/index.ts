import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Enhanced Blog AI Simple - Function started");
    
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const { action, topic, customSettings } = body;

    // Test environment variables
    const claudeKey = Deno.env.get("CLAUDE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      hasClaudeKey: !!claudeKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      claudeKeyLength: claudeKey?.length || 0
    });

    if (action === 'test-generation') {
      // Return diagnostic information
      return new Response(JSON.stringify({
        success: true,
        diagnostic: true,
        environment: {
          hasClaudeKey: !!claudeKey,
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          claudeKeyPrefix: claudeKey?.substring(0, 10) + "..." || "Not found"
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
      success: true,
      fallback: true,
      message: "Simplified function working",
      availableActions: ["test-generation", "test-claude"],
      receivedAction: action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 