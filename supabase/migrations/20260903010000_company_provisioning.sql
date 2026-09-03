-- A new signup never gets a company (US-317).
--
-- handle_new_user() inserts a user_profiles row with no company_id. A user
-- without one is sent to /setup, which renders OnboardingWizard. Its
-- handleComplete ran:
--
--   supabase.from('companies').update({...}).eq('id', userProfile?.company_id)
--
-- which for a brand-new signup is .eq('id', undefined): PostgREST matches zero
-- rows and returns no error, so the wizard reported success and the user landed
-- on a dashboard with no tenant. Every company_id-scoped query then returns
-- nothing, and no trial ever starts. The only companies INSERT in src/ lived in
-- OnboardingFlow.tsx, which nothing imported.
--
-- The update was doubly broken: it also wrote company_type,
-- onboarding_completed and onboarding_completed_at, three columns the live
-- companies table does not have, and then wrote onboarding_completed to
-- user_profiles, which does not have it either. So even a user who somehow
-- had a company_id would have seen the wizard fail at the last step.
--
-- This migration adds the server-side provisioning step the client should have
-- been calling, plus the cost codes a new tenant needs on day one.
--
-- WHY AN RPC RATHER THAN A CLIENT INSERT: creating a tenant is two writes that
-- must happen together (the company row, and the caller's profile pointing at
-- it). Split across two client round-trips, a failure between them leaves an
-- orphan company nobody can reach and a user still stranded on /setup. A
-- SECURITY DEFINER function does both in one transaction and derives the owner
-- from auth.uid(), so the caller cannot attach themselves to someone else's
-- company or create one for another user.
--
-- WHAT THIS DOES NOT DO: it does not tighten the existing
-- "Allow company creation for authenticated users" INSERT policy on companies
-- (20251204140000), which lets any authenticated user insert a company with any
-- active site_id. Dropping it is the right end state - nothing needs a direct
-- client INSERT once this function exists - but CLAUDE.md forbids tightening a
-- policy in the same release that removes its callers, because a browser still
-- running the previous bundle would start failing. It goes in the release after
-- this one; the comment on the policy below records that.

-- ---------------------------------------------------------------------------
-- 1. Default cost codes for a new company
-- ---------------------------------------------------------------------------
-- Chart of accounts is already seeded for every new company by
-- trg_auto_create_coa (20250707000001). Cost codes were not: the only seed in
-- the repo is a hardcoded company_id INSERT in the demo-data migration
-- (20250703222216), so every real company started with an empty list. That
-- matters because cost_code_id is NOT NULL on project_budgets, so a company
-- with no cost codes cannot have a budget at all (US-318).

