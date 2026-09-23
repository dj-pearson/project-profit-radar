-- blog-images writes need an admin role, not just a session (US-354).
--
-- 20250722031926 named its policies "Root admins can upload/update/delete
-- blog images" but checked only auth.uid() IS NOT NULL. The bucket is public
-- read and serves the marketing blog, so any signed-in customer could replace
-- the hero image on a published post.
--
-- The replacement uses the same role check as site-assets (20250704045434):
-- root_admin or admin. That matches who can reach the only uploader,
-- BlogPostFormDialog on /blog-manager (SecureRoute allowedRoles root_admin,
-- admin). Whether a company admin should be able to touch the platform blog
-- at all is a product question; narrowing it to root_admin would also mean
-- narrowing that route.

DROP POLICY IF EXISTS "Root admins can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Root admins can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Root admins can delete blog images" ON storage.objects;

CREATE POLICY "Root admins can upload blog images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE id = auth.uid() AND role::text IN ('root_admin', 'admin')
  )
);

CREATE POLICY "Root admins can update blog images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'blog-images'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE id = auth.uid() AND role::text IN ('root_admin', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'blog-images'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE id = auth.uid() AND role::text IN ('root_admin', 'admin')
  )
);

CREATE POLICY "Root admins can delete blog images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'blog-images'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE id = auth.uid() AND role::text IN ('root_admin', 'admin')
  )
);
