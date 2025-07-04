-- Insert sample time tracking, daily reports, and change orders with correct column names
-- First get project and cost code IDs
WITH project_data AS (
  SELECT id as project_id, name FROM projects WHERE company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af' LIMIT 2
),
cost_code_data AS (
  SELECT id as cost_code_id FROM cost_codes WHERE company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af' LIMIT 1
)

-- Insert time tracking entries
INSERT INTO time_entries (user_id, project_id, cost_code_id, start_time, end_time, total_hours, description)
SELECT 
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
  pd.project_id,
  cc.cost_code_id,
  (CURRENT_DATE - INTERVAL '1 day' * s.day_offset + INTERVAL '8 hours'),
  (CURRENT_DATE - INTERVAL '1 day' * s.day_offset + INTERVAL '16 hours'),
  8.0,
  'Construction work on ' || pd.name
FROM 
  project_data pd,
  cost_code_data cc,
  generate_series(1, 10) s(day_offset);

-- Insert daily reports
INSERT INTO daily_reports (project_id, date, crew_count, weather_conditions, work_performed, materials_delivered, equipment_used, delays_issues, safety_incidents, created_by)
SELECT 
  pd.project_id,
  CURRENT_DATE - INTERVAL '1 day' * s.day_offset,
  4,
  'Clear and sunny',
  'Made excellent progress on framing and electrical work',
  'Lumber and electrical supplies delivered',
  'Bobcat skid steer, various power tools',
  'No delays today',
  'No incidents - safety protocols followed',
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
FROM 
  project_data pd,
  generate_series(1, 5) s(day_offset);

-- Insert change orders
INSERT INTO change_orders (project_id, change_order_number, title, description, amount, reason, status, client_approved, internal_approved, created_by)
SELECT 
  pd.project_id,
  'CO-000' || s.order_num,
  CASE s.order_num 
    WHEN 1 THEN 'Kitchen Island Upgrade'
    WHEN 2 THEN 'Additional Electrical Outlets'
    ELSE 'Upgraded Fixtures'
  END,
  CASE s.order_num 
    WHEN 1 THEN 'Client requested larger kitchen island with additional storage'
    WHEN 2 THEN 'Additional electrical outlets for improved functionality'
    ELSE 'Upgrade to premium fixtures as requested'
  END,
  CASE s.order_num 
    WHEN 1 THEN 8500.00
    WHEN 2 THEN 2400.00
    ELSE 3200.00
  END,
  'Client requested upgrade',
  CASE s.order_num 
    WHEN 1 THEN 'approved'
    WHEN 2 THEN 'pending'
    ELSE 'in_progress'
  END,
  CASE s.order_num WHEN 1 THEN true ELSE false END,
  true,
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
FROM 
  project_data pd,
  generate_series(1, 2) s(order_num)
WHERE s.order_num <= 2;