-- Fix RLS policies for seo_meta_tags table to allow root admin access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Root admin can manage SEO meta tags" ON public.seo_meta_tags;
DROP POLICY IF EXISTS "Public can read SEO meta tags" ON public.seo_meta_tags;

-- Enable RLS on seo_meta_tags table
ALTER TABLE public.seo_meta_tags ENABLE ROW LEVEL SECURITY;

-- Allow root admins to manage all SEO meta tags
CREATE POLICY "Root admin can manage SEO meta tags" ON public.seo_meta_tags
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'root_admin'
  )
);

-- Allow public read access for meta tags (needed for SEO functionality)
CREATE POLICY "Public can read SEO meta tags" ON public.seo_meta_tags
FOR SELECT
TO public
USING (true);

-- Fix RLS policies for seo_configurations table
DROP POLICY IF EXISTS "Root admin can manage SEO configurations" ON public.seo_configurations;
DROP POLICY IF EXISTS "Public can read SEO configurations" ON public.seo_configurations;

-- Enable RLS on seo_configurations table  
ALTER TABLE public.seo_configurations ENABLE ROW LEVEL SECURITY;

-- Allow root admins to manage SEO configurations
CREATE POLICY "Root admin can manage SEO configurations" ON public.seo_configurations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'root_admin'
  )
);

-- Allow public read access for configurations (needed for sitemap generation)
CREATE POLICY "Public can read SEO configurations" ON public.seo_configurations
FOR SELECT
TO public
USING (true);