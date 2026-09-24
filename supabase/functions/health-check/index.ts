import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { evaluateHealth, runCheck, toPublicChecks, type CheckResult } from "./evaluate.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { withErrorReporting } from '../_shared/observability.ts';

serve(withErrorReporting('health-check', async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Each probe runs under a 5s deadline (runCheck), in parallel, so one hung
  // dependency is reported by name instead of timing out the whole request.
  const [database, auth, storage] = await Promise.all([
    runCheck(() => admin.from("companies").select("id").limit(1)),
    // GoTrue's own health endpoint. The previous auth.getSession() on a fresh
    // client read local session storage and never left the process, so it
    // reported "healthy" with auth down.
    runCheck(async () => {
      const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey } });
      await res.body?.cancel();
      return { error: res.ok ? null : `auth health answered HTTP ${res.status}` };
    }),
    runCheck(() => admin.storage.listBuckets()),
  ]);
  const checks: Record<string, CheckResult> = { database, auth, storage };

  // Only a fully healthy service returns 200. Both "degraded" (a dependency
  // returned an error) and "unhealthy" (a dependency threw) return 503 so that
  // uptime monitors and load balancers actually alert on partial outages
  // instead of treating a degraded service as fully up. (Logic lives in
  // ./evaluate.ts so it can be unit-tested - see evaluate.test.ts.)
  const { overallStatus, httpStatus } = evaluateHealth(checks);
  const totalResponseTime = Date.now() - startTime;

  // Dependency error text stays in the function log, not the public body.
  for (const [name, c] of Object.entries(checks)) {
    if (c.error) console.error(`[health-check] ${name} ${c.status}: ${c.error}`);
  }

  return new Response(
    JSON.stringify({
      success: httpStatus < 400,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalResponseTime,
      services: toPublicChecks(checks),
      version: "1.0.0",
    }),
    {
      status: httpStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}));