CREATE OR REPLACE FUNCTION public.seed_default_cost_codes(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Defensive: a self-hosted project that has not applied the cost_codes
  -- migration should not have company creation fail on this.
  IF to_regclass('public.cost_codes') IS NULL THEN
    RAISE WARNING 'seed_default_cost_codes: public.cost_codes does not exist, skipping';
    RETURN 0;
  END IF;

  -- ON CONFLICT targets the UNIQUE (company_id, code) from 20250702225057, so
  -- re-running this for a company that already has codes is a no-op and a
  -- company that has customised a code keeps its own version.
  INSERT INTO public.cost_codes (company_id, code, name, description, category, is_active)
  VALUES
    (p_company_id, '01-100', 'General Requirements', 'Supervision, permits, temporary facilities', 'General', true),
    (p_company_id, '01-900', 'Project Overhead', 'Dumpsters, portable toilets, site cleanup', 'General', true),
    (p_company_id, '02-100', 'Demolition', 'Demolition, clearing and removal', 'Site Work', true),
    (p_company_id, '03-100', 'Concrete', 'Footings, foundations, slabs and flatwork', 'Concrete', true),
    (p_company_id, '04-100', 'Masonry', 'Block, brick and stone', 'Masonry', true),
    (p_company_id, '05-100', 'Metals', 'Structural steel, joists and railings', 'Metals', true),
    (p_company_id, '06-100', 'Rough Carpentry', 'Framing, sheathing and blocking', 'Carpentry', true),
    (p_company_id, '06-200', 'Finish Carpentry', 'Trim, interior doors, cabinets and millwork', 'Carpentry', true),
    (p_company_id, '07-100', 'Roofing', 'Roof covering, flashing and gutters', 'Thermal and Moisture', true),
    (p_company_id, '07-200', 'Insulation', 'Thermal and acoustic insulation', 'Thermal and Moisture', true),
    (p_company_id, '08-100', 'Doors and Windows', 'Exterior doors, windows and hardware', 'Openings', true),
    (p_company_id, '09-200', 'Drywall', 'Hanging, taping and texture', 'Finishes', true),
    (p_company_id, '09-300', 'Flooring and Tile', 'Tile, hardwood, carpet and resilient flooring', 'Finishes', true),
    (p_company_id, '09-900', 'Painting', 'Interior and exterior painting', 'Finishes', true),
    (p_company_id, '10-100', 'Specialties', 'Bath accessories, shelving and signage', 'Specialties', true),
    (p_company_id, '11-100', 'Appliances and Equipment', 'Owner and contractor supplied equipment', 'Equipment', true),
    (p_company_id, '22-100', 'Plumbing', 'Rough-in, fixtures and water heater', 'Plumbing', true),
    (p_company_id, '23-100', 'HVAC', 'Equipment, ductwork and controls', 'HVAC', true),
    (p_company_id, '26-100', 'Electrical', 'Rough-in, devices, fixtures and panel', 'Electrical', true),
    (p_company_id, '31-100', 'Earthwork', 'Excavation, backfill and grading', 'Site Work', true),
    (p_company_id, '32-100', 'Exterior Improvements', 'Driveways, landscaping and fencing', 'Site Work', true),
    (p_company_id, '99-100', 'Contingency', 'Allowance for unforeseen conditions', 'General', true)
  ON CONFLICT (company_id, code) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.seed_default_cost_codes(uuid) IS
  'Seeds a CSI-division default cost code list for a company. Idempotent via UNIQUE (company_id, code). US-317.';

-- Trigger, so a company created by any path gets the list: the provisioning
-- function below, an admin creating a tenant, a seed, or a support script.
CREATE OR REPLACE FUNCTION public.trg_seed_company_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.seed_default_cost_codes(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Seeding is a convenience. A company that exists without its default cost
    -- codes is recoverable (call seed_default_cost_codes again); a signup that
    -- fails because of a seed is not.
    RAISE WARNING 'trg_seed_company_defaults: cost code seed failed for company %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_company_defaults ON public.companies;
CREATE TRIGGER trg_seed_company_defaults
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_company_defaults();

-- ---------------------------------------------------------------------------
-- 2. Tenant provisioning for the signed-in user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_company_for_current_user(
  p_name text,
  p_industry_type text DEFAULT NULL,
  p_company_size text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_name        text := nullif(btrim(p_name), '');
  v_industry    text := nullif(btrim(p_industry_type), '');
  v_size        text := nullif(btrim(p_company_size), '');
  v_profile     record;
  v_site_id     uuid;
  v_company_id  uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Company name is required' USING ERRCODE = '22023';
  END IF;

  SELECT company_id, site_id INTO v_profile
  FROM public.user_profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile exists for the current user' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent by design. The wizard can be submitted twice (a double click, a
  -- retry after a network error, a reload of a page whose local step counter
  -- survived in localStorage) and the second call must not mint a second
  -- tenant and move the user into it, stranding everything they created in the
  -- first one. Returning the existing id lets the caller carry on.
  IF v_profile.company_id IS NOT NULL THEN
    RETURN v_profile.company_id;
  END IF;

  v_site_id := v_profile.site_id;

  IF v_site_id IS NULL THEN
    SELECT id INTO v_site_id FROM public.sites
    WHERE key = 'brikly' AND is_active = true
    LIMIT 1;
  END IF;

  IF v_site_id IS NULL THEN
    SELECT id INTO v_site_id FROM public.sites
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'No active site is configured, so a company cannot be created'
      USING ERRCODE = 'P0002';
  END IF;

  -- Dynamic SQL for one narrow reason: two migrations disagree about the column
  -- types here. 20260209100000 declares industry_type and subscription_tier as
  -- TEXT; the generated types (and the enum definitions this database carries)
  -- say they are the industry_type and subscription_tier enums. A quoted
  -- literal of unknown type assigns correctly to either, while a plpgsql text
  -- variable needs an explicit cast that is wrong in one of the two shapes.
  -- format(%L) quotes the values, so a company name is data, never SQL.
  -- The invalid-enum guard below keeps a bad p_industry_type from erroring.
  IF v_industry IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'industry_type' AND typtype = 'e')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'industry_type' AND e.enumlabel = v_industry
     )
  THEN
    v_industry := NULL;
  END IF;

  EXECUTE format(
    'INSERT INTO public.companies
       (name, site_id, industry_type, company_size,
        subscription_tier, subscription_status, trial_end_date)
     VALUES (%L, %L::uuid, %L, %L, %L, %L, now() + interval ''14 days'')
     RETURNING id',
    v_name, v_site_id, v_industry, v_size, 'starter', 'trial'
  ) INTO v_company_id;

  UPDATE public.user_profiles
     SET company_id = v_company_id,
         updated_at = now()
   WHERE id = v_user_id
     AND company_id IS NULL;

  IF NOT FOUND THEN
    -- Another concurrent call won the race and set company_id. Fail loudly
    -- rather than leave the caller pointing at a different company than the
    -- one this statement created.
    RAISE EXCEPTION 'Company assignment raced with another request; retry'
      USING ERRCODE = '40001';
  END IF;

  RETURN v_company_id;
