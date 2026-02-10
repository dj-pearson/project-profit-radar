-- =============================================================================
-- Bootstrap Foundational Schema Migration
-- =============================================================================
-- This idempotent migration ensures all core tables, functions, enums, RLS
-- policies, triggers, and indexes exist. Safe to run on fresh or existing DBs.
--
-- Context: BuildDesk transitioned from cloud Supabase to self-hosted. Two
-- conflicting foundational migrations exist (20250702223641 and 20250804005934)
-- and several tables referenced in code have no CREATE TABLE migration at all.
-- This migration reconciles everything.
-- =============================================================================

-- ============================================================
-- SECTION 1: Foundational Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'root_admin',
    'admin',
    'project_manager',
    'field_supervisor',
    'office_staff',
    'accounting',
    'client_portal'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM (
    'starter',
    'professional',
    'enterprise'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.industry_type AS ENUM (
    'residential',
    'commercial',
    'civil_infrastructure',
    'specialty_trades'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: Core Tables
-- ============================================================

-- ---------- companies ----------
-- Migration 1 schema: name, address (TEXT), license_numbers, industry_type (enum),
--   company_size, annual_revenue_range, subscription_tier (enum), subscription_status,
--   stripe_customer_id, stripe_subscription_id, trial_end_date
-- Migration 2 schema: name, slug, logo_url, address (JSONB), phone, email, website,
--   license_numbers, industry_type (TEXT CHECK), company_size, subscription_tier (TEXT CHECK),
--   subscription_status (TEXT CHECK), trial_ends_at
-- Strategy: CREATE IF NOT EXISTS with migration 1 columns, then ADD missing migration 2 columns.

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  license_numbers TEXT[],
  industry_type TEXT,
  company_size TEXT,
  annual_revenue_range TEXT,
  subscription_tier TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trial',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_end_date TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns from migration 2 that migration 1 didn't have
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT;
-- migration 2 uses trial_ends_at instead of trial_end_date
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- ---------- user_profiles ----------
-- From migration 1: id PK references auth.users, email, first_name, last_name,
--   phone, company_id, role (user_role enum), is_active, last_login

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure unique constraint on email (safe if already exists)
DO $$ BEGIN
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- profiles ----------
-- From migration 2: separate id, user_id FK, company_id, display_name, avatar_url,
--   hourly_rate, permissions, role (TEXT CHECK)

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'crew_member',
  permissions JSONB DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'crew_member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- projects ----------
-- Migration 1: company_id, name, description, client_name, client_email,
--   start_date, end_date, budget, status, created_by (auth.users)
-- Migration 2: + project_type, priority, client_contact (JSONB), project_address (JSONB),
--   gps_coordinates (POINT), estimated_completion, budget_total, budget_labor,
--   budget_materials, budget_equipment, budget_overhead, actual_cost, profit_margin,
--   contract_value, created_by (profiles), project_manager_id (profiles)

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  status TEXT DEFAULT 'planning',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns from migration 2 that migration 1 didn't have
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'residential';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_contact JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_address JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gps_coordinates POINT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_completion DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_total DECIMAL(12,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_labor DECIMAL(12,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_materials DECIMAL(12,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_equipment DECIMAL(12,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_overhead DECIMAL(12,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_value DECIMAL(12,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_manager_id UUID;

-- ============================================================
-- SECTION 3: Secondary Core Tables (from migration 2)
-- ============================================================

-- ---------- project_assignments ----------
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'crew_member',
  hourly_rate DECIMAL(10,2),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'crew_member';
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- Add unique constraint if not exists
DO $$ BEGIN
  ALTER TABLE public.project_assignments
    ADD CONSTRAINT project_assignments_project_id_user_id_key UNIQUE (project_id, user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- time_entries ----------
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  break_duration_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(4,2),
  hourly_rate DECIMAL(10,2),
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  overtime_rate DECIMAL(10,2),
  cost_code TEXT,
  task_description TEXT,
  location_clock_in POINT,
  location_clock_out POINT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS clock_in_time TIMESTAMPTZ;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS clock_out_time TIMESTAMPTZ;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 0;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS total_hours DECIMAL(4,2);
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(4,2) DEFAULT 0;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10,2);
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS cost_code TEXT;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS task_description TEXT;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS location_clock_in POINT;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS location_clock_out POINT;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- materials ----------
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'each',
  cost_per_unit DECIMAL(10,2),
  quantity_available INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 0,
  supplier_name TEXT,
  supplier_contact JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'each';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS quantity_available INTEGER DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS minimum_stock_level INTEGER DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS supplier_contact JSONB;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- material_usage ----------
CREATE TABLE IF NOT EXISTS public.material_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quantity_used DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  cost_code TEXT,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS quantity_used DECIMAL(10,2);
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2);
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2);
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS cost_code TEXT;
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS usage_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.material_usage ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- SECTION 4: Missing Tables (referenced in code, no migration)
-- ============================================================

-- ---------- financial_records ----------
-- Referenced by: analyticsEngine.ts, ImprovedBudgetDashboard.tsx,
--   ProjectHealthIndicators.tsx, generate-cash-flow-forecast edge function,
--   smart-procurement edge function, RealTimeProfitTracker.tsx
-- Columns used: id, project_id, company_id, type, record_type, amount,
--   cost_code_id, material_name, quantity, unit, description, category,
--   reference_number, date, created_by, created_at

CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'expense',
  record_type TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT,
  cost_code TEXT,
  cost_code_id UUID,
  reference_number TEXT,
  material_name TEXT,
  quantity DECIMAL(10,2),
  unit TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense';
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS record_type TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS cost_code TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS cost_code_id UUID;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS material_name TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2);
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- teams ----------
-- Referenced by: optimize-resources edge function
-- Columns used: id, company_id, name, skills

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  skills JSONB DEFAULT '[]',
  lead_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- push_subscriptions ----------
-- Referenced by: send-push-notification edge function
-- Columns used: id, user_id, subscription (JSONB with endpoint, keys)

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS subscription JSONB;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- project_team_assignments ----------
-- Referenced by: optimize-resources edge function
-- Columns used: id, company_id, project_id, team_id, start_date, end_date, role, status

CREATE TABLE IF NOT EXISTS public.project_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  role TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS team_id UUID;
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.project_team_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- financial_snapshots ----------
-- Referenced by: admin dashboards, phase5 sample data
-- Uses tenant_id (not company_id) per existing types.ts and sample data

CREATE TABLE IF NOT EXISTS public.financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  snapshot_date DATE NOT NULL,
  total_revenue DECIMAL(12,2),
  revenue_mtd DECIMAL(12,2),
  revenue_ytd DECIMAL(12,2),
  total_costs DECIMAL(12,2),
  labor_costs DECIMAL(12,2),
  material_costs DECIMAL(12,2),
  overhead_costs DECIMAL(12,2),
  gross_profit DECIMAL(12,2),
  net_profit DECIMAL(12,2),
  profit_margin DECIMAL(5,2),
  cash_on_hand DECIMAL(12,2),
  accounts_receivable DECIMAL(12,2),
  accounts_payable DECIMAL(12,2),
  active_projects_count INTEGER,
  completed_projects_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was pre-created with a different schema
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS snapshot_date DATE;
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS revenue_mtd DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS revenue_ytd DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS total_costs DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS labor_costs DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS material_costs DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS overhead_costs DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS gross_profit DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS net_profit DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS cash_on_hand DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS accounts_receivable DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS accounts_payable DECIMAL(12,2);
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS active_projects_count INTEGER;
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS completed_projects_count INTEGER;
ALTER TABLE public.financial_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- SECTION 5: Core Functions
-- ============================================================

-- ---------- get_user_role ----------
-- Used in 50+ RLS policies across the codebase
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.user_profiles WHERE id = user_id;
$$;

-- ---------- get_user_company ----------
-- Used in RLS policies to isolate data by company
CREATE OR REPLACE FUNCTION public.get_user_company(user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = user_id;
$$;

-- ---------- handle_new_user ----------
-- Auto-creates user_profiles row when auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'admin')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ---------- update_updated_at_column ----------
-- Standard timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 6: Enable RLS on all tables
-- ============================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 7: RLS Policies
-- ============================================================
-- Uses DO $$ blocks to skip creation if policy already exists.
-- Core tables use get_user_role()/get_user_company() since those
-- functions are guaranteed to exist (created in Section 5).
-- New tables use simpler auth.uid() checks where appropriate to
-- avoid potential recursion issues.

-- ---------- companies policies ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'bootstrap_companies_select_root_admin') THEN
    CREATE POLICY "bootstrap_companies_select_root_admin"
      ON public.companies FOR SELECT
      USING (public.get_user_role(auth.uid()) = 'root_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'bootstrap_companies_select_own') THEN
    CREATE POLICY "bootstrap_companies_select_own"
      ON public.companies FOR SELECT
      USING (id = public.get_user_company(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'bootstrap_companies_manage_root_admin') THEN
    CREATE POLICY "bootstrap_companies_manage_root_admin"
      ON public.companies FOR ALL
      USING (public.get_user_role(auth.uid()) = 'root_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'bootstrap_companies_update_admin') THEN
    CREATE POLICY "bootstrap_companies_update_admin"
      ON public.companies FOR UPDATE
      USING (
        id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('admin', 'root_admin')
      );
  END IF;
END $$;

-- ---------- user_profiles policies ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'bootstrap_user_profiles_select_own') THEN
    CREATE POLICY "bootstrap_user_profiles_select_own"
      ON public.user_profiles FOR SELECT
      USING (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'bootstrap_user_profiles_select_company') THEN
    CREATE POLICY "bootstrap_user_profiles_select_company"
      ON public.user_profiles FOR SELECT
      USING (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'bootstrap_user_profiles_update_own') THEN
    CREATE POLICY "bootstrap_user_profiles_update_own"
      ON public.user_profiles FOR UPDATE
      USING (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'bootstrap_user_profiles_manage_root_admin') THEN
    CREATE POLICY "bootstrap_user_profiles_manage_root_admin"
      ON public.user_profiles FOR ALL
      USING (public.get_user_role(auth.uid()) = 'root_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'bootstrap_user_profiles_manage_company_admin') THEN
    CREATE POLICY "bootstrap_user_profiles_manage_company_admin"
      ON public.user_profiles FOR ALL
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('admin', 'root_admin')
      );
  END IF;
END $$;

-- ---------- projects policies ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'bootstrap_projects_select_company') THEN
    CREATE POLICY "bootstrap_projects_select_company"
      ON public.projects FOR SELECT
      USING (
        company_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid()) = 'root_admin'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'bootstrap_projects_manage') THEN
    CREATE POLICY "bootstrap_projects_manage"
      ON public.projects FOR ALL
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
      );
  END IF;
END $$;

-- ---------- financial_records policies ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_records' AND policyname = 'bootstrap_financial_records_select') THEN
    CREATE POLICY "bootstrap_financial_records_select"
      ON public.financial_records FOR SELECT
      USING (
        company_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid()) = 'root_admin'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_records' AND policyname = 'bootstrap_financial_records_manage') THEN
    CREATE POLICY "bootstrap_financial_records_manage"
      ON public.financial_records FOR ALL
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('admin', 'accounting', 'root_admin')
      );
  END IF;
END $$;

-- ---------- teams policies ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'bootstrap_teams_select') THEN
    CREATE POLICY "bootstrap_teams_select"
      ON public.teams FOR SELECT
      USING (
        company_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid()) = 'root_admin'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'bootstrap_teams_manage') THEN
    CREATE POLICY "bootstrap_teams_manage"
      ON public.teams FOR ALL
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('admin', 'root_admin')
      );
  END IF;
