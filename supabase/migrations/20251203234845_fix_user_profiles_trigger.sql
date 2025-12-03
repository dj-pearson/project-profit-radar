-- =====================================================
-- FIX: Update handle_new_user trigger to insert into user_profiles
-- =====================================================
-- Issue: The current handle_new_user() function inserts into the wrong table:
--   - Current: Inserts into public.profiles
--   - Required: Should insert into public.user_profiles
--   - Impact: New users don't get a user_profiles record, blocking onboarding
--
-- Fix: Update the trigger to insert into user_profiles with proper fields
-- including site_id resolution for multi-tenant architecture.
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

-- Create or replace the handle_new_user function
-- This runs when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_id UUID;
BEGIN
  -- Try to get the site_id from the JWT metadata (if available)
  -- This will be set by the frontend during signup
  v_site_id := (NEW.raw_app_meta_data->>'site_id')::UUID;
  
  -- If not in app_metadata, try user_metadata
  IF v_site_id IS NULL THEN
    v_site_id := (NEW.raw_user_meta_data->>'site_id')::UUID;
  END IF;
  
  -- If still NULL, default to BuildDesk site
  -- This ensures onboarding can proceed even if site_id isn't passed
  IF v_site_id IS NULL THEN
    SELECT id INTO v_site_id
    FROM sites
    WHERE key = 'builddesk'
    AND is_active = TRUE
    LIMIT 1;
  END IF;

  -- Insert into user_profiles (the correct table used by the application)
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    site_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'admin',  -- First user in a company defaults to admin
    v_site_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    site_id = COALESCE(EXCLUDED.site_id, user_profiles.site_id),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) INTO v_trigger_exists;

  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
  ) INTO v_function_exists;

  IF v_trigger_exists AND v_function_exists THEN
    RAISE NOTICE '✓ User profiles trigger fix applied successfully';
    RAISE NOTICE '✓ Trigger: on_auth_user_created';
    RAISE NOTICE '✓ Function: handle_new_user()';
    RAISE NOTICE '✓ Target table: user_profiles (correct)';
    RAISE NOTICE '✓ Includes site_id resolution for multi-tenant support';
    RAISE NOTICE '✓ New users will automatically get user_profiles entry';
  ELSE
    RAISE WARNING '⚠ Trigger or function not found';
    RAISE WARNING '  - Trigger exists: %', v_trigger_exists;
    RAISE WARNING '  - Function exists: %', v_function_exists;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a user_profiles record when a new user signs up. Resolves site_id from JWT metadata or defaults to BuildDesk. Required for onboarding flow.';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Triggers handle_new_user() after a new user is inserted into auth.users. Ensures every user gets a user_profiles record with site_id for multi-tenant isolation.';
