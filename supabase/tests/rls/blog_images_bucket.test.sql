-- US-354: only root_admin/admin can write the public blog-images bucket.

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text, name text, owner uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;

-- 20250722031926_c3554aed-7bb8-46fc-8da2-8593dbce6833.sql
CREATE POLICY "Anyone can view blog images" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Root admins can upload blog images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Root admins can update blog images" ON storage.objects FOR UPDATE USING (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Root admins can delete blog images" ON storage.objects FOR DELETE USING (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL);

INSERT INTO auth.users VALUES ('aaaaaaaa-0000-0000-0000-0000000000f5'), ('cccccccc-0000-0000-0000-0000000000cc');
INSERT INTO public.companies VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'A');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('cccccccc-0000-0000-0000-0000000000cc', NULL, 'root_admin');
INSERT INTO storage.objects (bucket_id, name) VALUES ('blog-images', 'hero.jpg');

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
WITH u AS (UPDATE storage.objects SET name = 'hero.jpg' WHERE bucket_id = 'blog-images' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 1, 'before: any signed-in user can overwrite a blog image');
ROLLBACK;

\i supabase/migrations/20260923070000_restrict_blog_images_writes.sql

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert(pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name) VALUES ('blog-images', 'mine.jpg')$$), 'a non-admin cannot upload to blog-images');
WITH u AS (UPDATE storage.objects SET name = 'x.jpg' WHERE bucket_id = 'blog-images' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 0, 'a non-admin cannot overwrite a blog image');
WITH d AS (DELETE FROM storage.objects WHERE bucket_id = 'blog-images' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 0, 'a non-admin cannot delete a blog image');
SELECT test_assert((SELECT count(*) FROM storage.objects WHERE bucket_id = 'blog-images') = 1, 'everyone can still read blog images');
ROLLBACK;

BEGIN;
SELECT test_act_as('cccccccc-0000-0000-0000-0000000000cc');
INSERT INTO storage.objects (bucket_id, name) VALUES ('blog-images', 'new-post.jpg');
SELECT test_assert(true, 'root_admin uploads to blog-images');
ROLLBACK;
