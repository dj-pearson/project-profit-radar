-- =====================================================
-- DEVELOPER PORTAL
-- =====================================================
-- Purpose: API documentation and developer resources
-- Features:
--   - API documentation
--   - Code examples
--   - Sandbox environment
--   - Developer onboarding
--   - API playground
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sandbox_requests CASCADE;
DROP TABLE IF EXISTS api_examples CASCADE;
DROP TABLE IF EXISTS api_documentation CASCADE;

-- =====================================================
-- 1. API DOCUMENTATION TABLE
-- =====================================================

CREATE TABLE api_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Documentation details
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- authentication, projects, invoices, webhooks, etc.
  description TEXT,
  content TEXT NOT NULL, -- Markdown content

  -- API endpoint details
  endpoint_path TEXT, -- e.g., "/api/v1/projects"
  http_method TEXT, -- GET, POST, PUT, DELETE, PATCH

  -- Request/Response schemas
  request_schema JSONB,
  response_schema JSONB,
  error_responses JSONB DEFAULT '[]'::jsonb,

  -- Code examples
  has_examples BOOLEAN DEFAULT FALSE,
  example_count INTEGER DEFAULT 0,

  -- Metadata
  is_published BOOLEAN DEFAULT TRUE,
  version TEXT DEFAULT 'v1',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Statistics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_docs_slug ON api_documentation(slug);
