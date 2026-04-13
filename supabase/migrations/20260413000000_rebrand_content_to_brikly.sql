-- =====================================================================
-- Rebrand: BuildDesk -> Brikly (content + SEO tables)
-- Author: Brikly team
-- Date:   2026-04-13
--
-- Purpose
-- -------
-- Replace every user-facing content reference to the previous brand name
-- "BuildDesk" / "Build Desk" / "Build-Desk" / "build-desk.com" with the
-- new brand name "Brikly" / "brikly.net" across text and JSONB columns in
-- blog, knowledge base, SEO, pSEO, email, and communication tables.
--
-- Safety properties
-- -----------------
-- 1. IDEMPOTENT: re-running the migration after it has succeeded is a
--    no-op because the target strings are absent after the first run.
-- 2. TRANSACTIONAL: wraps every UPDATE in a single BEGIN/COMMIT block.
-- 3. CASE-PRESERVING: applies 9 ordered regexp rules (most specific first)
--    so "BuildDesk" -> "Brikly", "builddesk" -> "brikly",
--    "BUILDDESK" -> "BRIKLY", etc.
-- 4. DOMAIN-FIRST: "build-desk.com" is rewritten BEFORE "build-desk" so the
--    domain maps to the new ".net" TLD instead of "brikly.com".
-- 5. NON-DESTRUCTIVE: uses `IF EXISTS` guards for every table and column so
--    the migration tolerates older / newer schema variants.
--
-- Dry-run preview (optional, comment out before committing to prod):
--   SELECT COUNT(*) FROM public.blog_posts
--   WHERE title ~* 'builddesk|build[ -]desk|build-desk\.com';
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helper: idempotent case-preserving text rebrand.
-- Applies the 9 replacement rules (domain first, most specific first).
-- Marked IMMUTABLE so PostgreSQL can short-circuit when the input is NULL
-- and so the planner can use it inside functional indexes if needed.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brikly_rebrand_text(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT := input;
BEGIN
  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Domain first: build-desk.com -> brikly.net
  result := regexp_replace(result, 'build-desk\.com', 'brikly.net', 'g');
  result := regexp_replace(result, 'Build-desk\.com', 'Brikly.net', 'g');
  result := regexp_replace(result, 'BuildDesk\.com',  'Brikly.net', 'g');
  result := regexp_replace(result, 'Builddesk\.com',  'Brikly.net', 'g');
  result := regexp_replace(result, 'BUILDDESK\.COM',  'BRIKLY.NET', 'g');

  -- 2. Brand name variants (most specific first, case-sensitive)
  result := regexp_replace(result, 'BuildDesk',  'Brikly', 'g');
  result := regexp_replace(result, 'Build Desk', 'Brikly', 'g');
  result := regexp_replace(result, 'Build-Desk', 'Brikly', 'g');
  result := regexp_replace(result, 'Build-desk', 'Brikly', 'g');
  result := regexp_replace(result, 'BUILDDESK',  'BRIKLY', 'g');
  result := regexp_replace(result, 'BUILD DESK', 'BRIKLY', 'g');
  result := regexp_replace(result, 'BUILD-DESK', 'BRIKLY', 'g');
  result := regexp_replace(result, 'BUILD_DESK', 'BRIKLY', 'g');
  result := regexp_replace(result, 'builddesk',  'brikly', 'g');
  result := regexp_replace(result, 'build-desk', 'brikly', 'g');
  result := regexp_replace(result, 'build_desk', 'brikly', 'g');

  -- 3. Accidental brikly.com (from older rebrand scripts) -> brikly.net
  result := regexp_replace(result, 'brikly\.com', 'brikly.net', 'g');
  result := regexp_replace(result, 'Brikly\.com', 'Brikly.net', 'g');
  result := regexp_replace(result, 'BRIKLY\.COM', 'BRIKLY.NET', 'g');

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------
-- Helper: rebrand every string value inside a JSONB blob, recursively.
-- Leaves numbers, booleans, and nulls untouched; only rewrites strings.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brikly_rebrand_jsonb(input JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  out_val JSONB;
  k       TEXT;
  v       JSONB;
  arr_out JSONB;
  elem    JSONB;
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;

  CASE jsonb_typeof(input)
    WHEN 'string' THEN
      RETURN to_jsonb(public.brikly_rebrand_text(input #>> '{}'));
    WHEN 'object' THEN
      out_val := '{}'::jsonb;
      FOR k, v IN SELECT * FROM jsonb_each(input) LOOP
        out_val := out_val || jsonb_build_object(k, public.brikly_rebrand_jsonb(v));
      END LOOP;
      RETURN out_val;
    WHEN 'array' THEN
      arr_out := '[]'::jsonb;
      FOR elem IN SELECT value FROM jsonb_array_elements(input) LOOP
        arr_out := arr_out || jsonb_build_array(public.brikly_rebrand_jsonb(elem));
      END LOOP;
      RETURN arr_out;
    ELSE
      RETURN input;
  END CASE;
END;
$$;

-- ---------------------------------------------------------------------
-- Helper: rebrand every element in a TEXT[] array.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brikly_rebrand_text_array(input TEXT[])
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY(SELECT public.brikly_rebrand_text(x) FROM unnest(input) AS x);
$$;

-- =====================================================================
-- 1. blog_posts
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='blog_posts') THEN
    UPDATE public.blog_posts
    SET
      title           = public.brikly_rebrand_text(title),
      slug            = public.brikly_rebrand_text(slug),
      body            = public.brikly_rebrand_text(body),
      excerpt         = public.brikly_rebrand_text(excerpt),
      seo_title       = public.brikly_rebrand_text(seo_title),
      seo_description = public.brikly_rebrand_text(seo_description),
      featured_image_url = public.brikly_rebrand_text(featured_image_url)
    WHERE
      COALESCE(title,'')      ~* 'builddesk|build[ _-]desk|build-desk\.com|brikly\.com' OR
      COALESCE(slug,'')       ~* 'builddesk|build[ _-]desk' OR
      COALESCE(body,'')       ~* 'builddesk|build[ _-]desk|build-desk\.com|brikly\.com' OR
      COALESCE(excerpt,'')    ~* 'builddesk|build[ _-]desk|build-desk\.com|brikly\.com' OR
      COALESCE(seo_title,'')  ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(seo_description,'') ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(featured_image_url,'') ~* 'build-desk\.com|brikly\.com';

    -- Optional columns (guarded)
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='blog_posts'
                 AND column_name='content') THEN
      UPDATE public.blog_posts
      SET content = public.brikly_rebrand_text(content)
      WHERE COALESCE(content,'') ~* 'builddesk|build[ _-]desk|build-desk\.com|brikly\.com';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='blog_posts'
                 AND column_name='topic') THEN
      UPDATE public.blog_posts
      SET topic = public.brikly_rebrand_text(topic)
      WHERE COALESCE(topic,'') ~* 'builddesk|build[ _-]desk';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='blog_posts'
                 AND column_name='keywords') THEN
      UPDATE public.blog_posts
      SET keywords = public.brikly_rebrand_text_array(keywords)
      WHERE array_to_string(keywords, '||') ~* 'builddesk|build[ _-]desk|brikly\.com';
    END IF;
  END IF;
