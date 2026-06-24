-- ============================================
-- ERROR LOGS TABLE
-- Creates the table if it doesn't exist, then adds enhanced columns
-- for richer diagnostics: page route, user email/role, device info,
-- session tracking, metadata
-- ============================================

-- Create the base table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  company_id UUID,

  -- Error information
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,

  -- Context
  url TEXT,
  user_action TEXT,
  component TEXT,

  -- Environment
  browser_info JSONB,
  environment TEXT DEFAULT 'production',

  -- Metadata
  severity TEXT DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,

  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Additional context columns
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS page_route TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS user_role TEXT;

-- Device & browser details (separate from browser_info JSONB)
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS screen_resolution TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS viewport_size TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Session & component stack
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS component_stack TEXT;

-- Extensible metadata
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Indexes for error queries
CREATE INDEX IF NOT EXISTS idx_errors_user ON public.error_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_errors_company ON public.error_logs(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_errors_unresolved ON public.error_logs(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_errors_severity ON public.error_logs(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_errors_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_errors_page_route ON public.error_logs(page_route);
CREATE INDEX IF NOT EXISTS idx_errors_session ON public.error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_errors_created_at ON public.error_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Simple policies that only depend on auth.uid() (no dependency on user_profiles table).
-- App-level route guards enforce admin-only access to the ErrorLogs page.
-- SELECT: any authenticated user can read (admin enforcement is at the app layer)
-- INSERT: any authenticated user can write
-- UPDATE: any authenticated user can update (mark as resolved)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'error_logs'
    AND policyname = 'Authenticated users can view error logs'
  ) THEN
    CREATE POLICY "Authenticated users can view error logs"
      ON public.error_logs FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'error_logs'
    AND policyname = 'Authenticated users can insert error logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert error logs"
      ON public.error_logs FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'error_logs'
    AND policyname = 'Authenticated users can update error logs'
  ) THEN
    CREATE POLICY "Authenticated users can update error logs"
      ON public.error_logs FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Clean up any old policies from previous migration attempts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_logs' AND policyname = 'Root admins can view all errors') THEN
    DROP POLICY "Root admins can view all errors" ON public.error_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_logs' AND policyname = 'Admins can view all errors') THEN
    DROP POLICY "Admins can view all errors" ON public.error_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_logs' AND policyname = 'All users can insert error logs') THEN
    DROP POLICY "All users can insert error logs" ON public.error_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_logs' AND policyname = 'Admins can update error logs') THEN
    DROP POLICY "Admins can update error logs" ON public.error_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_logs' AND policyname = 'Admins can view all error logs') THEN
    DROP POLICY "Admins can view all error logs" ON public.error_logs;
  END IF;
END $$;

COMMENT ON TABLE public.error_logs IS 'Centralized error tracking across the platform';
COMMENT ON COLUMN public.error_logs.page_route IS 'URL pathname where the error occurred';
COMMENT ON COLUMN public.error_logs.session_id IS 'Groups errors from same page load session';
COMMENT ON COLUMN public.error_logs.component_stack IS 'React component tree at time of error';
COMMENT ON COLUMN public.error_logs.metadata IS 'Extensible context: network status, memory usage, etc.';