END $$;

-- ---------- push_subscriptions policies ----------
-- Users can only manage their own push subscriptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'bootstrap_push_subscriptions_own') THEN
    CREATE POLICY "bootstrap_push_subscriptions_own"
      ON public.push_subscriptions FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ---------- project_team_assignments policies ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_team_assignments' AND policyname = 'bootstrap_project_team_assignments_select') THEN
    CREATE POLICY "bootstrap_project_team_assignments_select"
      ON public.project_team_assignments FOR SELECT
      USING (
        company_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid()) = 'root_admin'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_team_assignments' AND policyname = 'bootstrap_project_team_assignments_manage') THEN
    CREATE POLICY "bootstrap_project_team_assignments_manage"
      ON public.project_team_assignments FOR ALL
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
      );
  END IF;
END $$;

-- ---------- financial_snapshots policies ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_snapshots' AND policyname = 'bootstrap_financial_snapshots_select') THEN
    CREATE POLICY "bootstrap_financial_snapshots_select"
      ON public.financial_snapshots FOR SELECT
      USING (
        tenant_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid()) = 'root_admin'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_snapshots' AND policyname = 'bootstrap_financial_snapshots_manage') THEN
    CREATE POLICY "bootstrap_financial_snapshots_manage"
      ON public.financial_snapshots FOR ALL
      USING (
        tenant_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('admin', 'accounting', 'root_admin')
      );
  END IF;
