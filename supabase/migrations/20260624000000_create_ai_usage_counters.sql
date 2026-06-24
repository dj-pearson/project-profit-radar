-- AI usage metering — per-company, per-month counter for the server-side AI quota.
--
-- Context (security audit CR-1 / H-6): AI edge functions had no hard usage
-- ceiling, and the existing `usage_metrics` table is client-writable and metered
-- with a non-atomic read-modify-write (audit H-1), so it cannot back a tamper-proof
-- quota. This table is the authoritative, unspoofable counter:
--   * Writes happen ONLY via the SECURITY DEFINER `increment_ai_usage` RPC, which
--     runs as the service role. There is no client INSERT/UPDATE/DELETE policy, so
--     a normal authenticated client can never forge or reset its usage.
--   * The increment is a single atomic UPSERT (no read-modify-write race).
--
-- This migration is ADDITIVE only (CREATE TABLE + CREATE FUNCTION). It does NOT
-- touch or tighten any existing table or RLS policy, so it is safe to ship in a
-- single release per the Backward Compatibility rules in CLAUDE.md. Tightening the
-- existing `subscribers` / `usage_metrics` / `companies` RLS (audit CR-2 / H-1) is
-- the separate, staged Phase 1 work and is intentionally NOT done here.

CREATE TABLE IF NOT EXISTS public.ai_usage_counters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- First day of the UTC month this counter is for (e.g. 2026-06-01).
  period_month  DATE NOT NULL,
  -- Number of billable AI calls made by the company this month.
  ai_calls      BIGINT NOT NULL DEFAULT 0,
  -- Best-effort token accounting (provider-reported); 0 when unknown.
  ai_tokens     BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_counters_company_period_key UNIQUE (company_id, period_month)
);

COMMENT ON TABLE public.ai_usage_counters IS
  'Authoritative per-company monthly AI usage counter backing the server-side AI quota. Written only by the increment_ai_usage RPC (service role); no client write policy.';

CREATE INDEX IF NOT EXISTS idx_ai_usage_counters_company_period
  ON public.ai_usage_counters (company_id, period_month);

-- RLS: read-only for members of the owning company (so the app can show usage),
-- and NO write policy at all — only the service role (which bypasses RLS) and the
-- SECURITY DEFINER RPC below may write. This is correct-by-construction and avoids
-- the client-writable pitfall of usage_metrics (audit H-1).
ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_counters_select_own_company" ON public.ai_usage_counters;
CREATE POLICY "ai_usage_counters_select_own_company"
  ON public.ai_usage_counters
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
  );

-- Atomic, race-free increment of the current month's counter for a company.
-- Returns the running totals AFTER applying the increment so the caller can make a
-- post-hoc decision if needed. SECURITY DEFINER so it can write regardless of the
-- caller's RLS context; callers must be trusted edge functions (service role).
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_company_id UUID,
  p_calls      INTEGER DEFAULT 1,
  p_tokens     BIGINT  DEFAULT 0
)
RETURNS TABLE (ai_calls BIGINT, ai_tokens BIGINT, period_month DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := date_trunc('month', now() AT TIME ZONE 'utc')::date;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'increment_ai_usage: p_company_id is required';
  END IF;

  RETURN QUERY
  INSERT INTO public.ai_usage_counters (company_id, period_month, ai_calls, ai_tokens)
  VALUES (p_company_id, v_period, GREATEST(p_calls, 0), GREATEST(p_tokens, 0))
  ON CONFLICT (company_id, period_month)
  DO UPDATE SET
    ai_calls   = public.ai_usage_counters.ai_calls  + GREATEST(p_calls, 0),
    ai_tokens  = public.ai_usage_counters.ai_tokens + GREATEST(p_tokens, 0),
    updated_at = now()
  RETURNING
    public.ai_usage_counters.ai_calls,
    public.ai_usage_counters.ai_tokens,
    public.ai_usage_counters.period_month;
END;
$$;

-- Only the service role may execute the writer. Revoke the default PUBLIC grant so
-- an anon/authenticated client cannot call it to inflate or zero a counter.
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, INTEGER, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, INTEGER, BIGINT) FROM anon;
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, INTEGER, BIGINT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, INTEGER, BIGINT) TO service_role;
