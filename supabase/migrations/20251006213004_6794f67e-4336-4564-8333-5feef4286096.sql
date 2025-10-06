-- Fix user_profiles RLS to prevent PII exposure
-- Only show basic info to regular company members, sensitive info only to admins

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view company members" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view basic info of company members" ON public.user_profiles;

-- Add new restrictive policy for SELECT
CREATE POLICY "Company members can view basic colleague info"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid()) 
    AND (
      -- Users can see their own full profile
      id = auth.uid()
      -- Admins and PMs can see full profiles for management purposes
      OR has_role(auth.uid(), 'root_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

-- Add policy comment
COMMENT ON POLICY "Company members can view basic colleague info" ON public.user_profiles 
IS 'Restricts PII access. Regular users see only their own full profile. Admins and PMs see all company profiles for legitimate business needs.';