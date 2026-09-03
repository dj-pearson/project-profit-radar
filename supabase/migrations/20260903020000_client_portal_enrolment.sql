-- The client portal is unreachable, and nothing lets a client see a project
-- (US-319).
--
-- Neither src/pages/ClientPortal.tsx nor src/pages/ClientPortalEnhanced.tsx is
-- imported by any route file, so the whole customer-facing half of the product
-- ships as dead code. Routing it is a frontend change; this migration is the
-- half that has to exist first, because a client_portal user who reached the
-- page today would see nothing at all:
--
--   * The page found a client's projects with .eq('client_email', user.email).
--     A string match is not an authorisation model - it silently grants access
--     to any project whose client_email happens to equal your address, in any
--     company, and it grants nothing at all if the address was typed
--     differently. Enrolment is what should decide, and client_portal_access
--     already exists to record it (20250727050851).
--   * client_portal_access had exactly one policy: staff manage rows in their
--     own company. The client the row is about could not read it.
--   * projects, change_orders, invoices, documents, tasks and daily_reports
--     have no policy admitting a client at all, so every tab was empty.
--
-- Three access models had grown up in parallel: this table, a client_portal
-- role on user_profiles, and a client_portal_users table that NO migration
-- creates and the generated types do not know (referenced only by
-- src/pages/admin/ClientPortalPro.tsx - see US-311). This migration settles it:
-- client_portal_access is the enrolment record, the client_portal role is what
-- the app checks to route someone to the portal, and client_portal_users is
-- designated dead.
--
-- WHY A HELPER FUNCTION rather than repeating the subquery: it is referenced by
-- eight policies, and a SECURITY DEFINER function reads client_portal_access
-- without recursing through that table's own RLS. Getting this wrong in either
-- direction is expensive - too loose leaks another customer's job, too tight
-- shows the customer a blank page and no way to tell why.

-- ---------------------------------------------------------------------------
-- 1. Link an enrolment to the auth user, not only to an email string
-- ---------------------------------------------------------------------------
-- Additive and nullable: rows created before this migration keep working
-- through the email branch of the predicate below, and the invite flow fills
-- it from here on.
ALTER TABLE public.client_portal_access
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- The indexes for these two lookups are in 20260903040000, on its own,
-- because CREATE INDEX CONCURRENTLY cannot run inside a transaction block and
-- a migration runner wraps each file in one.

COMMENT ON TABLE public.client_portal_access IS
  'Canonical client portal enrolment: which client may see which project. client_portal_users is not created by any migration and is superseded by this table (US-319).';

-- ---------------------------------------------------------------------------
-- 2. The predicate every client-facing policy uses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.client_has_project_access(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_portal_access a
    WHERE a.project_id = p_project_id
      AND a.is_active = true
      AND (a.expires_at IS NULL OR a.expires_at > now())
      AND (
        a.user_id = auth.uid()
        -- Email fallback for rows enrolled before user_id existed. Lowercased
        -- because addresses are entered by hand by whoever set up the invite.
        OR lower(a.client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

COMMENT ON FUNCTION public.client_has_project_access(uuid) IS
  'True when the calling user has an active, unexpired client_portal_access row for the project. The single predicate behind every client-facing read policy (US-319).';

REVOKE ALL ON FUNCTION public.client_has_project_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_has_project_access(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Read policies for an enrolled client
-- ---------------------------------------------------------------------------
-- Every one of these is a NEW permissive policy. Permissive policies OR
-- together, so no existing access is narrowed and nothing an internal user can
-- read today changes - which is what CLAUDE.md requires of a single release.

-- A client can see their own enrolment rows. Without this the portal cannot
-- even list which projects to offer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_portal_access' AND policyname = 'Clients can read their own portal access'
  ) THEN
    CREATE POLICY "Clients can read their own portal access"
      ON public.client_portal_access FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      );
  END IF;
END $$;

DO $$
DECLARE
  t text;
  policy_name text;
BEGIN
  -- The tables the portal actually reads. Each gets SELECT for an enrolled
  -- client and nothing else: the portal is a read surface apart from the two
  -- explicit actions below.
  FOREACH t IN ARRAY ARRAY[
    'projects', 'change_orders', 'invoices', 'documents', 'tasks', 'daily_reports'
  ]
  LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;

    policy_name := 'Enrolled clients can read ' || t;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = policy_name
    );

    IF t = 'projects' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
           USING (public.client_has_project_access(id))',
        policy_name, t);
    ELSE
      -- Every other table carries project_id. Skip any that does not rather
      -- than fail the migration on a schema that differs.
      CONTINUE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'project_id'
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
           USING (project_id IS NOT NULL AND public.client_has_project_access(project_id))',
        policy_name, t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. The one thing a client writes: responding to a change order
-- ---------------------------------------------------------------------------
-- ClientChangeOrderApproval updates change_orders directly, which no policy
-- permits, so approving from the portal has never done anything. A blanket
-- client UPDATE policy would be the wrong fix: RLS gates rows, not columns, so
-- it would also let a client edit the amount they are approving.
--
-- The component was doubly broken. It writes client_approved_at and
-- client_rejection_reason; the live table has client_approved_DATE and has no
-- rejection-reason column at all. So even with a policy the write would have
-- been rejected for unknown columns. The column is added below (nullable, which
-- CLAUDE.md lists as always safe) and the function uses the real names.

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS client_rejection_reason TEXT;
--
-- A SECURITY DEFINER function writes exactly the four columns a client decision
-- touches and nothing else. It is also the mechanism US-323 needs for "the
-- client side of approval can only be written by the client_portal path" - a
-- project manager's own role cannot reach this function's effect any other way.
CREATE OR REPLACE FUNCTION public.client_respond_to_change_order(
  p_change_order_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_reason text := nullif(btrim(p_rejection_reason), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT project_id INTO v_project_id
  FROM public.change_orders
  WHERE id = p_change_order_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Change order not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.client_has_project_access(v_project_id) THEN
    RAISE EXCEPTION 'You do not have access to this project' USING ERRCODE = '42501';
  END IF;

  IF NOT p_approved AND v_reason IS NULL THEN
    RAISE EXCEPTION 'A reason is required to reject a change order' USING ERRCODE = '22023';
  END IF;

  UPDATE public.change_orders
     SET client_approved = p_approved,
         client_approved_date = now(),
         client_rejection_reason = CASE WHEN p_approved THEN NULL ELSE v_reason END,
         status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
         updated_at = now()
   WHERE id = p_change_order_id;
END;
$$;

COMMENT ON FUNCTION public.client_respond_to_change_order(uuid, boolean, text) IS
  'The client side of change order approval. Writes only the four decision columns, for a project the caller is enrolled on (US-319, US-323).';

REVOKE ALL ON FUNCTION public.client_respond_to_change_order(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_respond_to_change_order(uuid, boolean, text) TO authenticated;
