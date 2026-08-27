/**
 * Test AI Configuration Edge Function
 *
 * Tests the AI configuration including Coolify Team Shared Variables
 * Verifies both standard and lightweight model connectivity
 *
 * Endpoint: POST /functions/v1/test-ai-configuration
 * Auth: Requires root_admin role
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { AIServiceV2 } from "../_shared/ai-service-v2.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user and verify root_admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'root_admin') {
      return new Response(
        JSON.stringify({ error: 'Root admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const testType = body.testType || 'full'; // 'full', 'standard', 'lightweight', 'config_only'

    // Initialize AI service and run tests
    const aiService = new AIServiceV2();

    if (testType === 'config_only') {
      // Just return configuration without making API calls
      await aiService.initialize();
      const config = aiService.getConfig();

      return new Response(
        JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          testType: 'config_only',
          config,
          environment: {
            AI_DEFAULT_PROVIDER: Deno.env.get('AI_DEFAULT_PROVIDER') || '(not set)',
            DEFAULT_AI_MODEL: Deno.env.get('DEFAULT_AI_MODEL') || '(not set)',
            LIGHTWEIGHT_AI_MODEL: Deno.env.get('LIGHTWEIGHT_AI_MODEL') || '(not set)',
            CLAUDE_API_KEY: Deno.env.get('CLAUDE_API_KEY') ? '***configured***' : '(not set)',
            OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') ? '***configured***' : '(not set)',
            AI_MAX_RETRIES: Deno.env.get('AI_MAX_RETRIES') || '(not set)',
            AI_TIMEOUT_MS: Deno.env.get('AI_TIMEOUT_MS') || '(not set)',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run full or partial tests
    const results = await aiService.testConfiguration();

    // Add environment variable status for diagnostics
    const envStatus = {
      AI_DEFAULT_PROVIDER: Deno.env.get('AI_DEFAULT_PROVIDER') || '(not set)',
      DEFAULT_AI_MODEL: Deno.env.get('DEFAULT_AI_MODEL') || '(not set)',
      LIGHTWEIGHT_AI_MODEL: Deno.env.get('LIGHTWEIGHT_AI_MODEL') || '(not set)',
      CLAUDE_API_KEY: Deno.env.get('CLAUDE_API_KEY') ? '***configured***' : '(not set)',
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') ? '***configured***' : '(not set)',
    };

    return new Response(
      JSON.stringify({
        success: results.success,
        timestamp: new Date().toISOString(),
        testType,
        environment: envStatus,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Test AI configuration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
