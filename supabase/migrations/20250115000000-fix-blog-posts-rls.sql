-- Fix blog_posts RLS policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Root admins can manage all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Published blog posts are publicly readable" ON public.blog_posts;

-- Create new, more specific policies
-- Allow anyone to read published blog posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

-- Allow authenticated root admins to do everything
CREATE POLICY "Root admins can manage all blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'root_admin'
  )
);

-- Allow authenticated root admins to insert posts
CREATE POLICY "Root admins can insert blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'root_admin'
  )
);

-- Ensure the table has proper grants
GRANT SELECT ON public.blog_posts TO anon;
GRANT ALL ON public.blog_posts TO authenticated;

-- Verify the get_user_role function exists and works
CREATE OR REPLACE FUNCTION public.get_user_role_v2(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role::TEXT FROM public.user_profiles WHERE id = user_id),
    'none'
  );
$$;

-- Alternative policy using the new function (backup)
CREATE POLICY "Root admins can manage all blog posts v2"
ON public.blog_posts
FOR ALL
TO authenticated
USING (public.get_user_role_v2(auth.uid()) = 'root_admin');

-- Disable the v2 policy for now (enable if main policy fails)
ALTER POLICY "Root admins can manage all blog posts v2" ON public.blog_posts DISABLE; 