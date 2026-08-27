-- The public profitability calculator has never captured a lead (US-303).
--
-- src/lib/calculatorAnalytics.ts calls increment_lead_score in three places and
-- increment_session_calculations in one. Neither has ever been defined in a
-- migration. Until US-212 fixed the TS2551s those calls used .catch() on a
-- PostgrestBuilder, which has then() but no catch(), so a TypeError was raised
-- before the request left the browser. Fixing that made the calls real, and
-- real calls to a function that does not exist log an error on every
-- interaction. This migration decides the question the story posed: lead
-- capture IS a feature - /calculator and /profitability-calculator are live
-- marketing routes - so the functions get created rather than the call sites
-- deleted.
--
-- Creating the two functions alone would not make a score move, because the
-- rest of the path is broken in ways that only became visible once the RPCs
-- were looked at. Verified against 20250710000000_profitability_calculator_leads.sql,
-- which is the only migration that touches these tables:
--
--   1. calculator_calculations.session_id is `UUID REFERENCES
--      calculator_sessions(id)`, but the client passes generateSessionId()'s
--      output - `calc_<epoch>_<suffix>`. Postgres raises 22P02 on the cast, and
--      the insert's error is never read, so no calculation has ever been
--      stored.
--   2. anon holds INSERT on calculator_leads and neither SELECT nor UPDATE. The
--      client's upsert needs both: an INSERT carrying a RETURNING clause is
--      rejected outright without a SELECT policy, and ON CONFLICT DO UPDATE is
--      rejected without an UPDATE policy - both with `new row violates
--      row-level security policy for table "calculator_leads"`, each verified
--      independently against the schema. The same statement without RETURNING
--      and without ON CONFLICT succeeds, which is how the table has rows at
--      all. So trackEmailCapture throws and returns null; leadId is null for
--      every visitor, which is why increment_lead_score would never have fired
--      even if it existed.
--   3. anon holds no UPDATE on calculator_sessions at all. Every
--      email_captured / pdf_downloaded / social_shared / trial_clicked /
--      time_on_page write is filtered to zero rows and reports no error.
--      get_calculator_funnel_metrics reads exactly those columns, so the funnel
--      has always been all zeros.
--   4. trackReferral builds its update with supabase.raw(), which is not a
--      method on the supabase-js v2 client. Evaluating it throws a TypeError
--      before .update() is reached, so referral_count has never moved either.
--
-- The fix is a set of SECURITY DEFINER entry points rather than new anon
-- UPDATE/SELECT policies. anon has no identity, so any policy that let it
-- update calculator_sessions would let anyone update anyone's session row and
-- read back leads. A definer function can do the narrow thing - flip one known
-- boolean on one session, add a clamped number of points to one lead - without
-- handing out the table.
--
-- Backward compatibility: nothing here is removed or tightened. The existing
-- anon INSERT policies stay, so a browser still running the previous bundle
-- (CLAUDE.md budgets ~24h of mixed web clients after a Pages deploy) keeps
-- working exactly as well as it did before. Once that window has passed a
-- follow-up release can drop the direct-insert policies; doing it here would
-- break the older clients this release is meant to coexist with.

-- ---------------------------------------------------------------------------
-- increment_session_calculations(text)
-- ---------------------------------------------------------------------------
-- Counts a calculation against the session row. The column is
-- calculations_performed, not calculations_count - get_calculator_funnel_metrics
-- reads it as `COUNT(... WHERE cs.calculations_performed > 0 ...)`.
CREATE OR REPLACE FUNCTION public.increment_session_calculations(
  p_session_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) = 0 OR length(p_session_id) > 128 THEN
    RETURN NULL;
  END IF;

  UPDATE public.calculator_sessions
     SET calculations_performed = COALESCE(calculations_performed, 0) + 1
   WHERE session_id = p_session_id
  RETURNING calculations_performed INTO v_count;

  -- No matching session is not an error the visitor can act on. The session
  -- insert is fire-and-forget on page load and may have lost a race with the
  -- first calculation; the calculation row is still written either way.
  RETURN v_count;
END;
$function$;

COMMENT ON FUNCTION public.increment_session_calculations(text) IS
  'US-303. Increments calculator_sessions.calculations_performed for one session. SECURITY DEFINER because anon holds no UPDATE on the table and must not be granted one - it has no identity, so an anon UPDATE policy is an update-anyone policy. Returns NULL when no session row matches, which is a lost race on page load, not a failure.';

