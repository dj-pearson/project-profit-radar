-- =====================================================
-- SECURITY FIX: Add RLS policies to user_security and security_logs tables
-- Drop existing policies first, then recreate all properly
-- =====================================================

-- Enable RLS on tables (safe to re-run if already enabled)
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (using IF EXISTS for safety)
DROP POLICY IF EXISTS "Users manage own security settings" ON public.user_security;
DROP POLICY IF EXISTS "Root admins can view all security settings" ON public.user_security;
DROP POLICY IF EXISTS "Users can view own security logs" ON public.security_logs;
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_logs;
DROP POLICY IF EXISTS "Root admins can view all security logs" ON public.security_logs;

-- =====================================================
-- user_security RLS Policies
-- =====================================================

-- Users can view and manage their own security settings
CREATE POLICY "Users manage own security settings"
ON public.user_security
FOR ALL
USING (user_id = auth.uid());

-- Root admins can view all security settings for support purposes
CREATE POLICY "Root admins can view all security settings"
ON public.user_security
FOR SELECT
USING (public.has_role(auth.uid(), 'root_admin'));

-- =====================================================
-- security_logs RLS Policies
-- =====================================================

-- Users can only view their own security logs
CREATE POLICY "Users can view own security logs"
ON public.security_logs
FOR SELECT
USING (user_id = auth.uid());

-- System (service role) can insert security logs for any user
CREATE POLICY "System can insert security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (true);

-- Root admins can view all security logs for support and auditing
CREATE POLICY "Root admins can view all security logs"
ON public.security_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'root_admin'));