-- Fix the next_generation_at calculation for blog auto generation
UPDATE blog_auto_generation_settings 
SET next_generation_at = CASE 
  WHEN generation_frequency = 'daily' THEN 
    (CURRENT_DATE + INTERVAL '1 day' + generation_time::time)::timestamp with time zone AT TIME ZONE generation_timezone AT TIME ZONE 'UTC'
  WHEN generation_frequency = 'weekly' THEN 
    (CURRENT_DATE + INTERVAL '7 days' + generation_time::time)::timestamp with time zone AT TIME ZONE generation_timezone AT TIME ZONE 'UTC'
  WHEN generation_frequency = 'monthly' THEN 
    (CURRENT_DATE + INTERVAL '1 month' + generation_time::time)::timestamp with time zone AT TIME ZONE generation_timezone AT TIME ZONE 'UTC'
  ELSE 
    (CURRENT_DATE + INTERVAL '1 day' + generation_time::time)::timestamp with time zone AT TIME ZONE generation_timezone AT TIME ZONE 'UTC'
END,
updated_at = NOW()
WHERE company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af';