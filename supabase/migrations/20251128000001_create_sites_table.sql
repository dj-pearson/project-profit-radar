-- =====================================================
-- MULTI-SITE ARCHITECTURE - Phase 1
-- =====================================================
-- Purpose: Enable multiple Pearson Media products (Build-Desk, RealEstate Bio, SalonPros Bio, etc.)
--          to share a single Supabase database with complete data isolation
-- Migration: Phase 1 - Create sites table infrastructure
-- Date: 2025-11-28
-- =====================================================

-- Drop existing tables if they exist (for development/testing only)
DROP TABLE IF EXISTS sites CASCADE;

-- =====================================================
-- 1. SITES TABLE
-- =====================================================
-- This table tracks each distinct Pearson Media product/website
-- Each product gets one row with a unique key and domain

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Site identity
  key TEXT UNIQUE NOT NULL, -- 'builddesk', 'realestate', 'salonpros', etc.
  name TEXT NOT NULL, -- Display name: 'Build-Desk', 'RealEstate Bio', etc.
  domain TEXT NOT NULL, -- Primary domain: 'build-desk.com', 'realestatebio.com', etc.
  
  -- Additional domains (for staging, custom domains, etc.)
  additional_domains TEXT[] DEFAULT '{}',
  
  -- Site configuration
  config JSONB DEFAULT '{
    "branding": {
      "logo_url": null,
      "primary_color": "#F97316",
      "secondary_color": "#1F2937",
      "favicon_url": null
    },
    "features": {
      "crm": true,
      "projects": true,
      "financials": true,
      "gps_tracking": true,
      "ai_features": true,
      "seo": true,
      "blog": true
    },
    "limits": {
      "max_companies": null,
      "max_users": null,
      "max_storage_gb": null
    }
  }'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_production BOOLEAN DEFAULT FALSE, -- Separates production from staging
  
  -- Metadata
  description TEXT,
  industry TEXT, -- 'construction', 'real_estate', 'salon', etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_key CHECK (key ~ '^[a-z0-9_-]+$'), -- lowercase, numbers, underscore, hyphen only
  CONSTRAINT unique_domain UNIQUE (domain)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX idx_sites_key ON sites(key);
CREATE INDEX idx_sites_domain ON sites(domain);
CREATE INDEX idx_sites_active ON sites(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_sites_production ON sites(is_production) WHERE is_production = TRUE;

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view active sites
-- This is needed for domain routing and site resolution
CREATE POLICY "Users can view active sites"
  ON sites FOR SELECT
  USING (is_active = TRUE);

-- Only root admins can manage sites
CREATE POLICY "Root admins can manage sites"
  ON sites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'root_admin'
    )
  );

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_sites_updated_at();

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get site by domain (for routing)
CREATE OR REPLACE FUNCTION get_site_by_domain(p_domain TEXT)
RETURNS UUID AS $$
DECLARE
  v_site_id UUID;
BEGIN
  -- Try exact domain match first
  SELECT id INTO v_site_id
  FROM sites
  WHERE domain = p_domain
  AND is_active = TRUE
  LIMIT 1;
  
  -- If not found, try additional_domains array
  IF v_site_id IS NULL THEN
    SELECT id INTO v_site_id
    FROM sites
    WHERE p_domain = ANY(additional_domains)
    AND is_active = TRUE
    LIMIT 1;
  END IF;
  
  RETURN v_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get site by key
CREATE OR REPLACE FUNCTION get_site_by_key(p_key TEXT)
RETURNS UUID AS $$
DECLARE
  v_site_id UUID;
BEGIN
  SELECT id INTO v_site_id
  FROM sites
  WHERE key = p_key
  AND is_active = TRUE
  LIMIT 1;
  
  RETURN v_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. SEED DATA - Initial Sites
-- =====================================================

-- Insert Build-Desk as the primary site
INSERT INTO sites (
  key,
  name,
  domain,
  additional_domains,
  description,
  industry,
  is_active,
  is_production,
  config
) VALUES (
  'builddesk',
  'Build-Desk',
  'build-desk.com',
  ARRAY['builddesk.pearsonperformance.workers.dev', 'www.build-desk.com'],
  'Construction management platform for small to medium-sized construction businesses',
  'construction',
  TRUE,
  TRUE,
  '{
    "branding": {
      "logo_url": null,
      "primary_color": "#F97316",
      "secondary_color": "#1F2937",
      "favicon_url": null
    },
    "features": {
      "crm": true,
      "projects": true,
      "financials": true,
      "gps_tracking": true,
      "ai_features": true,
      "seo": true,
      "blog": true,
      "estimates": true,
      "time_tracking": true,
      "compliance": true
    },
    "limits": {
      "max_companies": null,
      "max_users": null,
      "max_storage_gb": null
    }
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE sites IS
  'Multi-site architecture - Each Pearson Media product (Build-Desk, RealEstate Bio, etc.) gets one row';

COMMENT ON COLUMN sites.key IS
  'URL-safe unique identifier for the site (builddesk, realestate, salonpros)';

COMMENT ON COLUMN sites.domain IS
  'Primary domain name for routing and site resolution';

COMMENT ON COLUMN sites.config IS
  'JSON configuration including branding, feature flags, and limits';

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_site_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_site_count FROM sites WHERE key = 'builddesk';
  
  IF v_site_count > 0 THEN
    RAISE NOTICE '✓ Migration 20251128000001_create_sites_table.sql completed successfully';
    RAISE NOTICE '✓ Created sites table with indexes and RLS';
    RAISE NOTICE '✓ Created helper functions: get_site_by_domain, get_site_by_key';
    RAISE NOTICE '✓ Seeded Build-Desk as primary site';
  ELSE
    RAISE EXCEPTION 'Migration failed: Build-Desk site not created';
  END IF;
END $$;

