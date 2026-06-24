-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM (
  'root_admin',
  'admin', 
  'project_manager',
  'field_supervisor', 
  'office_staff',
  'accounting',
  'client_portal'
);

-- Create enum for subscription tiers
CREATE TYPE public.subscription_tier AS ENUM (
  'starter',
  'professional', 
  'enterprise'
);

-- Create enum for industry types
CREATE TYPE public.industry_type AS ENUM (
  'residential',
  'commercial', 
  'civil_infrastructure',
  'specialty_trades'
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  license_numbers TEXT[],
  industry_type industry_type,
  company_size TEXT,
  annual_revenue_range TEXT,
  subscription_tier subscription_tier DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trial',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_end_date TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  status TEXT DEFAULT 'planning',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_profiles WHERE id = user_id;
$$;

-- Create security definer function to get user company
CREATE OR REPLACE FUNCTION public.get_user_company(user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = user_id;
$$;

-- RLS Policies for companies
CREATE POLICY "Root admins can view all companies" 
ON public.companies FOR SELECT 
USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Users can view their own company" 
ON public.companies FOR SELECT 
USING (id = public.get_user_company(auth.uid()));

CREATE POLICY "Root admins can manage all companies" 
ON public.companies FOR ALL 
USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can update their company" 
ON public.companies FOR UPDATE 
USING (id = public.get_user_company(auth.uid()) AND public.get_user_role(auth.uid()) IN ('admin', 'root_admin'));

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can view company members" 
ON public.user_profiles FOR SELECT 
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Root admins can manage all profiles" 
ON public.user_profiles FOR ALL 
USING (public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage company users" 
ON public.user_profiles FOR ALL 
USING (company_id = public.get_user_company(auth.uid()) AND public.get_user_role(auth.uid()) IN ('admin', 'root_admin'));

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles FOR UPDATE 
USING (id = auth.uid());

-- RLS Policies for projects
CREATE POLICY "Users can view company projects" 
ON public.projects FOR SELECT 
USING (company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Project managers and admins can manage projects" 
ON public.projects FOR ALL 
USING (
  company_id = public.get_user_company(auth.uid()) 
  AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin')
);

-- Create function to handle new user signup
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
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'admin')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();