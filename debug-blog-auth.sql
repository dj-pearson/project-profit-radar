-- Debug script for blog_posts authentication issues
-- Run this in your Supabase SQL Editor

-- 1. Check current user and role
SELECT 
  auth.uid() as current_user_id,
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) as current_role,
  (SELECT email FROM public.user_profiles WHERE id = auth.uid()) as current_email;

-- 2. Check if get_user_role function works
SELECT public.get_user_role(auth.uid()) as get_user_role_result;

-- 3. List all current RLS policies on blog_posts
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'blog_posts';

-- 4. Check table permissions
SELECT table_name, privilege_type, grantee 
FROM information_schema.table_privileges 
WHERE table_name = 'blog_posts';

-- 5. Test if user can see any blog posts
SELECT COUNT(*) as visible_posts FROM public.blog_posts;

-- 6. Try to manually test the RLS condition
SELECT 
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'root_admin'
  ) as can_manage_posts;

-- 7. Check if user_profiles table is accessible
SELECT * FROM public.user_profiles WHERE id = auth.uid() LIMIT 1; 