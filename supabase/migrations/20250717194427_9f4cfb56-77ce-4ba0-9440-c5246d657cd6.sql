-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dashboard Customization
  dashboard_layout JSONB DEFAULT '{"widgets": [], "defaultView": "overview"}'::jsonb,
  favorite_shortcuts JSONB DEFAULT '[]'::jsonb,
  
  -- Notification Preferences
  email_notifications JSONB DEFAULT '{
    "task_due": true,
    "project_updates": true,
    "team_mentions": true,
    "daily_digest": false,
    "weekly_summary": true
  }'::jsonb,
  sms_notifications JSONB DEFAULT '{
    "urgent_tasks": false,
    "project_alerts": false,
    "safety_incidents": true
  }'::jsonb,
  in_app_notifications JSONB DEFAULT '{
    "task_assignments": true,
    "comments": true,
    "mentions": true,
    "system_updates": true
  }'::jsonb,
  
  -- Time Zone & Working Hours
  time_zone TEXT DEFAULT 'America/New_York',
  working_hours JSONB DEFAULT '{
    "monday": {"start": "08:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "08:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "08:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "08:00", "end": "17:00", "enabled": true},
    "friday": {"start": "08:00", "end": "17:00", "enabled": true},
    "saturday": {"start": "08:00", "end": "12:00", "enabled": false},
    "sunday": {"start": "08:00", "end": "12:00", "enabled": false}
  }'::jsonb,
  
  -- Mobile App Preferences
  mobile_preferences JSONB DEFAULT '{
    "offline_sync": true,
    "photo_quality": "high",
    "gps_tracking": true,
    "auto_backup": true,
    "cellular_sync": false
  }'::jsonb,
  
  -- Language & Accessibility
  language TEXT DEFAULT 'en',
  accessibility_preferences JSONB DEFAULT '{
    "font_size": "medium",
    "high_contrast": false,
    "reduce_motion": false,
    "screen_reader": false,
    "keyboard_navigation": false
  }'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one preferences record per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Root admins can manage all preferences for support purposes
CREATE POLICY "Root admins can manage all preferences" 
ON public.user_preferences 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin');

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();