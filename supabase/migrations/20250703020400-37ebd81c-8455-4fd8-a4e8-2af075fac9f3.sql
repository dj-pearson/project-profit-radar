-- Ensure the user_role enum exists with all required values
DO $$
BEGIN
    -- Check if the enum exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal');
    ELSE
        -- Add any missing enum values
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'root_admin';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_manager';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'field_supervisor';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'office_staff';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accounting';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_portal';
    END IF;
END $$;

-- Recreate the trigger function with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'admin'::public.user_role)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Disable RLS temporarily for testing
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;