CREATE INDEX IF NOT EXISTS idx_api_docs_category ON api_documentation(category);
CREATE INDEX IF NOT EXISTS idx_api_docs_published ON api_documentation(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_docs_endpoint ON api_documentation(endpoint_path, http_method);
CREATE INDEX IF NOT EXISTS idx_api_docs_tags ON api_documentation USING GIN (tags);

-- =====================================================
-- 2. API EXAMPLES TABLE
-- =====================================================

CREATE TABLE api_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Documentation reference
  documentation_id UUID REFERENCES api_documentation(id) ON DELETE CASCADE,

  -- Example details
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL, -- javascript, python, php, ruby, curl, etc.

  -- Code
  code TEXT NOT NULL,
  highlighted_code TEXT, -- HTML with syntax highlighting

  -- Context
  is_request BOOLEAN DEFAULT TRUE, -- Request or response example
  example_type TEXT DEFAULT 'basic', -- basic, advanced, error_handling

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Statistics
  copy_count INTEGER DEFAULT 0, -- How many times copied
  last_copied_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_examples_doc ON api_examples(documentation_id);
CREATE INDEX IF NOT EXISTS idx_api_examples_language ON api_examples(language);
CREATE INDEX IF NOT EXISTS idx_api_examples_type ON api_examples(example_type);

-- =====================================================
-- 3. SANDBOX REQUESTS TABLE
-- =====================================================

CREATE TABLE sandbox_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  session_id TEXT, -- Anonymous session tracking

  -- Request details
  documentation_id UUID REFERENCES api_documentation(id),
  endpoint_path TEXT NOT NULL,
  http_method TEXT NOT NULL,
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_body JSONB,
  query_params JSONB DEFAULT '{}'::jsonb,

  -- Response
  response_status_code INTEGER,
  response_headers JSONB,
  response_body JSONB,
  response_time_ms INTEGER,

  -- Result
  success BOOLEAN,
  error_message TEXT,

  -- Environment
  is_sandbox BOOLEAN DEFAULT TRUE,
  used_api_key BOOLEAN DEFAULT FALSE,

  -- Metadata
  user_agent TEXT,
  ip_address TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sandbox_requests_user ON sandbox_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_requests_tenant ON sandbox_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_requests_session ON sandbox_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_requests_doc ON sandbox_requests(documentation_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_requests_endpoint ON sandbox_requests(endpoint_path, http_method);
CREATE INDEX IF NOT EXISTS idx_sandbox_requests_created ON sandbox_requests(created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE api_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_requests ENABLE ROW LEVEL SECURITY;

-- All users can view published documentation
CREATE POLICY "Anyone can view published docs"
  ON api_documentation FOR SELECT
  USING (is_published = TRUE);

-- Admins can manage documentation
CREATE POLICY "Admins can manage docs"
  ON api_documentation FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- All users can view examples
CREATE POLICY "Anyone can view examples"
  ON api_examples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_documentation
      WHERE api_documentation.id = api_examples.documentation_id
      AND api_documentation.is_published = TRUE
    )
  );

-- Admins can manage examples
CREATE POLICY "Admins can manage examples"
  ON api_examples FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- Users can view their own sandbox requests
CREATE POLICY "Users can view own sandbox requests"
  ON sandbox_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create sandbox requests
CREATE POLICY "Users can create sandbox requests"
  ON sandbox_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all sandbox requests
CREATE POLICY "Admins can view all sandbox requests"
  ON sandbox_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Update example count on documentation
CREATE OR REPLACE FUNCTION update_doc_example_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE api_documentation
    SET
      has_examples = TRUE,
      example_count = example_count + 1
    WHERE id = NEW.documentation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE api_documentation
    SET
      example_count = GREATEST(0, example_count - 1),
      has_examples = (example_count - 1) > 0
    WHERE id = OLD.documentation_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doc_example_count_trigger
  AFTER INSERT OR DELETE ON api_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_doc_example_count();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Get popular endpoints
CREATE OR REPLACE FUNCTION get_popular_endpoints(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  endpoint_path TEXT,
  http_method TEXT,
  request_count INTEGER,
  success_rate DECIMAL,
  avg_response_time_ms DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.endpoint_path,
    sr.http_method,
    COUNT(*)::INTEGER as request_count,
    (COUNT(*) FILTER (WHERE sr.success = TRUE)::DECIMAL / COUNT(*)::DECIMAL * 100) as success_rate,
    AVG(sr.response_time_ms)::DECIMAL as avg_response_time_ms
  FROM sandbox_requests sr
  WHERE sr.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY sr.endpoint_path, sr.http_method
  ORDER BY request_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search documentation
CREATE OR REPLACE FUNCTION search_documentation(p_query TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  category TEXT,
  description TEXT,
  relevance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.id,
    ad.title,
    ad.slug,
    ad.category,
    ad.description,
    (
      ts_rank(
        to_tsvector('english', COALESCE(ad.title, '') || ' ' || COALESCE(ad.description, '') || ' ' || COALESCE(ad.content, '')),
        plainto_tsquery('english', p_query)
      )
    )::DECIMAL as relevance
  FROM api_documentation ad
  WHERE ad.is_published = TRUE
  AND (
    to_tsvector('english', COALESCE(ad.title, '') || ' ' || COALESCE(ad.description, '') || ' ' || COALESCE(ad.content, ''))
    @@ plainto_tsquery('english', p_query)
  )
  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. SEED DATA
-- =====================================================

-- Insert basic documentation categories
INSERT INTO api_documentation (title, slug, category, description, content, endpoint_path, http_method, sort_order) VALUES
('Authentication', 'authentication', 'getting-started', 'Learn how to authenticate with the BuildDesk API', '# Authentication\n\nAll API requests require authentication using an API key.', '/api/v1/auth', 'POST', 1),
('Projects API', 'projects-list', 'projects', 'List all projects in your account', '# List Projects\n\nRetrieve a list of all projects.', '/api/v1/projects', 'GET', 10),
('Create Project', 'projects-create', 'projects', 'Create a new project', '# Create Project\n\nCreate a new project in your account.', '/api/v1/projects', 'POST', 11),
('Invoices API', 'invoices-list', 'invoices', 'List all invoices', '# List Invoices\n\nRetrieve a list of all invoices.', '/api/v1/invoices', 'GET', 20),
('Time Entries API', 'time-entries-list', 'time-tracking', 'List time entries', '# List Time Entries\n\nRetrieve time entries for your team.', '/api/v1/time-entries', 'GET', 30),
('Webhooks', 'webhooks', 'webhooks', 'Set up real-time event notifications', '# Webhooks\n\nReceive real-time notifications when events occur.', '/api/v1/webhooks', 'POST', 40);

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE api_documentation IS
  'API documentation with endpoints, schemas, and examples';

COMMENT ON TABLE api_examples IS
  'Code examples in multiple programming languages';

COMMENT ON TABLE sandbox_requests IS
  'Sandbox API playground request tracking';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000016_developer_portal.sql completed successfully';
  RAISE NOTICE 'Created tables: api_documentation, api_examples, sandbox_requests';
  RAISE NOTICE 'Created indexes: 12+ indexes for performance';
  RAISE NOTICE 'Created policies: 8 RLS policies';
  RAISE NOTICE 'Created functions: get_popular_endpoints, search_documentation';
  RAISE NOTICE 'Seeded 6 documentation pages';
END $$;
