-- Create a public storage bucket for site assets like icons and logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon']
);

-- Create storage policies for the site-assets bucket
CREATE POLICY "Public read access for site assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'site-assets');

CREATE POLICY "Admin upload access for site assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'site-assets' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('root_admin', 'admin')
  )
);

CREATE POLICY "Admin update access for site assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'site-assets' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('root_admin', 'admin')
  )
);

CREATE POLICY "Admin delete access for site assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'site-assets' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('root_admin', 'admin')
  )
);