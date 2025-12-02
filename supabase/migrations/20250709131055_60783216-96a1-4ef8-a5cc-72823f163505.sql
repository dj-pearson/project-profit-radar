-- Fix the SELECT policy to allow users to view companies they just created
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;

-- Allow users to view their own company OR companies they created
CREATE POLICY "Users can view own company" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (
  -- Can view if it's their company (after profile is updated)
  id IN (
    SELECT company_id 
    FROM user_profiles 
    WHERE id = auth.uid() AND company_id IS NOT NULL
  )
  -- OR if there's no user profile with this company_id yet (newly created)
  OR NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE company_id = companies.id
  )
);