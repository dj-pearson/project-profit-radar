-- APNs device tokens for the native iOS app.
--
-- push_subscriptions holds browser Web Push subscriptions (endpoint + keys);
-- an APNs token is a different thing sent to a different service, so it gets
-- its own table rather than a second shape in that JSONB column.
--
-- Written by the app for its own user (RLS: own rows only). Read by the
-- deliver-apns edge function with the service role. A token that APNs reports
-- as dead is deleted there.

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios')),
  -- Which APNs host the token belongs to: Xcode debug builds get sandbox
  -- tokens, TestFlight and App Store builds get production ones.
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON public.device_push_tokens(user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users read their own device tokens"
  ON public.device_push_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users register their own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users register their own device tokens"
  ON public.device_push_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- A phone handed to a new person keeps its token; the new sign-in claims it.
-- The UPDATE is limited to rows the caller already owns or that carry the
-- token they're registering, and the result must be theirs.
DROP POLICY IF EXISTS "Users update their own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users update their own device tokens"
  ON public.device_push_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users remove their own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users remove their own device tokens"
  ON public.device_push_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;

-- Claiming a token another account registered on the same phone: RLS can't
-- let a user UPDATE someone else's row, so this does it, and only moves the
-- row to the caller.
CREATE OR REPLACE FUNCTION public.register_device_push_token(
  p_token text,
  p_environment text,
  p_app_version text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF p_token IS NULL OR length(p_token) < 32 OR p_token !~ '^[0-9a-f]+$' THEN
    RAISE EXCEPTION 'Not an APNs device token' USING ERRCODE = '22023';
  END IF;
  IF p_environment NOT IN ('sandbox', 'production') THEN
    RAISE EXCEPTION 'Unknown APNs environment' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.device_push_tokens (user_id, token, environment, app_version)
  VALUES (auth.uid(), p_token, p_environment, p_app_version)
  ON CONFLICT (token) DO UPDATE
    SET user_id = auth.uid(),
        environment = EXCLUDED.environment,
        app_version = EXCLUDED.app_version,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.register_device_push_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_device_push_token(text, text, text) TO authenticated;
