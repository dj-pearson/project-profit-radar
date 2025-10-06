-- ============================================
-- CRITICAL SECURITY FIX: Role-Based Access Control
-- ============================================
-- This migration fixes the client-side role checking vulnerability
-- by creating a separate user_roles table with proper RLS

-- 1. Create role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'root_admin',
    'admin',
    'superintendent',
    'project_manager',
    'estimator',
    'accounting',
    'safety_officer',
    'quality_inspector',
    'foreman',
    'field_supervisor',
    'technician',
    'equipment_operator',
    'journeyman',
    'office_staff',
    'apprentice',
    'laborer',
    'client_portal'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create user_roles table for secure role storage
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.user_role NOT NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to get user's primary role (highest privilege)
CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'root_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'superintendent' THEN 3
      WHEN 'project_manager' THEN 4
      WHEN 'estimator' THEN 5
      WHEN 'accounting' THEN 5
      WHEN 'safety_officer' THEN 6
      WHEN 'quality_inspector' THEN 6
      WHEN 'foreman' THEN 7
      WHEN 'field_supervisor' THEN 7
      WHEN 'technician' THEN 8
      WHEN 'equipment_operator' THEN 8
      WHEN 'journeyman' THEN 8
      WHEN 'office_staff' THEN 8
      WHEN 'apprentice' THEN 9
      WHEN 'laborer' THEN 10
      WHEN 'client_portal' THEN 11
      ELSE 99
    END
  LIMIT 1
$$;

-- 5. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all company user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'root_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'root_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'root_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Only root admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'root_admin'));

-- 6. Migrate existing roles from user_profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, role::public.user_role, created_at
FROM public.user_profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- FIX: Infinite Recursion in Chat Channel RLS
-- ============================================

-- Drop existing problematic policies on chat_channel_members
DROP POLICY IF EXISTS "Users can view channel members for channels they're in" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Channel admins can manage members" ON public.chat_channel_members;

-- Create security definer function to check channel membership
CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_channel_members
    WHERE channel_id = _channel_id
      AND user_id = _user_id
  )
$$;

-- Create security definer function to check if user is channel admin
CREATE OR REPLACE FUNCTION public.is_channel_admin(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_channel_members
    WHERE channel_id = _channel_id
      AND user_id = _user_id
      AND role = 'admin'
  ) OR EXISTS (
    SELECT 1
    FROM public.chat_channels
    WHERE id = _channel_id
      AND created_by = _user_id
  )
$$;

-- Recreate policies without recursion
CREATE POLICY "Users can view channel members they have access to"
  ON public.chat_channel_members FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid()) AND
    public.is_channel_member(channel_id, auth.uid())
  );

CREATE POLICY "Channel admins can manage channel members"
  ON public.chat_channel_members FOR ALL
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid()) AND
    public.is_channel_admin(channel_id, auth.uid())
  );

-- ============================================
-- FIX: User Profiles PII Protection
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view their own company profiles" ON public.user_profiles;

-- Create more restrictive policies with field-level considerations
CREATE POLICY "Users can view basic info of company members"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid()) AND
    -- Users can only see limited fields of others
    (
      id = auth.uid() OR -- Full access to own profile
      public.has_role(auth.uid(), 'root_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'project_manager')
    )
  );

-- ============================================
-- FIX: Contractor Tax ID Protection
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view company contractors" ON public.contractors;

-- Create restrictive policy for contractor access
CREATE POLICY "Only accounting and admins can view contractors"
  ON public.contractors FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid()) AND
    (
      public.has_role(auth.uid(), 'root_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'accounting')
    )
  );

-- Update management policies to use has_role
DROP POLICY IF EXISTS "Admins can manage contractors" ON public.contractors;

CREATE POLICY "Only accounting and admins can manage contractors"
  ON public.contractors FOR ALL
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid()) AND
    (
      public.has_role(auth.uid(), 'root_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'accounting')
    )
  );

-- ============================================
-- AUDIT: Log all security-related changes
-- ============================================

-- Create trigger to log role assignments
CREATE OR REPLACE FUNCTION public.log_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    description,
    metadata
  ) VALUES (
    NEW.assigned_by,
    TG_OP,
    'user_role',
    NEW.id::text,
    'Role ' || NEW.role || ' assigned to user',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'role', NEW.role,
      'assigned_by', NEW.assigned_by
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_role_assignments
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_assignment();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Grant necessary permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;