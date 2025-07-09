-- Fix RLS policies for companies table to allow proper company creation

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Root admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Root admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Allow company creation" ON public.companies;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Admins can update own company" ON public.companies;

-- Create a simple policy that allows any authenticated user to create a company
CREATE POLICY "Allow company creation" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view their own company (after they have one)
CREATE POLICY "Users can view own company" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (
  id IN (
    SELECT company_id 
    FROM user_profiles 
    WHERE id = auth.uid() AND company_id IS NOT NULL
  )
);

-- Allow admins to update their own company
CREATE POLICY "Admins can update own company" 
ON public.companies 
FOR UPDATE 
TO authenticated 
USING (
  id IN (
    SELECT company_id 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND company_id IS NOT NULL
    AND role IN ('admin', 'root_admin')
  )
)
WITH CHECK (
  id IN (
    SELECT company_id 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND company_id IS NOT NULL
    AND role IN ('admin', 'root_admin')
  )
);

-- Root admins can do everything
CREATE POLICY "Root admins full access" 
ON public.companies 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);