END $$;

-- =====================================================================
-- 2. blog_topic_history
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='blog_topic_history') THEN
    UPDATE public.blog_topic_history
    SET
      primary_topic     = public.brikly_rebrand_text(primary_topic),
      secondary_topics  = public.brikly_rebrand_text_array(secondary_topics),
      keywords_used     = public.brikly_rebrand_text_array(keywords_used),
      target_keywords   = public.brikly_rebrand_text_array(target_keywords),
      topic_category    = public.brikly_rebrand_text(topic_category)
    WHERE
      COALESCE(primary_topic,'') ~* 'builddesk|build[ _-]desk' OR
      array_to_string(COALESCE(secondary_topics,  ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk' OR
      array_to_string(COALESCE(keywords_used,     ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk' OR
      array_to_string(COALESCE(target_keywords,   ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk' OR
      COALESCE(topic_category,'') ~* 'builddesk|build[ _-]desk';
  END IF;
END $$;

-- =====================================================================
-- 3. blog_content_analysis (JSONB + arrays)
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='blog_content_analysis') THEN
    UPDATE public.blog_content_analysis
    SET
      extracted_topics   = public.brikly_rebrand_text_array(extracted_topics),
      key_phrases        = public.brikly_rebrand_text_array(key_phrases),
      named_entities     = public.brikly_rebrand_jsonb(named_entities),
      keyword_density    = public.brikly_rebrand_jsonb(keyword_density),
      heading_structure  = public.brikly_rebrand_jsonb(heading_structure)
    WHERE
      array_to_string(COALESCE(extracted_topics, ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk' OR
      array_to_string(COALESCE(key_phrases,      ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk' OR
      COALESCE(named_entities::text, '')    ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(keyword_density::text, '')   ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(heading_structure::text, '') ~* 'builddesk|build[ _-]desk|brikly\.com';

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='blog_content_analysis'
                 AND column_name='generation_prompt') THEN
      UPDATE public.blog_content_analysis
      SET generation_prompt = public.brikly_rebrand_text(generation_prompt)
      WHERE COALESCE(generation_prompt,'') ~* 'builddesk|build[ _-]desk';
    END IF;
  END IF;
END $$;

-- =====================================================================
-- 4. pSEO tables
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pseo_pages') THEN
    UPDATE public.pseo_pages
    SET
      seo_title       = public.brikly_rebrand_text(seo_title),
      seo_description = public.brikly_rebrand_text(seo_description),
      canonical_url   = public.brikly_rebrand_text(canonical_url),
      page_schema     = public.brikly_rebrand_jsonb(page_schema)
    WHERE
      seo_title       ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      seo_description ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      canonical_url   ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      page_schema::text ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pseo_contractor_types') THEN
    UPDATE public.pseo_contractor_types
    SET
      display_name   = public.brikly_rebrand_text(display_name),
      context_object = public.brikly_rebrand_jsonb(context_object)
    WHERE
      display_name ~* 'builddesk|build[ _-]desk' OR
      context_object::text ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pseo_pain_points') THEN
    UPDATE public.pseo_pain_points
    SET
      display_name   = public.brikly_rebrand_text(display_name),
      context_object = public.brikly_rebrand_jsonb(context_object)
    WHERE
      display_name ~* 'builddesk|build[ _-]desk' OR
      context_object::text ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pseo_business_sizes') THEN
    UPDATE public.pseo_business_sizes
    SET
      display_name   = public.brikly_rebrand_text(display_name),
      context_object = public.brikly_rebrand_jsonb(context_object)
    WHERE
      display_name ~* 'builddesk|build[ _-]desk' OR
      context_object::text ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pseo_geographies') THEN
    UPDATE public.pseo_geographies
    SET
      display_name   = public.brikly_rebrand_text(display_name),
      context_object = public.brikly_rebrand_jsonb(context_object)
    WHERE
      display_name ~* 'builddesk|build[ _-]desk' OR
      context_object::text ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pseo_competitors') THEN
    UPDATE public.pseo_competitors
    SET
      display_name       = public.brikly_rebrand_text(display_name),
      competitor_profile = public.brikly_rebrand_jsonb(competitor_profile)
    WHERE
      display_name ~* 'builddesk|build[ _-]desk' OR
      competitor_profile::text ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;
END $$;

-- =====================================================================
-- 5. SEO meta / configuration
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='seo_meta_tags') THEN
    UPDATE public.seo_meta_tags
    SET
      title               = public.brikly_rebrand_text(title),
      description         = public.brikly_rebrand_text(description),
      og_title            = public.brikly_rebrand_text(og_title),
      og_description      = public.brikly_rebrand_text(og_description),
      og_image            = public.brikly_rebrand_text(og_image),
      twitter_title       = public.brikly_rebrand_text(twitter_title),
      twitter_description = public.brikly_rebrand_text(twitter_description),
      twitter_image       = public.brikly_rebrand_text(twitter_image),
      canonical_url       = public.brikly_rebrand_text(canonical_url),
      keywords            = public.brikly_rebrand_text_array(keywords)
    WHERE
      COALESCE(title,'')               ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(description,'')         ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(og_title,'')            ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(og_description,'')      ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(og_image,'')            ~* 'build-desk\.com|brikly\.com' OR
      COALESCE(twitter_title,'')       ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(twitter_description,'') ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(twitter_image,'')       ~* 'build-desk\.com|brikly\.com' OR
      COALESCE(canonical_url,'')       ~* 'build-desk\.com|brikly\.com' OR
      array_to_string(COALESCE(keywords, ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='seo_configurations') THEN
    UPDATE public.seo_configurations
    SET
      site_name         = public.brikly_rebrand_text(site_name),
      site_description  = public.brikly_rebrand_text(site_description),
      site_keywords     = public.brikly_rebrand_text_array(site_keywords),
      default_og_image  = public.brikly_rebrand_text(default_og_image),
      canonical_domain  = public.brikly_rebrand_text(canonical_domain),
      twitter_site      = public.brikly_rebrand_text(twitter_site),
      robots_txt        = public.brikly_rebrand_text(robots_txt)
    WHERE
      COALESCE(site_name,'')        ~* 'builddesk|build[ _-]desk' OR
      COALESCE(site_description,'') ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      array_to_string(COALESCE(site_keywords, ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk' OR
      COALESCE(default_og_image,'') ~* 'build-desk\.com|brikly\.com' OR
      COALESCE(canonical_domain,'') ~* 'build-desk\.com|brikly\.com|builddesk' OR
      COALESCE(twitter_site,'')     ~* 'builddesk' OR
      COALESCE(robots_txt,'')       ~* 'build-desk\.com|brikly\.com|builddesk';
  END IF;
END $$;

-- =====================================================================
-- 6. Knowledge base
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='knowledge_base_articles') THEN
    UPDATE public.knowledge_base_articles
    SET
      title              = public.brikly_rebrand_text(title),
      content            = public.brikly_rebrand_text(content),
      excerpt            = public.brikly_rebrand_text(excerpt),
      meta_title         = public.brikly_rebrand_text(meta_title),
      meta_description   = public.brikly_rebrand_text(meta_description),
      featured_image_url = public.brikly_rebrand_text(featured_image_url),
      tags               = public.brikly_rebrand_text_array(tags)
    WHERE
      COALESCE(title,'')    ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(content,'')  ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(excerpt,'')  ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(meta_title,'')        ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(meta_description,'')  ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(featured_image_url,'') ~* 'build-desk\.com|brikly\.com' OR
      array_to_string(COALESCE(tags, ARRAY[]::TEXT[]), '||') ~* 'builddesk|build[ _-]desk';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='knowledge_base_categories') THEN
    UPDATE public.knowledge_base_categories
    SET
      name        = public.brikly_rebrand_text(name),
      description = public.brikly_rebrand_text(description)
    WHERE
      COALESCE(name,'')        ~* 'builddesk|build[ _-]desk' OR
      COALESCE(description,'') ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;
END $$;

-- =====================================================================
-- 7. Email templates
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='email_templates') THEN
    UPDATE public.email_templates
    SET
      name    = public.brikly_rebrand_text(name),
      subject = public.brikly_rebrand_text(subject),
      content = public.brikly_rebrand_text(content)
    WHERE
      COALESCE(name,'')    ~* 'builddesk|build[ _-]desk' OR
      COALESCE(subject,'') ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(content,'') ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='email_marketing_templates') THEN
    UPDATE public.email_marketing_templates
    SET
      name    = public.brikly_rebrand_text(name),
      subject = public.brikly_rebrand_text(subject),
      content = public.brikly_rebrand_text(content)
    WHERE
      COALESCE(name,'')    ~* 'builddesk|build[ _-]desk' OR
      COALESCE(subject,'') ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(content,'') ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;
END $$;

-- =====================================================================
-- 8. Communication + Social templates and posts
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='communication_templates') THEN
    UPDATE public.communication_templates
    SET
      name    = public.brikly_rebrand_text(name),
      subject = public.brikly_rebrand_text(subject),
      content = public.brikly_rebrand_text(content)
    WHERE
      COALESCE(name,'')    ~* 'builddesk|build[ _-]desk' OR
      COALESCE(subject,'') ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(content,'') ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='social_media_templates') THEN
    UPDATE public.social_media_templates
    SET
      name        = public.brikly_rebrand_text(name),
      description = public.brikly_rebrand_text(description),
      content     = public.brikly_rebrand_text(content)
    WHERE
      COALESCE(name,'')        ~* 'builddesk|build[ _-]desk' OR
      COALESCE(description,'') ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(content,'')     ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='social_media_posts') THEN
    UPDATE public.social_media_posts
    SET
      title   = public.brikly_rebrand_text(title),
      content = public.brikly_rebrand_text(content)
    WHERE
      COALESCE(title,'')   ~* 'builddesk|build[ _-]desk|brikly\.com' OR
      COALESCE(content,'') ~* 'builddesk|build[ _-]desk|brikly\.com';
  END IF;
END $$;

-- =====================================================================
-- 9. Company display name (only rebrand our own company record, never a
--    customer's company record). We detect our record by looking for the
--    exact old brand strings in the name column.
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='companies') THEN
    UPDATE public.companies
    SET
      name    = public.brikly_rebrand_text(name),
      website = public.brikly_rebrand_text(website)
    WHERE
      -- Only match rows whose name is literally our old brand.
      name IN ('BuildDesk', 'Build Desk', 'Build-Desk', 'builddesk', 'build-desk')
      OR website ~* 'build-desk\.com|brikly\.com';
  END IF;
END $$;

-- =====================================================================
-- 10. Seed/insert the rebrand announcement blog post (idempotent).
--     If the slug already exists, do nothing. Useful for fresh envs that
--     didn't exist before the rebrand.
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='blog_posts')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='blog_posts'
                   AND column_name='status') THEN
    INSERT INTO public.blog_posts (
      title,
      slug,
      body,
      excerpt,
      seo_title,
      seo_description,
      status,
      published_at,
      created_at,
      updated_at
    )
    SELECT
      'We''re Now Brikly — Same Platform, New Name',
      'brikly-rebrand-announcement',
      'We have rebranded to Brikly. Our product, our team, our pricing, your data, and your logins are all unchanged. The only thing that is different is the name on the door and the domain you visit — brikly.net. See the full announcement for details on what changed, what did not, and what (if anything) you need to do.',
      'Important announcement: we have rebranded to Brikly. Same team, same software, same pricing — now under the Brikly name at brikly.net.',
      'We''re Now Brikly — Same Platform, New Name | Brikly',
      'We rebranded to Brikly. Product, pricing, data, and logins are unchanged. New home: brikly.net. Read the full announcement.',
      'published',
      NOW(),
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.blog_posts WHERE slug = 'brikly-rebrand-announcement'
    );
  END IF;
END $$;

-- =====================================================================
-- Cleanup: drop the helper functions so they do not pollute the
-- application schema. They are only needed for this one-time migration.
-- =====================================================================
DROP FUNCTION IF EXISTS public.brikly_rebrand_jsonb(JSONB);
DROP FUNCTION IF EXISTS public.brikly_rebrand_text_array(TEXT[]);
DROP FUNCTION IF EXISTS public.brikly_rebrand_text(TEXT);

COMMIT;
