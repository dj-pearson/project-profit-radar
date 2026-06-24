-- Create root admin user manually
-- First, let's insert directly into auth.users (this is for emergency admin creation)
-- Note: This should normally be done through the auth system, but for initial setup we'll create the profile directly

-- Insert the root admin profile directly (assuming the auth user will be created via signup)
INSERT INTO public.user_profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active
) VALUES (
  'a0000000-0000-0000-0000-000000000000'::uuid,  -- Temporary ID that will be updated
  'Pearsonperformance@gmail.com',
  'Dan',
  'Pearson', 
  'root_admin'::user_role,
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'root_admin'::user_role,
  first_name = 'Dan',
  last_name = 'Pearson',
  is_active = true;