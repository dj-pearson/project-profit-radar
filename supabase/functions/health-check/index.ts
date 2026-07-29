import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { evaluateHealth } from "./evaluate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const checks: Record<string, { status: string; responseTime: number; error?: string }> = {};

  // Check database connectivity
  const dbStart = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { error } = await supabase.from("companies").select("id").limit(1);
    checks.database = {
      status: error ? "degraded" : "healthy",
      responseTime: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      responseTime: Date.now() - dbStart,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check auth service
  const authStart = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { error } = await supabase.auth.getSession();
    checks.auth = {
      status: error ? "degraded" : "healthy",
      responseTime: Date.now() - authStart,
      ...(error && { error: error.message }),
    };
  } catch (err) {
    checks.auth = {
      status: "unhealthy",
      responseTime: Date.now() - authStart,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check storage service
  const storageStart = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { error } = await supabase.storage.listBuckets();
    checks.storage = {
      status: error ? "degraded" : "healthy",
      responseTime: Date.now() - storageStart,
      ...(error && { error: error.message }),
    };
  } catch (err) {
    checks.storage = {
      status: "unhealthy",
      responseTime: Date.now() - storageStart,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Only a fully healthy service returns 200. Both "degraded" (a dependency
  // returned an error) and "unhealthy" (a dependency threw) return 503 so that
  // uptime monitors and load balancers actually alert on partial outages
  // instead of treating a degraded service as fully up. (Logic lives in
  // ./evaluate.ts so it can be unit-tested — see evaluate.test.ts.)
  const { overallStatus, httpStatus } = evaluateHealth(checks);
  const totalResponseTime = Date.now() - startTime;

  return new Response(
    JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalResponseTime,
      services: checks,
      version: "1.0.0",
    }),
    {
      status: httpStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
