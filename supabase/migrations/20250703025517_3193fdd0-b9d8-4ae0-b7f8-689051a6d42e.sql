-- Drop the previous INSERT policy and create a more specific one
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

-- Create a better INSERT policy for authenticated users creating their first company
CREATE POLICY "Authenticated users can create companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);