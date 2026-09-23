-- US-298: the last permissive policies on user_presence, seo_meta_tags,
-- ai_environment_config, trades and the seven pseo_* tables.
--
-- Builds each table with the columns the policies and assertions touch,
-- applies the policies the migrations left in place (copied verbatim, source
-- cited), proves each hole is real, applies the fix, and proves the hole is
-- closed while legitimate same-company / admin access is unchanged.

-- 20250803232624:65-74 (live shape), policies :204-211 and 20250919164232:57-66
CREATE TABLE public.user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offline'
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view company user presence"
ON public.user_presence FOR SELECT
USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Users can manage their own presence"
ON public.user_presence FOR ALL
USING (user_id = auth.uid());
CREATE POLICY "Users can view all presence data"
ON public.user_presence
FOR SELECT
USING (true);
CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR ALL
USING (auth.uid() = user_id);

-- 20250703152911:24-44 (+ site_id, nullable here: its live shape is unknown and
-- the fix must not depend on it), policies 20250916173437:23-26, 20250925013428:6-10
CREATE TABLE public.seo_meta_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL UNIQUE,
  title text,
  site_id uuid
);
ALTER TABLE public.seo_meta_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read SEO meta tags" ON public.seo_meta_tags
FOR SELECT
TO public
USING (true);
CREATE POLICY "System can manage SEO meta tags"
ON public.seo_meta_tags
FOR ALL
USING (true)
WITH CHECK (true);

-- 20260204000000:204-214, fallback policy :305-308
CREATE TABLE public.ai_environment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  coolify_variable text
);
ALTER TABLE public.ai_environment_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for ai_environment_config"
ON ai_environment_config
FOR ALL
USING (true);

-- 20250115000005:4-15, :362, :372-373
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access trades" ON trades
    FOR ALL USING (true);

-- 20260313000000:148-217
CREATE TABLE public.pseo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text, is_published boolean DEFAULT false, view_count int DEFAULT 0
);
CREATE TABLE public.pseo_generation_queue (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text);
CREATE TABLE public.pseo_contractor_types (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, is_active boolean DEFAULT true);
CREATE TABLE public.pseo_pain_points (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, is_active boolean DEFAULT true);
CREATE TABLE public.pseo_geographies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, is_active boolean DEFAULT true);
CREATE TABLE public.pseo_business_sizes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, is_active boolean DEFAULT true);
CREATE TABLE public.pseo_competitors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, is_active boolean DEFAULT true);
ALTER TABLE pseo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_contractor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_geographies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_business_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published pseo pages"
  ON pseo_pages FOR SELECT
  TO anon
  USING (is_published = true);
CREATE POLICY "Authenticated users can read pseo pages"
  ON pseo_pages FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can manage pseo pages"
  ON pseo_pages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Service role full access pseo_pages"
  ON pseo_pages FOR ALL
  TO service_role
  USING (true);
CREATE POLICY "Authenticated users can manage queue"
  ON pseo_generation_queue FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Service role full access queue"
  ON pseo_generation_queue FOR ALL
  TO service_role
  USING (true);
CREATE POLICY "Public can read contractor types"
  ON pseo_contractor_types FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated manage contractor types"
  ON pseo_contractor_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can read pain points"
  ON pseo_pain_points FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated manage pain points"
  ON pseo_pain_points FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can read geographies"
  ON pseo_geographies FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated manage geographies"
  ON pseo_geographies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can read business sizes"
  ON pseo_business_sizes FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated manage business sizes"
  ON pseo_business_sizes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can read competitors"
  ON pseo_competitors FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated manage competitors"
  ON pseo_competitors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- People: A admin, A field_supervisor, B admin, platform root_admin (no company).
INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000f5'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'), ('ffffffff-0000-0000-0000-0000000000ff');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A Build'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B Build');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  ('ffffffff-0000-0000-0000-0000000000ff', NULL, 'root_admin');

INSERT INTO public.user_presence (user_id, company_id, status) VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'online'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'online');
INSERT INTO public.seo_meta_tags (page_path, title) VALUES ('/', 'Brikly');
INSERT INTO public.ai_environment_config (config_key, coolify_variable) VALUES ('CLAUDE_API_KEY', 'CLAUDE_API_KEY');
INSERT INTO public.trades (name) VALUES ('Electrical');
INSERT INTO public.pseo_pages (title, is_published) VALUES ('Roofing software', true);
INSERT INTO public.pseo_generation_queue (status) VALUES ('pending');
INSERT INTO public.pseo_contractor_types (name) VALUES ('roofer');
INSERT INTO public.pseo_pain_points (name) VALUES ('cash flow');
INSERT INTO public.pseo_geographies (name) VALUES ('Austin');
INSERT INTO public.pseo_business_sizes (name) VALUES ('small');
INSERT INTO public.pseo_competitors (name) VALUES ('Procore');

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

