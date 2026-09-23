// Blog AI Edge Function
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { aiService } from "../_shared/ai-service.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// root_admin only; no caller in src/ or Brikly-iOS/. prompt and blogTopic are
// alternatives, so both are optional.
const BlogAiSchema = z.object({
  action: z.string().max(50),
  prompt: z.string().max(10000).nullish(),
  blogTopic: z.string().max(1000).nullish(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  console.log(`[BLOG-AI] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is root admin with site isolation
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (profileError || userProfile.role !== 'root_admin') {
      throw new Error("Insufficient permissions");
    }

    const parsed = await validateBody(req, BlogAiSchema, { name: 'blog-ai' });
    if (!parsed.ok) return parsed.response;
    const { action, prompt, blogTopic } = parsed.data;

    if (action === 'generate-content') {
      logStep("Generating content with AI service");

      const generatedContent = await aiService.generateBlogContent((blogTopic || prompt) as string);

      return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString(), content: generatedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

    