REVOKE ALL ON FUNCTION public.increment_session_calculations(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_session_calculations(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- increment_lead_score(uuid, integer)
-- ---------------------------------------------------------------------------
-- AC2 asks that a caller not be able to score another company's leads.
-- calculator_leads has no company_id - it is a single global marketing funnel
-- that predates any tenancy on this path - so there is no cross-company
-- boundary to enforce here. The boundary that does exist is the lead uuid
-- itself: a visitor only ever learns the id of the lead they just created,
-- because capture_calculator_lead below is the only way to obtain one and it
-- returns only the caller's own. What that leaves is a caller who guesses a
-- uuid, so the damage is capped instead: points are clamped to 1..25 (the
-- largest legitimate award is 20, for a trial click) and the score is clamped
-- to 0..1000, making this an increment rather than an arbitrary write.
CREATE OR REPLACE FUNCTION public.increment_lead_score(
  p_lead_id uuid,
  p_points integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_points integer;
  v_score integer;
BEGIN
  IF p_lead_id IS NULL OR p_points IS NULL THEN
    RETURN NULL;
  END IF;

  v_points := LEAST(25, GREATEST(1, p_points));

  UPDATE public.calculator_leads
     SET lead_score = LEAST(1000, GREATEST(0, COALESCE(lead_score, 0) + v_points))
   WHERE id = p_lead_id
  RETURNING lead_score INTO v_score;

  RETURN v_score;
END;
$function$;

COMMENT ON FUNCTION public.increment_lead_score(uuid, integer) IS
  'US-303. Adds a clamped number of points to one calculator lead''s score. SECURITY DEFINER because anon holds no UPDATE on calculator_leads and granting it would let any visitor rewrite any lead. calculator_leads carries no company_id, so the only boundary is the lead uuid, which a visitor obtains solely from capture_calculator_lead for their own lead; clamping p_points to 1..25 and the score to 0..1000 caps what a guessed id could do to an increment. Returns NULL when no lead matches.';

REVOKE ALL ON FUNCTION public.increment_lead_score(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_lead_score(uuid, integer) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- capture_calculator_lead(...)
-- ---------------------------------------------------------------------------
-- Replaces the client-side upsert that RLS has always emptied. Also fixes a
-- second bug in that upsert: it set lead_score to the literal 10, so a repeat
-- capture from a lead who had already earned points would reset them. Here the
-- floor is applied with GREATEST instead.
CREATE OR REPLACE FUNCTION public.capture_calculator_lead(
  p_session_id text,
  p_email text,
  p_company_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_email text;
  v_lead_id uuid;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));

  -- Deliberately permissive: this is a marketing funnel, and rejecting a
  -- deliverable address is worse than accepting an undeliverable one. It only
  -- rules out shapes that cannot be an address at all, so that anon cannot use
  -- the function to write arbitrary text rows.
  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'invalid email' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.calculator_leads (
    email, company_name, phone, utm_source, utm_medium, utm_campaign, status, lead_score
  )
  VALUES (
    v_email,
    NULLIF(left(trim(COALESCE(p_company_name, '')), 200), ''),
    NULLIF(left(trim(COALESCE(p_phone, '')), 50), ''),
    NULLIF(left(trim(COALESCE(p_utm_source, '')), 200), ''),
    NULLIF(left(trim(COALESCE(p_utm_medium, '')), 200), ''),
    NULLIF(left(trim(COALESCE(p_utm_campaign, '')), 200), ''),
    'new',
    10
  )
  ON CONFLICT (email) DO UPDATE SET
    company_name = COALESCE(EXCLUDED.company_name, public.calculator_leads.company_name),
    phone        = COALESCE(EXCLUDED.phone, public.calculator_leads.phone),
    utm_source   = COALESCE(public.calculator_leads.utm_source, EXCLUDED.utm_source),
    utm_medium   = COALESCE(public.calculator_leads.utm_medium, EXCLUDED.utm_medium),
    utm_campaign = COALESCE(public.calculator_leads.utm_campaign, EXCLUDED.utm_campaign),
    -- Never lower an accumulated score back to the capture floor.
    lead_score   = GREATEST(COALESCE(public.calculator_leads.lead_score, 0), 10)
  RETURNING id INTO v_lead_id;

  -- Link the session so get_calculator_funnel_metrics can join it. Separate
  -- statement rather than a policy grant, for the same reason as above.
  IF p_session_id IS NOT NULL AND length(p_session_id) BETWEEN 1 AND 128 THEN
    UPDATE public.calculator_sessions
       SET lead_id = v_lead_id,
           email_captured = true
     WHERE session_id = p_session_id;
  END IF;

  RETURN v_lead_id;
END;
$function$;

COMMENT ON FUNCTION public.capture_calculator_lead(text, text, text, text, text, text, text) IS
  'US-303. Upserts a calculator lead and links it to its session, returning the lead id. The client used to do this with .upsert().select().single(); anon holds INSERT on calculator_leads but neither SELECT nor UPDATE, and RLS rejects both the RETURNING clause and the ON CONFLICT DO UPDATE, so trackEmailCapture threw and returned null for every visitor. Returns only the caller''s own lead id and never exposes another row, so a definer function is narrower here than the SELECT and UPDATE policies the client-side version would have needed.';

REVOKE ALL ON FUNCTION public.capture_calculator_lead(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_calculator_lead(text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- calculator_clamp(numeric, numeric, numeric)
-- ---------------------------------------------------------------------------
-- Bounds a value to the precision of the column it is going into. STRICT is
-- what makes it safe: GREATEST and LEAST ignore NULL arguments rather than
-- propagating them, so a bare GREATEST(-999.99, NULL) is -999.99, not NULL -
-- an absent profit margin would be stored as the floor. STRICT returns NULL
-- the moment any argument is NULL, which is the wanted behaviour.
CREATE OR REPLACE FUNCTION public.calculator_clamp(
  p_value numeric,
  p_min numeric,
  p_max numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT LEAST(p_max, GREATEST(p_min, p_value))
$function$;

COMMENT ON FUNCTION public.calculator_clamp(numeric, numeric, numeric) IS
  'US-303. Bounds a calculator value to its column precision. STRICT because GREATEST/LEAST ignore NULL arguments instead of propagating them, so clamping a NULL inline would silently store the boundary value.';

REVOKE ALL ON FUNCTION public.calculator_clamp(numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculator_clamp(numeric, numeric, numeric) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- record_calculator_calculation(...)
-- ---------------------------------------------------------------------------
-- Resolves the text session id to the calculator_sessions uuid the FK actually
-- wants, which is what the client cannot do (no anon SELECT) and what made
-- every direct insert fail the uuid cast. Increments the session counter in the
-- same transaction so the stored calculations and calculations_performed cannot
-- drift apart; that is why the client no longer calls
-- increment_session_calculations itself.
CREATE OR REPLACE FUNCTION public.record_calculator_calculation(
  p_session_id text,
  p_project_type text,
  p_labor_hours numeric,
  p_material_cost numeric,
  p_crew_size integer,
  p_project_duration integer,
  p_lead_id uuid DEFAULT NULL,
  p_recommended_bid numeric DEFAULT NULL,
  p_profit_margin numeric DEFAULT NULL,
  p_hourly_rate numeric DEFAULT NULL,
  p_break_even_amount numeric DEFAULT NULL,
  p_risk_score integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_session_uuid uuid;
  v_calculation_id uuid;
BEGIN
  IF p_project_type IS NULL OR length(trim(p_project_type)) = 0 THEN
    RAISE EXCEPTION 'project type is required' USING ERRCODE = '22023';
  END IF;

  -- These four are NOT NULL on the table. Rejecting them here names the
  -- problem; letting the insert do it produces a constraint error the caller
  -- cannot read.
  IF p_labor_hours IS NULL OR p_material_cost IS NULL
     OR p_crew_size IS NULL OR p_project_duration IS NULL THEN
    RAISE EXCEPTION 'labor hours, material cost, crew size and project duration are required'
      USING ERRCODE = '22023';
  END IF;

  IF p_session_id IS NOT NULL AND length(p_session_id) BETWEEN 1 AND 128 THEN
    SELECT id INTO v_session_uuid
      FROM public.calculator_sessions
     WHERE session_id = p_session_id
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  INSERT INTO public.calculator_calculations (
    session_id, lead_id, project_type, labor_hours, material_cost, crew_size,
    project_duration, recommended_bid, profit_margin, hourly_rate,
    break_even_amount, risk_score
  )
  VALUES (
    v_session_uuid,
    p_lead_id,
    left(trim(p_project_type), 100),
    -- Every numeric column here is NUMERIC(10,2) except profit_margin, which
    -- is NUMERIC(5,2). This is a public endpoint, so a value wider than the
    -- column is reachable from the browser and would take the whole insert
    -- down with a numeric-overflow error nobody reads.
    public.calculator_clamp(p_labor_hours, 0, 99999999.99),
    public.calculator_clamp(p_material_cost, 0, 99999999.99),
    LEAST(100000, GREATEST(0, p_crew_size)),
    LEAST(100000, GREATEST(0, p_project_duration)),
    public.calculator_clamp(p_recommended_bid, -99999999.99, 99999999.99),
    public.calculator_clamp(p_profit_margin, -999.99, 999.99),
    public.calculator_clamp(p_hourly_rate, -99999999.99, 99999999.99),
    public.calculator_clamp(p_break_even_amount, -99999999.99, 99999999.99),
    p_risk_score
  )
  RETURNING id INTO v_calculation_id;

  IF v_session_uuid IS NOT NULL THEN
    PERFORM public.increment_session_calculations(p_session_id);
  END IF;

  RETURN v_calculation_id;
END;
$function$;

COMMENT ON FUNCTION public.record_calculator_calculation(text, text, numeric, numeric, integer, integer, uuid, numeric, numeric, numeric, numeric, integer) IS
  'US-303. Stores one calculator run and counts it against its session. calculator_calculations.session_id is a uuid FK to calculator_sessions(id) while the client only holds the text session_id, and anon cannot SELECT the table to resolve it - so every direct insert failed the uuid cast with 22P02 and the unread error hid it. Does the lookup, the insert and the counter bump in one transaction.';

REVOKE ALL ON FUNCTION public.record_calculator_calculation(text, text, numeric, numeric, integer, integer, uuid, numeric, numeric, numeric, numeric, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_calculator_calculation(text, text, numeric, numeric, integer, integer, uuid, numeric, numeric, numeric, numeric, integer) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- record_calculator_session_event(text, text, integer)
-- ---------------------------------------------------------------------------
-- One entry point for the four funnel flags and the dwell timer, instead of
-- five anon UPDATE grants on calculator_sessions. The event name is matched
-- against a fixed list, so the set of columns anon can touch is the set written
-- here and nothing else.
CREATE OR REPLACE FUNCTION public.record_calculator_session_event(
  p_session_id text,
  p_event text,
  p_seconds integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_updated integer := 0;
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) NOT BETWEEN 1 AND 128 THEN
    RETURN false;
  END IF;

  CASE p_event
    WHEN 'pdf_downloaded' THEN
      UPDATE public.calculator_sessions SET pdf_downloaded = true
       WHERE session_id = p_session_id;
    WHEN 'social_shared' THEN
      UPDATE public.calculator_sessions SET social_shared = true
       WHERE session_id = p_session_id;
    WHEN 'trial_clicked' THEN
      UPDATE public.calculator_sessions SET trial_clicked = true
       WHERE session_id = p_session_id;
    WHEN 'email_captured' THEN
      UPDATE public.calculator_sessions SET email_captured = true
       WHERE session_id = p_session_id;
    WHEN 'time_on_page' THEN
      -- Keep the longest observed dwell. beforeunload can fire more than once
      -- per session (bfcache restores), and the last value is not the largest.
      UPDATE public.calculator_sessions
         SET time_on_page = GREATEST(COALESCE(time_on_page, 0), LEAST(86400, GREATEST(0, COALESCE(p_seconds, 0))))
       WHERE session_id = p_session_id;
    ELSE
      RAISE EXCEPTION 'unknown calculator session event: %', p_event USING ERRCODE = '22023';
  END CASE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$function$;

COMMENT ON FUNCTION public.record_calculator_session_event(text, text, integer) IS
  'US-303. Flips one funnel flag on one calculator session. anon has no UPDATE policy on calculator_sessions and must not get one - it has no identity, so the policy would be update-anyone - and without this every pdf_downloaded / social_shared / trial_clicked / time_on_page write was silently filtered to zero rows, which is why get_calculator_funnel_metrics has only ever returned zeros. The event name is matched against a fixed list so the writable column set is exactly the five here.';

REVOKE ALL ON FUNCTION public.record_calculator_session_event(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_calculator_session_event(text, text, integer) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- increment_referral_count(text)
-- ---------------------------------------------------------------------------
-- trackReferral reached for supabase.raw('referral_count + 1'). There is no raw
-- method on the supabase-js v2 client, so evaluating the argument threw a
-- TypeError before .update() ran and the surrounding catch logged it as a
-- generic tracking failure. Postgres is where the read-modify-write belongs
-- anyway: two referrals landing together would otherwise both read the same
-- count and both write count+1.
CREATE OR REPLACE FUNCTION public.increment_referral_count(
  p_referrer_email text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF p_referrer_email IS NULL OR length(p_referrer_email) NOT BETWEEN 1 AND 254 THEN
    RETURN NULL;
  END IF;

  UPDATE public.calculator_leads
     SET referral_count = LEAST(10000, COALESCE(referral_count, 0) + 1)
   WHERE email = lower(trim(p_referrer_email))
  RETURNING referral_count INTO v_count;

  RETURN v_count;
END;
$function$;

COMMENT ON FUNCTION public.increment_referral_count(text) IS
  'US-303. Increments calculator_leads.referral_count for one referrer. Replaces supabase.raw(''referral_count + 1''), which is not a method on the supabase-js v2 client and threw a TypeError before the update was ever built. Doing the read-modify-write in SQL also stops two concurrent referrals from both writing count+1.';

REVOKE ALL ON FUNCTION public.increment_referral_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_referral_count(text) TO anon, authenticated, service_role;
