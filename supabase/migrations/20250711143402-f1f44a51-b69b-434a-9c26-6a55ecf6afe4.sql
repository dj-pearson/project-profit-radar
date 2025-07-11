-- Add foreign key relationship between subscribers and user_profiles
-- First, let's ensure the subscribers table has the user_id column properly set up
-- and add a foreign key to user_profiles

-- Add foreign key constraint from subscribers.user_id to user_profiles.id
ALTER TABLE public.subscribers 
ADD CONSTRAINT fk_subscribers_user_profiles 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Create index for better performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);