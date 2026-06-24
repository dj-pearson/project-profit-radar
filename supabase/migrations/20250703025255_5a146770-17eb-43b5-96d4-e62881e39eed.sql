-- Add INSERT policy for companies table to allow users to create their own company
CREATE POLICY "Users can create companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);