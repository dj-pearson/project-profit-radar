-- Rate limiting: a table the shared limiter can actually count against.
--
-- _shared/rate-limiter.ts counted rows in rate_limit_violations but only wrote a
-- row once the limit was already exceeded, so the count never left zero and no
-- endpoint was ever limited. Its insert did not match that table's schema
-- either (missing NOT NULL columns, and it wrote a text identifier into an INET
-- column), so the logging path would have thrown had it ever run.
--
-- This adds a purpose-built attempt log plus an RPC that counts and records in
-- one round trip. rate_limit_violations keeps its existing meaning: a record of
-- limits that were breached, written by the DDoS-protection path.

CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id BIGSERIAL PRIMARY KEY,
  -- Opaque caller key. IP address for anonymous traffic, or a SHA-256 hash for
  -- anything derived from user input (email, user id) so no PII lands here.
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_lookup
  ON public.rate_limit_attempts (endpoint, identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_created_at
  ON public.rate_limit_attempts (created_at);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- No policies by design: only service_role (which bypasses RLS) and the
-- SECURITY DEFINER function below may touch this table. A client that could
-- read it could enumerate which identifiers are close to being locked out.

COMMENT ON TABLE public.rate_limit_attempts IS
  'One row per rate-limited request attempt. Written and pruned by consume_rate_limit().';

-- Count the attempts inside the window and, when under the limit, record this
-- one. Returns the shape _shared/rate-limiter.ts expects.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_start TIMESTAMPTZ := now() - make_interval(mins => p_window_minutes);
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
  v_retry_after INTEGER;
BEGIN
  IF p_identifier IS NULL OR p_identifier = '' OR p_endpoint IS NULL OR p_endpoint = '' THEN
    RAISE EXCEPTION 'consume_rate_limit requires a non-empty identifier and endpoint';
  END IF;
  IF p_max_requests < 1 OR p_window_minutes < 1 THEN
    RAISE EXCEPTION 'consume_rate_limit requires max_requests >= 1 and window_minutes >= 1';
  END IF;

  -- Drop this identifier's expired attempts so the table stays bounded even if
  -- the scheduled sweep is not running.
  DELETE FROM public.rate_limit_attempts
   WHERE endpoint = p_endpoint
     AND identifier = p_identifier
     AND created_at < v_window_start;

  SELECT count(*), min(created_at)
    INTO v_count, v_oldest
    FROM public.rate_limit_attempts
   WHERE endpoint = p_endpoint
     AND identifier = p_identifier
     AND created_at >= v_window_start;

  IF v_count >= p_max_requests THEN
    -- The window frees up when the oldest attempt in it ages out.
    v_retry_after := GREATEST(
      1,
      ceil(extract(epoch FROM (v_oldest + make_interval(mins => p_window_minutes)) - now()))::INTEGER
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'request_count', v_count,
      'retry_after', v_retry_after,
      'limit', p_max_requests
    );
  END IF;

  INSERT INTO public.rate_limit_attempts (identifier, endpoint)
  VALUES (p_identifier, p_endpoint);

  RETURN jsonb_build_object(
    'allowed', true,
    'request_count', v_count + 1,
    'retry_after', 0,
    'limit', p_max_requests
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- Backstop sweep for identifiers that stop sending traffic mid-window.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rate_limit_attempts WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limit_attempts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_rate_limit_attempts() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_rate_limit_attempts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_attempts() TO service_role;