END $$;

-- ============================================================
-- SECTION 8: Triggers
-- ============================================================

-- ---------- updated_at triggers ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_companies_updated_at') THEN
    CREATE TRIGGER bootstrap_update_companies_updated_at
      BEFORE UPDATE ON public.companies
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_user_profiles_updated_at') THEN
    CREATE TRIGGER bootstrap_update_user_profiles_updated_at
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_profiles_updated_at') THEN
    CREATE TRIGGER bootstrap_update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_projects_updated_at') THEN
    CREATE TRIGGER bootstrap_update_projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_time_entries_updated_at') THEN
    CREATE TRIGGER bootstrap_update_time_entries_updated_at
      BEFORE UPDATE ON public.time_entries
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_materials_updated_at') THEN
    CREATE TRIGGER bootstrap_update_materials_updated_at
      BEFORE UPDATE ON public.materials
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_financial_records_updated_at') THEN
    CREATE TRIGGER bootstrap_update_financial_records_updated_at
      BEFORE UPDATE ON public.financial_records
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_teams_updated_at') THEN
    CREATE TRIGGER bootstrap_update_teams_updated_at
      BEFORE UPDATE ON public.teams
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_push_subscriptions_updated_at') THEN
    CREATE TRIGGER bootstrap_update_push_subscriptions_updated_at
      BEFORE UPDATE ON public.push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bootstrap_update_project_team_assignments_updated_at') THEN
    CREATE TRIGGER bootstrap_update_project_team_assignments_updated_at
      BEFORE UPDATE ON public.project_team_assignments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ---------- auth trigger for new user signup ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ============================================================
