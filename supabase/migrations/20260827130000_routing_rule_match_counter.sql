-- US-300 / quickbooks-route-transactions.
--
-- The function incremented a routing rule's match counter with
--
--   .update({ matches_count: supabase.raw('matches_count + 1') })
--
-- and supabase-js has no `raw`. `supabase.raw` is undefined, so that line threw
-- a TypeError on every matched transaction, landed in the per-transaction catch,
-- and took the routing-history write and the auto_assigned/review_required
-- counters down with it. The batch then reported "Processed N transactions.
-- 0 auto-assigned, 0 need review" with success: true.
--
-- An atomic increment needs to happen in the database. Read-modify-write from
-- the edge function would lose counts whenever one rule matches twice in the
-- same batch, which is the normal case.
--
-- Additive: new function only, no change to any existing shape.

CREATE OR REPLACE FUNCTION public.increment_routing_rule_match(p_rule_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_matches_count integer;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.quickbooks_routing_rules
  WHERE id = p_rule_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Routing rule % not found', p_rule_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Same tenancy check the table's RLS policies apply, enforced here because
  -- SECURITY DEFINER bypasses them.
  IF NOT public.user_in_company(v_company_id) THEN
    RAISE EXCEPTION 'Not permitted to update routing rule %', p_rule_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.quickbooks_routing_rules
  SET matches_count = COALESCE(matches_count, 0) + 1,
      last_matched_at = now(),
      updated_at = now()
  WHERE id = p_rule_id
  RETURNING matches_count INTO v_matches_count;

  RETURN v_matches_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_routing_rule_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_routing_rule_match(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_routing_rule_match(uuid) IS
  'Atomically increments a QuickBooks routing rule match counter. Replaces a supabase.raw() call that never worked (US-300).';
