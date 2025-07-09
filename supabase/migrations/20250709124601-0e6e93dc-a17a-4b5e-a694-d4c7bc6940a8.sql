-- Check current policies on companies table and fix the INSERT policy
-- The issue is likely that the current policy is too restrictive

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

-- Create a proper INSERT policy that allows any authenticated user to create a company
CREATE POLICY "Allow authenticated users to create companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Also ensure the user can update their own company after creation
-- (This policy might already exist, but let's make sure)
CREATE POLICY "Users can update their own company" 
ON public.companies 
FOR UPDATE 
TO authenticated 
USING (id IN (
  SELECT company_id 
  FROM user_profiles 
  WHERE id = auth.uid()
))
WITH CHECK (id IN (
  SELECT company_id 
  FROM user_profiles 
  WHERE id = auth.uid()
));