-- SECTION 9: Indexes
-- ============================================================

-- user_profiles indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_user_profiles_email ON public.user_profiles(email);

-- profiles indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_profiles_company_id ON public.profiles(company_id);

-- projects indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_projects_status ON public.projects(status);

-- project_assignments indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_project_assignments_project_id ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_project_assignments_user_id ON public.project_assignments(user_id);

-- time_entries indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_time_entries_clock_in_time ON public.time_entries(clock_in_time);

-- materials indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_materials_company_id ON public.materials(company_id);

-- material_usage indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_material_usage_project_id ON public.material_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_material_usage_material_id ON public.material_usage(material_id);

-- financial_records indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_financial_records_company_id ON public.financial_records(company_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_financial_records_project_id ON public.financial_records(project_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_financial_records_company_date ON public.financial_records(company_id, date);
CREATE INDEX IF NOT EXISTS idx_bootstrap_financial_records_type ON public.financial_records(type);

-- teams indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_teams_company_id ON public.teams(company_id);

-- push_subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- project_team_assignments indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_project_team_assignments_company_id ON public.project_team_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_project_team_assignments_project_id ON public.project_team_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_project_team_assignments_team_id ON public.project_team_assignments(team_id);

-- financial_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_financial_snapshots_tenant_id ON public.financial_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bootstrap_financial_snapshots_date ON public.financial_snapshots(snapshot_date);

-- ============================================================
-- DONE
-- ============================================================
-- Verification queries (run manually after applying):
--
-- 1. Check core tables exist:
--    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--    AND tablename IN ('companies', 'user_profiles', 'profiles', 'projects',
--      'financial_records', 'teams', 'push_subscriptions',
--      'project_team_assignments', 'financial_snapshots');
--
-- 2. Check functions exist:
--    SELECT proname FROM pg_proc WHERE proname IN
--      ('get_user_role', 'get_user_company', 'handle_new_user', 'update_updated_at_column');
--
-- 3. Check RLS is enabled:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' AND rowsecurity = true;
--
-- 4. Test signup: create a new user via Supabase Auth and verify
--    a user_profiles row is automatically created.
--
-- 5. Test functions:
--    SELECT public.get_user_role('<user-uuid>');
--    SELECT public.get_user_company('<user-uuid>');
