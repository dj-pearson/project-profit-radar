-- =====================================================
-- MULTI-TENANT ARCHITECTURE
-- =====================================================
-- Purpose: Enterprise multi-tenant support and white-label
-- Features:
--   - Tenant isolation
--   - Per-tenant branding
--   - Feature flags per tenant
--   - Usage quotas
--   - Tenant administration
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS tenant_invitations CASCADE;
DROP TABLE IF EXISTS tenant_usage_metrics CASCADE;
DROP TABLE IF EXISTS tenant_settings CASCADE;
DROP TABLE IF EXISTS tenant_users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- =====================================================
-- 1. TENANTS TABLE
-- =====================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-safe identifier
  display_name TEXT,

  -- Plan and limits
  plan_tier TEXT DEFAULT 'starter', -- starter, professional, enterprise, white_label
  subscription_status TEXT DEFAULT 'trial', -- trial, active, suspended, cancelled
  trial_ends_at TIMESTAMPTZ,

  -- Usage quotas
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 10,

  -- Feature flags
  features JSONB DEFAULT '{
    "advanced_analytics": false,
    "custom_branding": false,
    "sso": false,
    "api_access": false,
    "white_label": false,
    "custom_domain": false,
    "priority_support": false,
    "audit_logs": false
  }'::jsonb,

  -- Branding
  branding JSONB DEFAULT '{
    "logo_url": null,
    "primary_color": "#F97316",
    "secondary_color": "#1F2937",
    "favicon_url": null,
    "email_logo_url": null
  }'::jsonb,

  -- Custom domain
  custom_domain TEXT,
  domain_verified BOOLEAN DEFAULT FALSE,

  -- Contact info
  owner_email TEXT,
  billing_email TEXT,
  support_email TEXT,
  phone TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan_tier);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(subscription_status);

-- =====================================================
-- 2. TENANT USERS TABLE
-- =====================================================

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within tenant
  role TEXT DEFAULT 'member', -- owner, admin, member, viewer

  -- Permissions
  permissions JSONB DEFAULT '[]'::jsonb, -- Additional permissions

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Last activity
  last_seen_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_tenant_users_active ON tenant_users(tenant_id, is_active) WHERE is_active = TRUE;

-- =====================================================
-- 3. TENANT SETTINGS TABLE
-- =====================================================

CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Setting
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type TEXT, -- string, number, boolean, json

  -- Metadata
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Can non-admins see this?

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, setting_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_key ON tenant_settings(tenant_id, setting_key);

-- =====================================================
-- 4. TENANT INVITATIONS TABLE
-- =====================================================

CREATE TABLE tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Invitation details
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, accepted, expired, revoked
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,

  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_status ON tenant_invitations(status);

-- =====================================================
-- 5. TENANT USAGE METRICS TABLE
-- =====================================================

CREATE TABLE tenant_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Usage counts
  active_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,

  -- Storage
  storage_used_bytes BIGINT DEFAULT 0,

  -- Activity
  api_requests INTEGER DEFAULT 0,
  webhook_deliveries INTEGER DEFAULT 0,

  -- Financial
  mrr DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant ON tenant_usage_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_period ON tenant_usage_metrics(period_start DESC);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view tenants they belong to
CREATE POLICY "Users can view own tenants"
  ON tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.is_active = TRUE
    )
  );

-- Tenant owners/admins can update their tenant
CREATE POLICY "Tenant admins can update tenant"
  ON tenants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
      AND tenant_users.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
      AND tenant_users.is_active = TRUE
    )
  );

-- Users can view tenant_users for their tenants
CREATE POLICY "Users can view tenant users"
  ON tenant_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = TRUE
    )
  );

-- Tenant admins can manage users
CREATE POLICY "Tenant admins can manage users"
  ON tenant_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'admin')
      AND tu.is_active = TRUE
    )
  );