END;
$$;

COMMENT ON FUNCTION public.create_company_for_current_user(text, text, text) IS
  'Creates a company for the signed-in user and points their profile at it, in one transaction. Idempotent: returns the existing company_id if the caller already has one. US-317.';

REVOKE ALL ON FUNCTION public.create_company_for_current_user(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_for_current_user(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.seed_default_cost_codes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_default_cost_codes(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. projects.site_id, so the wizard's optional first project can be created
-- ---------------------------------------------------------------------------
-- 20251128000002 added site_id to projects and set it NOT NULL, with no default.
-- No project writer supplies it: not projectService.createProject, not
-- CreateProject.tsx, not the projects edge function, not the onboarding wizard.
-- Any environment whose projects table matches that migration therefore rejects
-- every project insert the app makes.
--
-- Filling it from the project's own company is the only correct value anyway -
-- a project belongs to the site its company belongs to - and doing it in a
-- BEFORE INSERT trigger is additive: a caller that sends site_id keeps the value
-- it sent, so no existing client changes behaviour.
--
-- This fixes projects only, deliberately. The same shape exists across the ~34
-- tables the site_id migrations touched; settling that is US-275, and doing it
-- table by table here would be the same thrash that story exists to stop.

CREATE OR REPLACE FUNCTION public.set_project_site_id_from_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.site_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT c.site_id INTO NEW.site_id
    FROM public.companies c
    WHERE c.id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_project_site_id_from_company() IS
  'Fills projects.site_id from the project company when the caller omits it. No writer in the app supplies it and the column is NOT NULL. US-317.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'site_id'
  ) THEN
    DROP TRIGGER IF EXISTS trg_project_site_id ON public.projects;
    CREATE TRIGGER trg_project_site_id
      BEFORE INSERT ON public.projects
      FOR EACH ROW
      EXECUTE FUNCTION public.set_project_site_id_from_company();
  END IF;
END $$;

-- Record the follow-up on the policy itself so the next release has it in hand.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'companies'
      AND policyname = 'Allow company creation for authenticated users'
  ) THEN
    EXECUTE $c$
      COMMENT ON POLICY "Allow company creation for authenticated users" ON public.companies IS
        'Legacy: allowed the onboarding wizard to INSERT a company directly. Superseded by create_company_for_current_user() (US-317). Drop one release after that ships, once no client bundle in the wild inserts companies directly.'
    $c$;
  END IF;
END $$;
