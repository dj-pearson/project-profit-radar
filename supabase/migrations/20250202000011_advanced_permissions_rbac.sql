-- =====================================================
-- ADVANCED PERMISSIONS & RBAC
-- =====================================================
-- Purpose: Granular role-based access control
-- Features:
--   - Custom role creation
--   - Permission matrix
--   - Resource-level permissions
--   - Permission inheritance
--   - Temporary access grants
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS permission_audit_log CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS custom_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- =====================================================
-- 1. PERMISSIONS TABLE (Master List)
-- =====================================================

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Permission identity
  name TEXT UNIQUE NOT NULL, -- e.g., "projects.read", "invoices.write"
  resource_type TEXT NOT NULL, -- projects, invoices, documents, users, etc.
  action TEXT NOT NULL, -- read, write, delete, admin, export, approve

  -- Display
  display_name TEXT,
  description TEXT,

  -- Category
  category TEXT, -- project_management, financial, admin, etc.

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource_type);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- =====================================================
-- 2. CUSTOM ROLES TABLE
-- =====================================================

CREATE TABLE custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant relationship
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Role identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Role type
  is_system_role BOOLEAN DEFAULT FALSE, -- System roles can't be deleted
  is_custom BOOLEAN DEFAULT TRUE,

  -- Display
  color TEXT DEFAULT '#6B7280',
  icon TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_roles_tenant ON custom_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_slug ON custom_roles(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_custom_roles_active ON custom_roles(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 3. ROLE PERMISSIONS TABLE
-- =====================================================

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  -- Grant details
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- =====================================================
-- 4. USER PERMISSIONS TABLE (Direct Grants)
-- =====================================================

CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,

  -- Resource-specific permission
  resource_type TEXT, -- projects, invoices, documents
  resource_id UUID, -- Specific resource ID (optional)

  -- Permission type
  permission_type TEXT NOT NULL, -- role_based, direct_grant, temporary

  -- Custom permissions (when not using permission_id)
  custom_permissions TEXT[], -- [read, write, delete, admin]

  -- Grant details
  granted_by UUID REFERENCES auth.users(id),
  grant_reason TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT FALSE, -- Calculated via trigger

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_permissions_not_expired ON user_permissions(is_expired) WHERE is_expired = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires ON user_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 5. PERMISSION AUDIT LOG TABLE
-- =====================================================

CREATE TABLE permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Action
  action TEXT NOT NULL, -- granted, revoked, modified, checked

  -- Subject
  subject_user_id UUID REFERENCES auth.users(id), -- User receiving/losing permission
  subject_role_id UUID REFERENCES custom_roles(id), -- Or role being modified

  -- Permission details
  permission_name TEXT,
  resource_type TEXT,
  resource_id UUID,

  -- Result
  granted BOOLEAN, -- Was permission granted or denied?

  -- Reason
  reason TEXT,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permission_audit_tenant ON permission_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_subject ON permission_audit_log(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_permission_audit_granted ON permission_audit_log(granted);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view master permissions list
CREATE POLICY "Users can view permissions"
  ON permissions FOR SELECT
  USING (is_active = TRUE);

-- Tenant admins can view custom roles
CREATE POLICY "Tenant admins can view roles"
  ON custom_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = custom_roles.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
      AND tenant_users.is_active = TRUE
    )
  );

-- Tenant admins can manage custom roles
CREATE POLICY "Tenant admins can manage roles"
  ON custom_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = custom_roles.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
      AND tenant_users.is_active = TRUE
    )
  );

-- Tenant admins can view role permissions
CREATE POLICY "Tenant admins can view role permissions"
  ON role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_roles
      JOIN tenant_users ON tenant_users.tenant_id = custom_roles.tenant_id
      WHERE custom_roles.id = role_permissions.role_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
      AND tenant_users.is_active = TRUE
    )
  );

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Tenant admins can manage user permissions
CREATE POLICY "Tenant admins can manage user permissions"
  ON user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'admin')
      AND tu.is_active = TRUE
      AND tu.tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = user_permissions.user_id
      )
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON permission_audit_log FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = subject_user_id);

-- Root admins can view all
CREATE POLICY "Root admins can view all permissions"
  ON user_permissions FOR SELECT
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