-- Rows an UPDATE touched, or -1 if RLS raised.
CREATE FUNCTION pg_temp.touched(sql text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN -1;
END $$;

-- ---------------------------------------------------------------- before
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert((SELECT count(*) FROM user_presence WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 1,
  'before: a company A field_supervisor reads company B presence');
SELECT test_assert(pg_temp.touched($$UPDATE seo_meta_tags SET title = 'pwned'$$) = 1,
  'before: a field_supervisor rewrites seo_meta_tags');
SELECT test_assert(pg_temp.touched($$UPDATE ai_environment_config SET coolify_variable = 'EVIL'$$) = 1,
  'before: a field_supervisor remaps ai_environment_config');
SELECT test_assert(pg_temp.touched($$UPDATE trades SET name = 'x'$$) = 1,
  'before: a field_supervisor rewrites trades');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_pages SET title = 'pwned'$$) = 1,
  'before: a field_supervisor rewrites a published pseo page');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_competitors SET name = 'x'$$) = 1,
  'before: a field_supervisor rewrites pseo_competitors');
ROLLBACK;

BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(pg_temp.touched($$UPDATE seo_meta_tags SET title = 'pwned'$$) = 1,
  'before: anon rewrites seo_meta_tags');
SELECT test_assert(pg_temp.touched($$UPDATE trades SET name = 'x'$$) = 1,
  'before: anon rewrites trades');
ROLLBACK;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert(NOT pg_temp.denied($$INSERT INTO user_presence (user_id, company_id) VALUES ('aaaaaaaa-0000-0000-0000-0000000000f5', 'bbbbbbbb-0000-0000-0000-000000000000')$$),
  'before: a user plants their presence in company B');
ROLLBACK;

\i supabase/migrations/20260923170000_settle_remaining_permissive_rls.sql

-- ---------------------------------------------------------------- after: user_presence
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert((SELECT count(*) FROM user_presence WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 0,
  'A field_supervisor reads zero company B presence rows');
SELECT test_assert((SELECT count(*) FROM user_presence) = 1,
  'A field_supervisor still reads company A presence');
SELECT test_assert(pg_temp.denied($$INSERT INTO user_presence (user_id, company_id) VALUES ('aaaaaaaa-0000-0000-0000-0000000000f5', 'bbbbbbbb-0000-0000-0000-000000000000')$$),
  'a user cannot plant their presence in company B');
ROLLBACK;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
INSERT INTO user_presence (user_id, company_id, status)
  VALUES ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'online')
  ON CONFLICT (user_id) DO UPDATE SET status = 'away', company_id = EXCLUDED.company_id;
SELECT test_assert((SELECT count(*) FROM user_presence) = 2, 'a user still inserts their own presence in their company');
INSERT INTO user_presence (user_id, company_id, status)
  VALUES ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'busy')
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, company_id = EXCLUDED.company_id;
SELECT test_assert((SELECT status FROM user_presence WHERE user_id = auth.uid()) = 'busy', 'the client upsert still updates own presence');
SELECT test_assert(pg_temp.denied($$UPDATE user_presence SET company_id = 'bbbbbbbb-0000-0000-0000-000000000000' WHERE user_id = auth.uid()$$),
  'a user cannot move their presence row into company B');
SELECT test_assert(pg_temp.touched($$UPDATE user_presence SET status = 'x' WHERE user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'$$) = 0,
  'a user still cannot update a colleague''s presence');
ROLLBACK;

-- ---------------------------------------------------------------- after: non-admin, anon
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert(pg_temp.touched($$UPDATE seo_meta_tags SET title = 'pwned'$$) = 0, 'field_supervisor cannot update seo_meta_tags');
SELECT test_assert(pg_temp.touched($$DELETE FROM seo_meta_tags$$) = 0, 'field_supervisor cannot delete seo_meta_tags');
SELECT test_assert(pg_temp.denied($$INSERT INTO seo_meta_tags (page_path, title) VALUES ('/x', 'x')$$), 'field_supervisor cannot insert seo_meta_tags');
SELECT test_assert((SELECT count(*) FROM seo_meta_tags) = 1, 'field_supervisor still reads seo_meta_tags');
SELECT test_assert((SELECT count(*) FROM ai_environment_config) = 0, 'field_supervisor reads no ai_environment_config');
SELECT test_assert(pg_temp.touched($$UPDATE ai_environment_config SET coolify_variable = 'EVIL'$$) = 0, 'field_supervisor cannot update ai_environment_config');
SELECT test_assert(pg_temp.touched($$UPDATE trades SET name = 'x'$$) = 0, 'field_supervisor cannot update trades');
SELECT test_assert(pg_temp.denied($$INSERT INTO trades (name) VALUES ('x')$$), 'field_supervisor cannot insert trades');
SELECT test_assert((SELECT count(*) FROM trades) = 1, 'field_supervisor still reads trades');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_pages SET title = 'pwned'$$) = 0, 'field_supervisor cannot update pseo_pages');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_pages SET view_count = view_count + 1$$) = 0,
  'field_supervisor view_count bump is now a silent no-op (documented)');
