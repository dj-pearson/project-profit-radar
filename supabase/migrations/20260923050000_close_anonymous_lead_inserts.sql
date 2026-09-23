-- Public lead tables stop accepting direct PostgREST inserts (US-351).
--
-- 20250202000000 gave leads, demo_requests and sales_contact_requests an
-- INSERT policy "TO anon, authenticated WITH CHECK (true)", and
-- 20250710000000 gave calculator_leads "TO anon WITH CHECK (true)". The public
-- forms go through capture-lead, handle-demo-request and handle-sales-contact,
-- which validate and rate-limit - but a bot could POST to /rest/v1/leads with
-- the publishable key and skip all of that. On leads the same policy also let
-- any signed-in user insert a lead into ANY company.
--
-- Who still writes, and how:
--   - the three edge functions use the service role, which RLS does not stop;
--   - calculator leads arrive through capture_calculator_lead(), SECURITY
--     DEFINER, not a direct insert (src/lib/calculatorAnalytics.ts);
--   - signed-in CRM screens insert leads for their own company
--     (QuickLeadCapture, useCRM, CRMLeads). "Staff can manage company leads"
--     covers admin, PM, office_staff and root_admin; the open policy also let
--     every other role add a lead to their own company, so a company-scoped
--     INSERT for authenticated replaces it and nobody loses same-company access.

DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
    DROP POLICY IF EXISTS "Company members can create leads" ON public.leads;
    CREATE POLICY "Company members can create leads" ON public.leads
      FOR INSERT TO authenticated
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF to_regclass('public.demo_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can create demo requests" ON public.demo_requests;
  END IF;

  IF to_regclass('public.sales_contact_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can create sales contacts" ON public.sales_contact_requests;
  END IF;

  IF to_regclass('public.calculator_leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow public to insert leads" ON public.calculator_leads;
  END IF;
END $$;
