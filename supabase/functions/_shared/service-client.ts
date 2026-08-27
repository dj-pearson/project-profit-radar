/**
 * A service-role Supabase client, for writes RLS has no policy path for.
 *
 * US-237 scopes the permissive `FOR ALL USING (true)` policies to service_role.
 * Several tables (usage_metrics, workflow_step_executions, ...) are left with a
 * company-scoped SELECT policy and nothing else, so once that migration lands a
 * user-JWT client cannot write them at all. Handlers that did so were silently
 * doing nothing — the Supabase client returns errors rather than throwing, and
 * the call sites discarded them.
 *
 * Using this client means RLS is off for that query, so the CALLER MUST ALREADY
 * BE AUTHORISED by the handler: authenticate with the user's JWT, derive
 * company_id from their own profile, and never from the request body. See
 * scripts/check-edge-privilege-writes.mjs, which enforces that.
 *
 * Use the user-JWT client from initializeAuthContext() for everything else —
 * reads and writes RLS can police are better policed by RLS.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}
