-- Complete Authentication Diagnosis Script
-- Run this in Supabase SQL Editor

-- 1. Check if you're authenticated at all
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() as current_jwt_exists,
  current_user as postgres_user;

-- 2. Check auth.users table directly
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check user_profiles table structure and data
SELECT 
  id,
  email,
  role,
  company_id,
  created_at
FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check if there's a mismatch between auth.users and user_profiles
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  up.id as profile_user_id,
  up.email as profile_email,
  up.role as profile_role
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC
LIMIT 5;

-- 5. Check RLS is enabled on user_profiles
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'blog_posts');

-- 6. Check user_profiles RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 7. Test if we can access user_profiles without RLS (as superuser)
-- This will only work if you run it as postgres superuser
-- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY; 