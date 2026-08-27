-- A rate limiter that actually counts requests (US-307).
--
-- _shared/rate-limiter.ts decided `allowed` by counting rows in
-- rate_limit_violations, and wrote a row to that table only when the request
-- was NOT allowed. From an empty table the count is 0, so every request is
-- allowed, so no row is ever written, so the count stays 0. It cannot
-- bootstrap, and nothing else writes the table - dos-protection's three
-- references are all selects. Every limit in the system has always passed.
--
-- rate_limit_state has existed since 20250703165323 for exactly this purpose -
-- identifier, endpoint, request_count, window_start, is_blocked, blocked_until
-- - and has never been written by anything.
--
-- The decision has to be atomic. Doing select-then-update from the edge
-- function means two concurrent requests both read the same count and both
-- pass, which is the specific thing a rate limiter exists to prevent, and it
-- gets worse the harder someone pushes. pg_advisory_xact_lock serialises the
-- read-modify-write per identifier+endpoint for the duration of the call's
-- transaction. It needs no unique index, so no lock is taken on a pre-existing
-- table, and pre-existing duplicate rows (there are none - the table is empty)
-- cannot split a counter because the newest window is the one that is read.
--
-- The function also writes rate_limit_violations when it refuses, so that table
-- keeps holding what its name says and dos-protection's attack statistics keep
-- working. It is now purely a log: nothing reads it to make a decision, which
-- is precisely what was wrong before.
--
-- EXECUTE is granted to service_role only. A function any client could call
-- would let one caller burn another caller's quota by passing their IP.
-- checkRateLimit's callers pass a service-role client.

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS TABLE (allowed boolean, request_count integer, retry_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_count integer;
  v_window timestamptz;
  v_len interval;
BEGIN
  IF p_identifier IS NULL OR p_endpoint IS NULL THEN
    RAISE EXCEPTION 'consume_rate_limit requires an identifier and an endpoint';
  END IF;
  IF p_max_requests IS NULL OR p_max_requests < 1 THEN
    RAISE EXCEPTION 'consume_rate_limit requires a positive max_requests';
  END IF;
  IF p_window_minutes IS NULL OR p_window_minutes < 1 THEN
    RAISE EXCEPTION 'consume_rate_limit requires a positive window_minutes';
  END IF;

  v_len := make_interval(mins => p_window_minutes);

  -- Serialise per identifier+endpoint. Released when this call's transaction
  -- ends, which for a PostgREST RPC is the call itself.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_identifier || ':' || p_endpoint, 0));

  SELECT s.id, s.request_count, s.window_start
    INTO v_id, v_count, v_window
    FROM public.rate_limit_state s
   WHERE s.identifier = p_identifier
     AND s.endpoint = p_endpoint
   ORDER BY s.window_start DESC
   LIMIT 1;

  -- First request from this identifier, or the first since the window expired.
  IF v_id IS NULL THEN
    INSERT INTO public.rate_limit_state (
      identifier, identifier_type, endpoint, method,
      request_count, window_start, last_request
    ) VALUES (
      p_identifier, 'ip', p_endpoint, 'ALL',
      1, now(), now()
    );
    RETURN QUERY SELECT true, 1, 0;
    RETURN;
  END IF;

  IF v_window <= now() - v_len THEN
    UPDATE public.rate_limit_state
       SET request_count = 1,
           window_start = now(),
           last_request = now(),
           is_blocked = false,
           blocked_until = NULL,
           updated_at = now()
     WHERE id = v_id;
    RETURN QUERY SELECT true, 1, 0;
    RETURN;
  END IF;

  -- Count includes the request being decided, so the limit is the number
  -- allowed: at max_requests = 3, requests 1-3 pass and the 4th does not.
  v_count := COALESCE(v_count, 0) + 1;

  UPDATE public.rate_limit_state
     SET request_count = v_count,
         last_request = now(),
         is_blocked = (v_count > p_max_requests),
         blocked_until = CASE WHEN v_count > p_max_requests THEN v_window + v_len ELSE NULL END,
         updated_at = now()
   WHERE id = v_id;

  IF v_count > p_max_requests THEN
    -- Record the refusal. rate_limit_violations was previously the counter as
    -- well as the log, which is what broke it; now it is only the log, and it
    -- finally holds what its name says. dos-protection reads this table for
    -- attack statistics and would otherwise see an empty one.
    --
    -- Written against the table's real columns. The insert this replaces named
    -- limit_value and window_minutes, neither of which exists, and passed a
    -- bare identifier into ip_address, which is INET - so even on the branch it
    -- could never reach, it would have errored. identifier_type, method,
    -- limit_exceeded_by, time_window_seconds and action_taken are all NOT NULL
    -- and were all absent.
    INSERT INTO public.rate_limit_violations (
      identifier, identifier_type, ip_address, endpoint, method,
      requests_made, limit_exceeded_by, time_window_seconds,
      action_taken, created_at
    ) VALUES (
      p_identifier,
      CASE WHEN p_identifier ~ '^[0-9a-f]{8}-' THEN 'user' ELSE 'ip' END,
      -- Only cast when it really is an address; a user id is not one, and an
      -- invalid cast would abort the whole call and take the limiter with it.
      CASE WHEN p_identifier ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'
             OR p_identifier ~ ':' THEN p_identifier::inet
           ELSE NULL END,
      p_endpoint,
      'ALL',
      v_count,
      v_count - p_max_requests,
      p_window_minutes * 60,
      'blocked',
      now()
    );

    RETURN QUERY SELECT
      false,
      v_count,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_window + v_len - now())))::integer);
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_count, 0;
END;
$function$;

COMMENT ON FUNCTION public.consume_rate_limit(text, text, integer, integer) IS
  'US-307. Atomically increments the request counter in rate_limit_state and returns the decision. SECURITY DEFINER because rate_limit_state is service-role-only (US-306); EXECUTE is granted to service_role alone so one caller cannot burn another caller''s quota by passing their identifier. The advisory lock is what makes concurrent requests count correctly - remove it and two simultaneous callers both read the same value and both pass.';

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;
