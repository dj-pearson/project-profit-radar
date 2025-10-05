-- Fix Additional Critical RLS Policy Issues (Corrected)
-- Addressing tables from second security scan

-- Fix: projects table  
-- Issue: Client info, budgets, locations exposed
-- Solution: Only company members can view projects
-- Note: This already has a policy, we're making it more explicit

DROP POLICY IF EXISTS "Users can view company projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they're assigned to" ON public.projects;
DROP POLICY IF EXISTS "Company members can view projects" ON public.projects;

-- Company members can view their company's projects
CREATE POLICY "Company members can view company projects"
ON public.projects
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Fix: expenses table
-- Issue: Vendor info, amounts, receipts exposed  
-- Solution: Users see own expenses, managers/accounting see all

DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view company expenses" ON public.expenses;
DROP POLICY IF EXISTS "Managers and accounting can view expenses" ON public.expenses;

-- Users can view their own expenses
CREATE POLICY "Users can view own expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Managers and accounting can view all company expenses
CREATE POLICY "Managers and accounting can view company expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid())
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role]
  )
);

-- Fix: safety_incidents table
-- Issue: Medical info and incident reports exposed
-- Solution: Only safety officers and management can view

DROP POLICY IF EXISTS "Safety staff can manage incidents" ON public.safety_incidents;
DROP POLICY IF EXISTS "Users can view company safety incidents" ON public.safety_incidents;
DROP POLICY IF EXISTS "Safety officers and management can view incidents" ON public.safety_incidents;

-- Only safety officers and management can view incidents
CREATE POLICY "Safety officers and management can view safety incidents"
ON public.safety_incidents
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid())
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'safety_officer'::user_role, 'superintendent'::user_role, 'project_manager'::user_role]
  )
);

-- Fix: estimates table
-- Issue: Pricing strategy and markups exposed
-- Solution: Only estimators, PMs, and admins can view

DROP POLICY IF EXISTS "Staff can manage estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can view company estimates" ON public.estimates;
DROP POLICY IF EXISTS "Estimators and management can view estimates" ON public.estimates;

-- Only authorized roles can view estimates
CREATE POLICY "Estimators and management can view company estimates"
ON public.estimates
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid())
  AND get_user_role(auth.uid()) = ANY (
    ARRAY['admin'::user_role, 'root_admin'::user_role, 'estimator'::user_role, 'project_manager'::user_role]
  )
);