-- Users can view public tenant settings
CREATE POLICY "Users can view tenant settings"
  ON tenant_settings FOR SELECT
  USING (
    (is_public = TRUE AND EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenant_settings.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.is_active = TRUE
    )) OR
    (EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenant_settings.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
      AND tenant_users.is_active = TRUE
    ))
  );

-- Tenant admins can manage settings
CREATE POLICY "Tenant admins can manage settings"
  ON tenant_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenant_settings.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
      AND tenant_users.is_active = TRUE
    )
  );

-- Root admins can view all tenants
CREATE POLICY "Root admins can view all tenants"
  ON tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'root_admin'
    )
  );

-- Root admins can manage all tenants
CREATE POLICY "Root admins can manage all tenants"
  ON tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'root_admin'
    )
  );

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_updated_at();

CREATE TRIGGER update_tenant_users_updated_at
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_updated_at();

CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_updated_at();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Get user's current tenant (for single-tenant context)
CREATE OR REPLACE FUNCTION get_user_tenant(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_users
  WHERE user_id = p_user_id
  AND is_active = TRUE
  ORDER BY joined_at DESC
  LIMIT 1;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get tenant usage for current period
CREATE OR REPLACE FUNCTION get_tenant_current_usage(p_tenant_id UUID)
RETURNS TABLE(
  current_users INTEGER,
  max_users INTEGER,
  current_projects INTEGER,
  max_projects INTEGER,
  storage_used_gb NUMERIC,
  max_storage_gb INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM tenant_users WHERE tenant_id = p_tenant_id AND is_active = TRUE),
    t.max_users,
    (SELECT COUNT(*)::INTEGER FROM projects WHERE company_id IN (SELECT id FROM user_profiles WHERE id IN (SELECT user_id FROM tenant_users WHERE tenant_id = p_tenant_id))),
    t.max_projects,
    COALESCE((SELECT storage_used_bytes::NUMERIC / 1073741824 FROM tenant_usage_metrics WHERE tenant_id = p_tenant_id ORDER BY period_start DESC LIMIT 1), 0),
    t.max_storage_gb
  FROM tenants t
  WHERE t.id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if tenant can add more users
CREATE OR REPLACE FUNCTION can_add_tenant_user(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_users INTEGER;
  v_max_users INTEGER;
BEGIN
  SELECT
    (SELECT COUNT(*)::INTEGER FROM tenant_users WHERE tenant_id = p_tenant_id AND is_active = TRUE),
    max_users
  INTO v_current_users, v_max_users
  FROM tenants
  WHERE id = p_tenant_id;

  RETURN v_current_users < v_max_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. SEED DATA - Demo Tenant
-- =====================================================

-- Create default tenant for existing users
INSERT INTO tenants (
  name,
  slug,
  display_name,
  plan_tier,
  subscription_status,
  owner_email,
  billing_email
) VALUES (
  'BuildDesk Demo',
  'builddesk-demo',
  'BuildDesk Demo Company',
  'professional',
  'active',
  'demo@build-desk.com',
  'billing@build-desk.com'
) ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE tenants IS
  'Multi-tenant organizations with isolation, branding, and feature flags';

COMMENT ON TABLE tenant_users IS
  'User memberships within tenants with roles and permissions';

COMMENT ON TABLE tenant_settings IS
  'Per-tenant configuration settings';

COMMENT ON TABLE tenant_invitations IS
  'Pending invitations to join a tenant';

COMMENT ON TABLE tenant_usage_metrics IS
  'Tenant usage tracking for billing and quota enforcement';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000009_multi_tenant_architecture.sql completed successfully';
  RAISE NOTICE 'Created tables: tenants, tenant_users, tenant_settings, tenant_invitations, tenant_usage_metrics';
  RAISE NOTICE 'Created indexes: 16 indexes for performance';
  RAISE NOTICE 'Created policies: 10 RLS policies';
  RAISE NOTICE 'Created functions: get_user_tenant, get_tenant_current_usage, can_add_tenant_user';
END $$;
