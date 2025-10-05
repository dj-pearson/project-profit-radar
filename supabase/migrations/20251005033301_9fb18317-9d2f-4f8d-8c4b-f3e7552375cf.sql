-- Fix Critical RLS Policy Issue #1: user_profiles table
-- Current issue: Email, phone, and personal data visible to all company users
-- Fix: Users can only view their own profile + admins can view all

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view company profiles" ON public.user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Admins can view all profiles in their company
CREATE POLICY "Admins can view company profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])
);

-- Fix Critical RLS Policy Issue #2: contractors table
-- Current issue: Tax IDs (SSN/EIN) and W-9 data accessible to all company users
-- Fix: Only accounting staff and admins can view sensitive contractor data

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view company contractors" ON public.contractors;

-- Only accounting and admin roles can view contractors
CREATE POLICY "Accounting and admins can view contractors"
ON public.contractors
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role])
);

-- Fix Critical RLS Policy Issue #3: contacts table
-- Current issue: Customer emails, phones, addresses visible to all company employees
-- Fix: Only sales, project managers, and admins can view contact data

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view company contacts" ON public.contacts;

-- Sales, PM, and admin roles can view contacts
CREATE POLICY "Sales and management can view contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role]
  )
);

-- Fix Critical RLS Policy Issue #4: leads table
-- Current issue: Sales pipeline data visible to all staff (competitor risk)
-- Fix: Only sales and management can view leads

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view company leads" ON public.leads;

-- Sales and management can view leads
CREATE POLICY "Sales and management can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role]
  )
);

-- Fix Critical RLS Policy Issue #5: forms_1099 table
-- Current issue: Tax forms with SSN/EIN visible company-wide
-- Fix: Only accounting and executives can view 1099 forms

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view company 1099 forms" ON public.forms_1099;

-- Only accounting and admins can view 1099 forms
CREATE POLICY "Accounting and executives can view 1099 forms"
ON public.forms_1099
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role]
  )
);