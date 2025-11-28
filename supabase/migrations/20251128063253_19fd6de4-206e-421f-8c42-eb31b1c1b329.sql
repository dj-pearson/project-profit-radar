-- Fix infinite recursion in tenant_users RLS policies
-- The current policies query tenant_users to check permissions on tenant_users, creating a loop

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view tenant users" ON public.tenant_users;
DROP POLICY IF EXISTS "Tenant admins can manage users" ON public.tenant_users;

-- Create a security definer function to check tenant membership without RLS recursion
CREATE OR REPLACE FUNCTION public.check_tenant_membership(
  p_tenant_id UUID,
  p_user_id UUID,
  p_required_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a member of the tenant with optional role check
  RETURN EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND is_active = true
      AND (p_required_roles IS NULL OR role = ANY(p_required_roles))
  );
END;
$$;

-- Create new non-recursive policies using the security definer function
CREATE POLICY "Users can view their tenant users"
ON public.tenant_users
FOR SELECT
USING (
  check_tenant_membership(tenant_id, auth.uid())
);

CREATE POLICY "Tenant admins can manage tenant users"
ON public.tenant_users
FOR ALL
USING (
  check_tenant_membership(tenant_id, auth.uid(), ARRAY['owner', 'admin'])
);