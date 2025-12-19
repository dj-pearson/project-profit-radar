/**
 * Health Check Function
 * 
 * Returns the health status of the Edge Functions server.
 * This is automatically called by Docker health checks and
 * monitoring systems.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (_req) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: performance.now(),
    runtime: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
    },
    environment: {
      supabaseConfigured: !!Deno.env.get('SUPABASE_URL'),
    },
  };

  return new Response(
    JSON.stringify(healthData, null, 2),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
});

