-- =============================================
-- pSEO (Programmatic SEO) Tables
-- Based on BuildDesk pSEO Full System Specification v1.0
-- =============================================

-- =============================================
-- Dimension Context Tables
-- =============================================

CREATE TABLE IF NOT EXISTS pseo_contractor_types (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pseo_pain_points (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pseo_geographies (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  geo_level         TEXT NOT NULL CHECK (geo_level IN ('state', 'metro')),
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pseo_business_sizes (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pseo_competitors (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  competitor_profile JSONB NOT NULL,
  pricing_verified_at TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- pSEO Pages Table
-- =============================================

CREATE TABLE IF NOT EXISTS pseo_pages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type         TEXT NOT NULL CHECK (page_type IN (
                      'contractor_pain', 'contractor_geo', 'pain_size',
                      'pain_geo', 'comparison', 'contractor_size', 'feature_contractor'
                    )),
  combination_key   TEXT NOT NULL UNIQUE,
  dimension_1       TEXT NOT NULL,
  dimension_2       TEXT NOT NULL,
  dimension_3       TEXT,

  -- SEO Fields
  seo_title         TEXT NOT NULL,
  seo_description   TEXT NOT NULL,
  canonical_url     TEXT NOT NULL UNIQUE,

  -- Full Schema JSON
  page_schema       JSONB NOT NULL,
  schema_version    TEXT NOT NULL DEFAULT '1.0',

  -- Publishing State
  is_published      BOOLEAN NOT NULL DEFAULT false,
  generation_status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (generation_status IN (
                      'pending', 'generated', 'review_needed', 'failed', 'published', 'stale'
                    )),
  qc_failures       JSONB,

  -- Freshness
  freshness_days    INTEGER NOT NULL DEFAULT 90,

  -- Metadata
  generation_model  TEXT DEFAULT 'claude-sonnet-4-20250514',
  generation_prompt_version TEXT DEFAULT '1.0',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at      TIMESTAMPTZ,

  -- Analytics
  view_count        INTEGER NOT NULL DEFAULT 0,
  conversion_count  INTEGER NOT NULL DEFAULT 0
);

-- =============================================
-- Generation Queue Table
-- =============================================

CREATE TABLE IF NOT EXISTS pseo_generation_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type         TEXT NOT NULL,
  combination_key   TEXT NOT NULL UNIQUE,
  dimension_1       TEXT NOT NULL,
  dimension_2       TEXT NOT NULL,
  dimension_3       TEXT,
  tier              INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  estimated_volume  TEXT CHECK (estimated_volume IN ('high', 'medium', 'long-tail')),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending', 'in_progress', 'completed', 'failed', 'insufficient_data'
                    )),
  failure_reason    TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pseo_pages_page_type ON pseo_pages (page_type);
CREATE INDEX IF NOT EXISTS idx_pseo_pages_is_published ON pseo_pages (is_published);
CREATE INDEX IF NOT EXISTS idx_pseo_pages_canonical ON pseo_pages (canonical_url);
CREATE INDEX IF NOT EXISTS idx_pseo_pages_dimension_1 ON pseo_pages (dimension_1);
CREATE INDEX IF NOT EXISTS idx_pseo_pages_status ON pseo_pages (generation_status);
CREATE INDEX IF NOT EXISTS idx_pseo_pages_refresh ON pseo_pages (updated_at) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_pseo_queue_tier_status ON pseo_generation_queue (tier ASC, status);

-- Full text search on SEO fields
CREATE INDEX IF NOT EXISTS idx_pseo_pages_fts ON pseo_pages
  USING GIN (to_tsvector('english', seo_title || ' ' || seo_description));

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE pseo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_contractor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_geographies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_business_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_competitors ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Public can read published pseo pages"
  ON pseo_pages FOR SELECT
  TO anon
  USING (is_published = true);

-- Authenticated users can read all pseo pages
CREATE POLICY "Authenticated users can read pseo pages"
  ON pseo_pages FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can manage pseo pages
CREATE POLICY "Authenticated users can manage pseo pages"
  ON pseo_pages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role full access pseo_pages"
  ON pseo_pages FOR ALL
  TO service_role
  USING (true);

-- Queue policies
CREATE POLICY "Authenticated users can manage queue"
  ON pseo_generation_queue FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access queue"
  ON pseo_generation_queue FOR ALL
  TO service_role
  USING (true);

-- Dimension table policies (public read, authenticated write)
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

-- =============================================
-- Triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_pseo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    NEW.published_at = NOW();
    NEW.generation_status = 'published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pseo_pages_updated_at
  BEFORE UPDATE ON pseo_pages
  FOR EACH ROW EXECUTE FUNCTION update_pseo_updated_at();

CREATE TRIGGER pseo_queue_updated_at
  BEFORE UPDATE ON pseo_generation_queue
  FOR EACH ROW EXECUTE FUNCTION update_pseo_updated_at();

CREATE TRIGGER pseo_competitors_updated_at
  BEFORE UPDATE ON pseo_competitors
  FOR EACH ROW EXECUTE FUNCTION update_pseo_updated_at();
