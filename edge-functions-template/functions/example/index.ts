/**
 * Example Edge Function
 * 
 * A simple example showing how to:
 * - Parse JSON request body
 * - Access Supabase client
 * - Return JSON response
 * - Handle errors
 * 
 * Usage:
 * POST /example
 * Body: { "name": "World" }
 * 
 * Response: { "message": "Hello, World!", "timestamp": "..." }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse request body
    const { name = 'Anonymous' } = await req.json();

    // Example: Query Supabase (optional)
    // const { data, error } = await supabaseClient
    //   .from('your_table')
    //   .select('*')
    //   .limit(1);
    //
    // if (error) throw error;

    // Create response data
    const responseData = {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development',
    };

    // Return success response
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    // Error handling
    console.error('Function error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

