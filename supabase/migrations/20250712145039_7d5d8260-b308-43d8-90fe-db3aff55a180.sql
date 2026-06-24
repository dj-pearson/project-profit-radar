-- Enable RLS on blog_posts table if not already enabled
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Published blog posts are publicly readable" ON public.blog_posts;

-- Create a policy that allows anyone to read published blog posts
CREATE POLICY "Published blog posts are publicly readable"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

-- Ensure the anon role can access the table
GRANT SELECT ON public.blog_posts TO anon;