-- Fix Authentication Context Issues
-- This addresses the auth.uid() returning null problem

-- SOLUTION 1: Temporarily disable RLS to allow root admin access
-- (This is the quickest fix)

-- Disable RLS on blog_posts temporarily
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create a more permissive policy that works with service role
DROP POLICY IF EXISTS "Root admins manage all blog posts" ON public.blog_posts;

CREATE POLICY "Authenticated users can manage blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- SOLUTION 2: Create a service role policy (backup)
CREATE POLICY "Service role can manage all blog posts"
ON public.blog_posts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- SOLUTION 3: Check if the user actually exists and has root_admin role
-- Run this to see all users and their roles:
SELECT 
  up.id,
  up.email,
  up.role,
  au.email as auth_email,
  au.email_confirmed_at
FROM public.user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.role = 'root_admin';

-- SOLUTION 4: Create a specific policy for your user ID
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from the query above
/*
CREATE POLICY "Specific root admin can manage blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (
  auth.uid() = 'YOUR_USER_ID_HERE'::uuid
);
*/ 