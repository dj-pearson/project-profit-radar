-- Drop the open companies INSERT policy (US-352).
--
-- 20251204140000 let any authenticated user insert a companies row with any
-- active site_id. 20260903010000 moved company creation into
-- create_company_for_current_user(), SECURITY DEFINER, which derives the
-- owner from auth.uid(), and scheduled this policy to go one release later so
-- that browsers still running the older bundle kept working. That release has
-- shipped.
--
-- Checked before dropping: nothing in src/, supabase/functions/ or Brikly-iOS
-- inserts into companies directly; OnboardingWizard calls the RPC, and its
-- test (src/components/onboarding/__tests__/OnboardingWizard.test.tsx) pins
-- that. The RPC runs as its owner, so no INSERT policy is needed for it.

DROP POLICY IF EXISTS "Allow company creation for authenticated users" ON public.companies;
