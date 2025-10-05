-- Fix Medium-Priority RLS Policy Issues
-- These address financial data exposure and access control gaps

-- Fix #6: company_payment_settings table
-- Current issue: Payment processor credentials visible to all company admins
-- Fix: Only root_admin can view payment integration credentials

DROP POLICY IF EXISTS "Admins can manage their company payment settings" ON public.company_payment_settings;
DROP POLICY IF EXISTS "Companies can view their payment settings" ON public.company_payment_settings;

-- Only root_admin can view payment settings
CREATE POLICY "Root admins can view payment settings"
ON public.company_payment_settings
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- Only root_admin can manage payment settings
CREATE POLICY "Root admins can manage payment settings"
ON public.company_payment_settings
FOR ALL
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = 'root_admin'::user_role
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- Fix #7: invoices table
-- Current issue: Invoice amounts and payment status visible to all employees
-- Fix: Only accounting, project managers, and executives can view invoices

DROP POLICY IF EXISTS "Users can view company invoices" ON public.invoices;

-- Accounting, PM, and admins can view invoices
CREATE POLICY "Accounting and management can view invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role]
  )
);

-- Fix #8: insurance_policies table
-- Current issue: Policy numbers and coverage limits accessible to all users
-- Fix: Only management and accounting can view insurance policies

DROP POLICY IF EXISTS "Users can view company insurance policies" ON public.insurance_policies;

-- Management and accounting can view insurance policies
CREATE POLICY "Management and accounting can view insurance"
ON public.insurance_policies
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role]
  )
);

-- Fix #9: bonds table
-- Current issue: Bond amounts and surety info reveal financial capacity
-- Fix: Only executives and accounting can view bonds

DROP POLICY IF EXISTS "Users can view company bonds" ON public.bonds;

-- Executives and accounting can view bonds
CREATE POLICY "Executives and accounting can view bonds"
ON public.bonds
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role]
  )
);

-- Fix #10: subcontractor_payments table
-- Current issue: Payment amounts visible to all employees
-- Fix: Only accounting and project managers can view payments

DROP POLICY IF EXISTS "Users can view company subcontractor payments" ON public.subcontractor_payments;

-- Accounting and PM can view subcontractor payments
CREATE POLICY "Accounting and PM can view subcontractor payments"
ON public.subcontractor_payments
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role]
  )
);

-- Fix #11: client_portal_access table
-- Current issue: Access tokens visible to office staff
-- Fix: Only system administrators can view access tokens

DROP POLICY IF EXISTS "Staff can manage client portal access" ON public.client_portal_access;
DROP POLICY IF EXISTS "Users can view company client portal access" ON public.client_portal_access;

-- Only admins can view client portal access
CREATE POLICY "Admins can view client portal access"
ON public.client_portal_access
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role]
  )
);

-- Fix #12: email_subscribers table
-- Current issue: Marketing list accessible without access controls
-- Fix: Only marketing staff and admins can view subscribers

DROP POLICY IF EXISTS "Marketing staff can manage subscribers" ON public.email_subscribers;
DROP POLICY IF EXISTS "Users can view company subscribers" ON public.email_subscribers;

-- Marketing staff and admins can view subscribers
CREATE POLICY "Marketing and admins can view subscribers"
ON public.email_subscribers
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'office_staff'::user_role]
  )
);