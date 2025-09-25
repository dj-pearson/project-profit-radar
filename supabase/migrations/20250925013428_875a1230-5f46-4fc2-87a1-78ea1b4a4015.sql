-- Fix SEO meta tags RLS policies to allow proper backend integration
DROP POLICY IF EXISTS "Root admin can manage SEO meta tags" ON public.seo_meta_tags;
DROP POLICY IF EXISTS "Root admins can manage meta tags" ON public.seo_meta_tags;

-- Create new policy for system/edge function access
CREATE POLICY "System can manage SEO meta tags" 
ON public.seo_meta_tags 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policy for authenticated admin users
CREATE POLICY "Admins can manage SEO meta tags" 
ON public.seo_meta_tags 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('root_admin', 'admin')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('root_admin', 'admin')
  )
);

-- Fix function security issues by updating search_path for key functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public;

-- Create or replace missing functions with proper security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

-- Update any other functions that might need search_path
CREATE OR REPLACE FUNCTION public.calculate_project_profit(project_id uuid)
RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_revenue decimal := 0;
  total_costs decimal := 0;
BEGIN
  -- Calculate total revenue
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM invoices 
  WHERE invoices.project_id = calculate_project_profit.project_id 
  AND status = 'paid';
  
  -- Calculate total costs (labor + materials + equipment)
  SELECT COALESCE(SUM(
    COALESCE(labor_cost, 0) + 
    COALESCE(material_cost, 0) + 
    COALESCE(equipment_cost, 0)
  ), 0) INTO total_costs
  FROM project_tasks 
  WHERE project_tasks.project_id = calculate_project_profit.project_id;
  
  RETURN total_revenue - total_costs;
END;
$$;