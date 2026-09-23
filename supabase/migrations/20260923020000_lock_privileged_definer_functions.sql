-- Privileged SECURITY DEFINER functions were callable by any signed-in user (US-353).
--
-- None of these had a REVOKE, and Postgres grants EXECUTE to PUBLIC by
-- default, so PostgREST exposed each of them at /rest/v1/rpc/<name>:
--
--   revoke_all_user_sessions(p_user_id ...)   signs anyone out
--   grant_permission_to_user(p_user_id ...)   grants anyone any permission
--   log_audit_event(p_company_id, p_user_id ...)  writes audit rows for any
--                                             company, as any user
--
-- The first two have no caller in src/, the iOS app or any edge function, so
-- they are revoked from anon and authenticated outright (every overload,
-- whatever the live signatures are). service_role keeps EXECUTE.
--
-- log_audit_event IS called from the browser (src/hooks/useAuditLog.ts,
-- src/services/auditService.ts), and CLAUDE.md requires the audit trail, so it
-- cannot be revoked. It keeps its signature and return type and now checks its
-- arguments against the caller: p_user_id must be the caller, and p_company_id
-- the caller's company unless the caller is root_admin. Both browser callers
-- already pass exactly those values, so nothing legitimate changes. A NULL
-- p_user_id is filled in with the caller rather than refused.
--
-- The one internal caller, the log_consent_withdrawal trigger, records the
-- consent row's user, who need not be the person making the change. It now
-- writes through write_audit_log_internal, which does no caller check and is
-- not executable by anon or authenticated.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('revoke_all_user_sessions', 'grant_permission_to_user')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    RAISE NOTICE 'US-353: revoked % from anon and authenticated', fn;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.write_audit_log_internal(
  p_company_id uuid, p_user_id uuid, p_action_type text, p_resource_type text,
  p_resource_id text DEFAULT NULL::text, p_resource_name text DEFAULT NULL::text,
  p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb,
  p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text,
  p_session_id text DEFAULT NULL::text, p_risk_level text DEFAULT 'low'::text,
  p_compliance_category text DEFAULT 'general'::text, p_description text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    company_id, user_id, action_type, resource_type, resource_id, resource_name,
    old_values, new_values, ip_address, user_agent, session_id, risk_level,
    compliance_category, description, metadata
  ) VALUES (
    p_company_id, p_user_id, p_action_type, p_resource_type, p_resource_id, p_resource_name,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_session_id, p_risk_level,
    p_compliance_category, p_description, p_metadata
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.write_audit_log_internal(uuid, uuid, text, text, text, text, jsonb, jsonb, inet, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log_internal(uuid, uuid, text, text, text, text, jsonb, jsonb, inet, text, text, text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_company_id uuid, p_user_id uuid, p_action_type text, p_resource_type text,
  p_resource_id text DEFAULT NULL::text, p_resource_name text DEFAULT NULL::text,
  p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb,
  p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text,
  p_session_id text DEFAULT NULL::text, p_risk_level text DEFAULT 'low'::text,
  p_compliance_category text DEFAULT 'general'::text, p_description text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_user uuid := p_user_id;
BEGIN
  -- auth.uid() is NULL for the service role and for SQL run by the owner;
  -- those are trusted callers and keep the old behaviour.
  IF v_caller IS NOT NULL THEN
    IF v_user IS NULL THEN
      v_user := v_caller;
    ELSIF v_user <> v_caller THEN
      RAISE EXCEPTION 'log_audit_event: p_user_id must be the caller'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_company_id IS DISTINCT FROM public.get_user_company(v_caller)
       AND public.get_user_role(v_caller)::text IS DISTINCT FROM 'root_admin' THEN
      RAISE EXCEPTION 'log_audit_event: p_company_id must be the caller''s company'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN public.write_audit_log_internal(
    p_company_id, v_user, p_action_type, p_resource_type, p_resource_id, p_resource_name,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_session_id, p_risk_level,
    p_compliance_category, p_description, p_metadata
  );
END;
$function$;

-- Signed-in users keep calling it; anonymous callers never had a reason to.
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, uuid, text, text, text, text, jsonb, jsonb, inet, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, uuid, text, text, text, text, jsonb, jsonb, inet, text, text, text, text, text, jsonb) TO authenticated, service_role;

-- Same body as 20250801021602, writing through the internal function.
CREATE OR REPLACE FUNCTION public.log_consent_withdrawal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Log withdrawal in audit trail when consent is withdrawn
  IF NEW.consent_given = false AND OLD.consent_given = true THEN
    NEW.withdrawal_date := now();

    -- Log audit event for compliance
    PERFORM public.write_audit_log_internal(
      NEW.company_id,
      COALESCE(NEW.user_id, auth.uid()),
      'update',
      'consent',
      NEW.id::text,
      NEW.consent_type || ' consent withdrawn',
      to_jsonb(OLD),
      to_jsonb(NEW),
      null, -- ip_address
      null, -- user_agent
      null, -- session_id
      'medium',
      'data_protection',
      'User withdrew consent for ' || NEW.purpose,
      jsonb_build_object('consent_type', NEW.consent_type, 'purpose', NEW.purpose)
    );
  END IF;

  RETURN NEW;
END;
$function$;
