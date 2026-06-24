-- Temporarily disable RLS on user_profiles to test
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Also let's make sure the role enum includes 'admin'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal');
    END IF;
END $$;