SELECT test_assert(pg_temp.touched($$DELETE FROM pseo_generation_queue$$) = 0, 'field_supervisor cannot delete the pseo queue');
SELECT test_assert(pg_temp.denied($$INSERT INTO pseo_generation_queue (status) VALUES ('x')$$), 'field_supervisor cannot insert into the pseo queue');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_contractor_types SET name = 'x'$$) = 0, 'field_supervisor cannot update pseo_contractor_types');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_pain_points SET name = 'x'$$) = 0, 'field_supervisor cannot update pseo_pain_points');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_geographies SET name = 'x'$$) = 0, 'field_supervisor cannot update pseo_geographies');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_business_sizes SET name = 'x'$$) = 0, 'field_supervisor cannot update pseo_business_sizes');
SELECT test_assert(pg_temp.touched($$DELETE FROM pseo_competitors$$) = 0, 'field_supervisor cannot delete pseo_competitors');
SELECT test_assert(pg_temp.denied($$INSERT INTO pseo_competitors (name) VALUES ('x')$$), 'field_supervisor cannot insert pseo_competitors');
SELECT test_assert((SELECT count(*) FROM pseo_pages) + (SELECT count(*) FROM pseo_generation_queue)
  + (SELECT count(*) FROM pseo_competitors) = 3, 'field_supervisor reads pseo tables as before');
ROLLBACK;

BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(pg_temp.touched($$UPDATE seo_meta_tags SET title = 'pwned'$$) = 0, 'anon cannot update seo_meta_tags');
SELECT test_assert(pg_temp.denied($$INSERT INTO seo_meta_tags (page_path) VALUES ('/x')$$), 'anon cannot insert seo_meta_tags');
SELECT test_assert(pg_temp.touched($$UPDATE trades SET name = 'x'$$) = 0, 'anon cannot update trades');
SELECT test_assert((SELECT count(*) FROM seo_meta_tags) = 1, 'anon still reads seo_meta_tags');
SELECT test_assert((SELECT count(*) FROM trades) = 1, 'anon still reads trades');
SELECT test_assert((SELECT count(*) FROM pseo_pages) = 1, 'anon still reads published pseo pages');
SELECT test_assert((SELECT count(*) FROM pseo_geographies) = 1, 'anon still reads active pseo_geographies');
SELECT test_assert((SELECT count(*) FROM user_presence) = 0, 'anon reads no presence');
ROLLBACK;

-- ---------------------------------------------------------------- after: admins keep access
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(pg_temp.touched($$UPDATE seo_meta_tags SET title = 'Brikly home'$$) = 1, 'company admin still edits seo_meta_tags (matches /admin/seo-management)');
INSERT INTO seo_meta_tags (page_path, title) VALUES ('/pricing', 'Pricing');
SELECT test_assert((SELECT site_id FROM seo_meta_tags WHERE page_path = '/pricing') IS NULL, 'an admin insert with NULL site_id still succeeds');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_pages SET is_published = false$$) = 1, 'company admin still unpublishes pseo pages (matches /admin/pseo)');
INSERT INTO pseo_generation_queue (status) VALUES ('pending');
INSERT INTO pseo_contractor_types (name) VALUES ('plumber') ON CONFLICT (id) DO NOTHING;
SELECT test_assert(pg_temp.touched($$DELETE FROM pseo_generation_queue WHERE status = 'pending'$$) = 2, 'company admin still manages the pseo queue');
SELECT test_assert((SELECT count(*) FROM ai_environment_config) = 0, 'company admin reads no ai_environment_config');
ROLLBACK;

BEGIN;
SELECT test_act_as('ffffffff-0000-0000-0000-0000000000ff');
SELECT test_assert(pg_temp.touched($$UPDATE ai_environment_config SET coolify_variable = 'CLAUDE_KEY_2'$$) = 1, 'root_admin still manages ai_environment_config');
INSERT INTO ai_environment_config (config_key) VALUES ('NEW_KEY');
SELECT test_assert((SELECT count(*) FROM ai_environment_config) = 2, 'root_admin reads ai_environment_config');
SELECT test_assert(pg_temp.touched($$UPDATE seo_meta_tags SET title = 'x'$$) = 1, 'root_admin still edits seo_meta_tags');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_competitors SET name = 'Buildertrend'$$) = 1, 'root_admin still edits pseo_competitors');
SELECT test_assert(pg_temp.touched($$UPDATE trades SET name = 'x'$$) = 0, 'trades writes are service_role only, root_admin included');
ROLLBACK;

-- service_role unaffected.
BEGIN;
SET LOCAL ROLE service_role;
SELECT test_assert(pg_temp.touched($$UPDATE trades SET name = 'Electrical work'$$) = 1, 'service_role writes trades');
SELECT test_assert(pg_temp.touched($$UPDATE seo_meta_tags SET title = 'x'$$) = 1, 'service_role writes seo_meta_tags');
SELECT test_assert(pg_temp.touched($$UPDATE pseo_pages SET view_count = 1$$) = 1, 'service_role writes pseo_pages');
ROLLBACK;
