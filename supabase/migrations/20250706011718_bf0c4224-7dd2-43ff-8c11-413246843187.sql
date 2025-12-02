-- Add GPS coordinates to projects table for geofencing
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS site_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS site_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100;

-- Add GPS coordinates to time entries for precise tracking
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS gps_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS gps_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC;

-- Add comments for clarity
COMMENT ON COLUMN public.projects.site_latitude IS 'Latitude coordinate of job site for geofencing';
COMMENT ON COLUMN public.projects.site_longitude IS 'Longitude coordinate of job site for geofencing';
COMMENT ON COLUMN public.projects.geofence_radius_meters IS 'Allowed distance from job site in meters for time tracking';

COMMENT ON COLUMN public.time_entries.gps_latitude IS 'GPS latitude where time entry was recorded';
COMMENT ON COLUMN public.time_entries.gps_longitude IS 'GPS longitude where time entry was recorded';
COMMENT ON COLUMN public.time_entries.location_accuracy IS 'GPS accuracy in meters when location was recorded';