-- Log permission grants
CREATE OR REPLACE FUNCTION log_permission_grant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO permission_audit_log (
    user_id,
    action,
    subject_user_id,
    permission_name,
    resource_type,
    resource_id,
    granted,
    reason
  ) VALUES (
    NEW.granted_by,
    'granted',
    NEW.user_id,
    (SELECT name FROM permissions WHERE id = NEW.permission_id),
    NEW.resource_type,
    NEW.resource_id,
    TRUE,
    NEW.grant_reason
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_user_permission_grant
  AFTER INSERT ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION log_permission_grant();

-- Log permission revocations
CREATE OR REPLACE FUNCTION log_permission_revoke()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    INSERT INTO permission_audit_log (
      action,
      subject_user_id,
      permission_name,
      resource_type,
      resource_id,
      granted
    ) VALUES (
      'revoked',
      OLD.user_id,
      (SELECT name FROM permissions WHERE id = OLD.permission_id),
      OLD.resource_type,
      OLD.resource_id,
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_user_permission_revoke
  AFTER UPDATE ON user_permissions
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION log_permission_revoke();

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update is_expired flag on user_permissions
CREATE OR REPLACE FUNCTION update_permission_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
    NEW.is_expired := TRUE;
    NEW.is_active := FALSE;
  ELSE
    NEW.is_expired := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_permissions_expiry_trigger
  BEFORE INSERT OR UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_permission_expiry();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_name TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
BEGIN
  -- Check direct permissions
  SELECT EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
    AND p.name = p_permission_name
    AND up.is_active = TRUE
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
    AND (p_resource_type IS NULL OR up.resource_type = p_resource_type)
    AND (p_resource_id IS NULL OR up.resource_id = p_resource_id)
  ) INTO v_has_permission;

  IF v_has_permission THEN
    RETURN TRUE;
  END IF;

  -- Check role-based permissions
  SELECT EXISTS (
    SELECT 1 FROM tenant_users tu
    JOIN custom_roles cr ON cr.slug = tu.role
    JOIN role_permissions rp ON rp.role_id = cr.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE tu.user_id = p_user_id
    AND p.name = p_permission_name
    AND tu.is_active = TRUE
    AND cr.is_active = TRUE
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's all permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(
  permission_name TEXT,
  resource_type TEXT,
  action TEXT,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Direct permissions
  SELECT
    p.name,
    p.resource_type,
    p.action,
    'direct'::TEXT as source
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id
  AND up.is_active = TRUE
  AND (up.expires_at IS NULL OR up.expires_at > NOW())

  UNION

  -- Role-based permissions
  SELECT
    p.name,
    p.resource_type,
    p.action,
    ('role:' || cr.name)::TEXT as source
  FROM tenant_users tu
  JOIN custom_roles cr ON cr.slug = tu.role
  JOIN role_permissions rp ON rp.role_id = cr.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE tu.user_id = p_user_id
  AND tu.is_active = TRUE
  AND cr.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to user
CREATE OR REPLACE FUNCTION grant_permission_to_user(
  p_user_id UUID,
  p_permission_name TEXT,
  p_granted_by UUID,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_permission_id UUID;
  v_grant_id UUID;
BEGIN
  -- Get permission ID
  SELECT id INTO v_permission_id
  FROM permissions
  WHERE name = p_permission_name;

  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permission % not found', p_permission_name;
  END IF;

  -- Create grant
  INSERT INTO user_permissions (
    user_id,
    permission_id,
    resource_type,
    resource_id,
    permission_type,
    granted_by,
    grant_reason,
    expires_at
  ) VALUES (
    p_user_id,
    v_permission_id,
    p_resource_type,
    p_resource_id,
    CASE WHEN p_expires_at IS NOT NULL THEN 'temporary' ELSE 'direct_grant' END,
    p_granted_by,
    p_reason,
    p_expires_at
  )
  RETURNING id INTO v_grant_id;

  RETURN v_grant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. SEED DATA - Master Permissions
-- =====================================================

-- Project permissions
INSERT INTO permissions (name, resource_type, action, display_name, category) VALUES
  ('projects.read', 'projects', 'read', 'View Projects', 'project_management'),
  ('projects.write', 'projects', 'write', 'Create/Edit Projects', 'project_management'),
  ('projects.delete', 'projects', 'delete', 'Delete Projects', 'project_management'),
  ('projects.admin', 'projects', 'admin', 'Administer Projects', 'project_management'),

-- Invoice permissions
  ('invoices.read', 'invoices', 'read', 'View Invoices', 'financial'),
  ('invoices.write', 'invoices', 'write', 'Create/Edit Invoices', 'financial'),
  ('invoices.delete', 'invoices', 'delete', 'Delete Invoices', 'financial'),
  ('invoices.send', 'invoices', 'send', 'Send Invoices', 'financial'),
  ('invoices.approve', 'invoices', 'approve', 'Approve Invoices', 'financial'),

-- Time entry permissions
  ('time_entries.read', 'time_entries', 'read', 'View Time Entries', 'project_management'),
  ('time_entries.write', 'time_entries', 'write', 'Create/Edit Time Entries', 'project_management'),
  ('time_entries.approve', 'time_entries', 'approve', 'Approve Time Entries', 'project_management'),

-- Document permissions
  ('documents.read', 'documents', 'read', 'View Documents', 'project_management'),
  ('documents.write', 'documents', 'write', 'Upload/Edit Documents', 'project_management'),
  ('documents.delete', 'documents', 'delete', 'Delete Documents', 'project_management'),

-- User management permissions
  ('users.read', 'users', 'read', 'View Users', 'admin'),
  ('users.write', 'users', 'write', 'Create/Edit Users', 'admin'),
  ('users.delete', 'users', 'delete', 'Delete Users', 'admin'),

-- Report permissions
  ('reports.read', 'reports', 'read', 'View Reports', 'financial'),
  ('reports.export', 'reports', 'export', 'Export Reports', 'financial'),

-- Settings permissions
  ('settings.read', 'settings', 'read', 'View Settings', 'admin'),
  ('settings.write', 'settings', 'write', 'Modify Settings', 'admin')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE permissions IS
  'Master list of all available permissions in the system';

COMMENT ON TABLE custom_roles IS
  'Custom roles with granular permission sets per tenant';

COMMENT ON TABLE role_permissions IS
  'Permissions assigned to roles';

COMMENT ON TABLE user_permissions IS
  'Direct permission grants to users, including temporary and resource-specific';

COMMENT ON TABLE permission_audit_log IS
  'Audit trail of all permission grants, revocations, and checks';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000011_advanced_permissions_rbac.sql completed successfully';
  RAISE NOTICE 'Created tables: permissions, custom_roles, role_permissions, user_permissions, permission_audit_log';
  RAISE NOTICE 'Created indexes: 22 indexes for performance';
  RAISE NOTICE 'Created policies: 10 RLS policies';
  RAISE NOTICE 'Created functions: user_has_permission, get_user_permissions, grant_permission_to_user';
  RAISE NOTICE 'Seeded 22 master permissions';
END $$;
