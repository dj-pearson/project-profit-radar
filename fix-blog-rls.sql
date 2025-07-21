-- Fix blog_posts RLS policies - Run this in Supabase SQL Editor
-- Step 1: Drop existing conflicting policies
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Root admins can manage all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Published blog posts are publicly readable" ON public.blog_posts;

-- Step 2: Create new working policies
-- Allow anyone to read published blog posts
CREATE POLICY "Published blog posts readable by all"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

-- Allow authenticated root admins to do everything
CREATE POLICY "Root admins manage all blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role::text = 'root_admin'
  )
);

-- Step 3: Ensure proper table grants
GRANT SELECT ON public.blog_posts TO anon;
GRANT ALL ON public.blog_posts TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 4: Verify the policy works
-- This should return true if you're logged in as root_admin
SELECT 
  auth.uid() as your_user_id,
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role::text = 'root_admin'
  ) as can_manage_blog_posts; 