-- Insert demo data for construction management platform

-- First, let's get or create a demo company (assuming user has company_id from their profile)
-- This script assumes the user already has a company - we'll add data to their existing company

-- Insert demo projects
INSERT INTO projects (
  id, company_id, name, description, status, start_date, end_date, 
  budget, client_name, client_email, address, project_manager_id, created_at
) VALUES 
(
  gen_random_uuid(),
  (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1),
  'Luxury Kitchen Remodel - Smith Residence',
  'Complete kitchen renovation including custom cabinets, granite countertops, hardwood flooring, and electrical upgrades. High-end appliance installation and designer lighting.',
  'in_progress',
  '2024-06-01',
  '2024-08-15',
  85000.00,
  'Robert & Sarah Smith',
  'rsmith@email.com',
  '1425 Oak Ridge Drive, Beverly Hills, CA 90210',
  auth.uid(),
  '2024-06-01 08:00:00+00'
),
(
  gen_random_uuid(),
  (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1),
  'Downtown Office Building Renovation',
  'Corporate office space renovation including conference rooms, open workspace design, modern lighting, HVAC upgrades, and technology infrastructure.',
  'active',
  '2024-07-01',
  '2024-10-30',
  425000.00,
  'TechCorp Industries',
  'facilities@techcorp.com',
  '2500 Business Center Drive, Los Angeles, CA 90017',
  auth.uid(),
  '2024-07-01 09:00:00+00'
),
(
  gen_random_uuid(),
  (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1),
  'Retail Store Front Expansion',
  'Expansion of existing retail space including new storefront, interior design updates, electrical work, and security system installation.',
  'planning',
  '2024-08-15',
  '2024-11-01',
  125000.00,
  'Sunset Boutique',
  'owner@sunsetboutique.com',
  '8899 Sunset Boulevard, West Hollywood, CA 90069',
  auth.uid(),
  '2024-07-15 10:00:00+00'
),
(
  gen_random_uuid(),
  (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1),
  'Custom Home Build - Mountain View Estate',
  'New construction of 4,500 sq ft custom home with smart home technology, luxury finishes, pool, and landscaping.',
  'completed',
  '2024-01-15',
  '2024-06-30',
  750000.00,
  'James & Lisa Johnson',
  'ljohnson@email.com',
  '15 Mountain View Circle, Malibu, CA 90265',
  auth.uid(),
  '2024-01-15 08:00:00+00'
);

-- Insert cost codes for the company
INSERT INTO cost_codes (company_id, code, name, description, category) VALUES
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '01-100', 'Site Preparation', 'Excavation, grading, and site preparation work', 'Site Work'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '03-300', 'Concrete Work', 'Foundations, slabs, and concrete structures', 'Concrete'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '06-100', 'Rough Carpentry', 'Framing, sheathing, and structural carpentry', 'Carpentry'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '06-200', 'Finish Carpentry', 'Trim, cabinets, and finish work', 'Carpentry'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '07-200', 'Insulation', 'Thermal and acoustic insulation', 'Insulation'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '09-300', 'Tile Work', 'Ceramic, stone, and tile installation', 'Finishes'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '09-900', 'Painting', 'Interior and exterior painting', 'Finishes'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '16-100', 'Electrical', 'Electrical systems and fixtures', 'Electrical'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '22-100', 'Plumbing', 'Plumbing systems and fixtures', 'Plumbing'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '23-100', 'HVAC', 'Heating, ventilation, and air conditioning', 'HVAC');

-- Insert materials
INSERT INTO materials (company_id, name, description, unit, current_stock, minimum_stock, unit_cost, supplier_name, supplier_contact, category, sku) VALUES
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '2x4 Lumber - 8ft', 'Premium grade Douglas Fir framing lumber', 'piece', 150, 50, 8.50, 'Pacific Lumber Supply', '(555) 123-4567', 'Lumber', 'LUM-2X4-8'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), '2x6 Lumber - 10ft', 'Premium grade Douglas Fir framing lumber', 'piece', 75, 25, 15.25, 'Pacific Lumber Supply', '(555) 123-4567', 'Lumber', 'LUM-2X6-10'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Granite Countertop - Kashmir White', 'Premium granite slab, polished finish', 'sq ft', 85, 20, 65.00, 'Stone Masters Inc', '(555) 987-6543', 'Stone', 'GRN-KAS-WHT'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Ceramic Floor Tile 12x12', 'Porcelain ceramic tile, various colors', 'sq ft', 500, 100, 4.25, 'Tile World', '(555) 246-8135', 'Tile', 'CER-12X12'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Drywall 1/2" - 4x8', 'Standard gypsum drywall sheets', 'sheet', 200, 50, 12.75, 'Builder Supply Co', '(555) 369-2580', 'Drywall', 'DRY-12-4X8'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Premium Paint - Interior', 'Zero VOC premium interior paint', 'gallon', 45, 10, 42.50, 'Pro Paint Supply', '(555) 159-7531', 'Paint', 'PNT-INT-PREM'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Hardwood Flooring - Oak', 'Solid red oak hardwood flooring', 'sq ft', 800, 200, 8.95, 'Hardwood Depot', '(555) 753-9514', 'Flooring', 'HW-OAK-SOL'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'LED Recessed Lights', 'Energy efficient LED downlights', 'fixture', 50, 15, 35.00, 'Electric Supply House', '(555) 852-7419', 'Electrical', 'LED-REC-6'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'PVC Pipe - 1/2 inch', 'Schedule 40 PVC plumbing pipe', 'linear ft', 300, 75, 1.85, 'Plumbing Supply Pro', '(555) 741-9630', 'Plumbing', 'PVC-12-S40'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Concrete Mix - 80lb', 'High strength concrete mix bags', 'bag', 125, 30, 4.50, 'Concrete Direct', '(555) 963-8520', 'Concrete', 'CON-80-HS');

-- Insert equipment
INSERT INTO equipment (company_id, name, description, equipment_type, model, serial_number, purchase_date, purchase_cost, current_value, status, location, maintenance_schedule, next_maintenance_date, created_by) VALUES
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Bobcat S570 Skid Steer', 'Compact skid steer loader for material handling', 'Heavy Equipment', 'S570', 'ABDC123456789', '2023-03-15', 42000.00, 38000.00, 'available', 'Main Yard', 'Every 250 hours', '2024-08-15', auth.uid()),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'DeWalt Chop Saw', 'Professional grade miter saw for precise cuts', 'Power Tools', 'DWS780', 'DW78012345', '2024-01-20', 650.00, 600.00, 'in_use', 'Smith Kitchen Project', 'Monthly', '2024-08-01', auth.uid()),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Ford F-350 Work Truck', 'Heavy duty pickup truck with tool storage', 'Vehicles', 'F-350 Super Duty', '1FT8W3BT8XEC12345', '2022-08-10', 55000.00, 48000.00, 'available', 'Main Office', 'Every 5,000 miles', '2024-08-20', auth.uid()),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Hilti Hammer Drill', 'Cordless rotary hammer drill', 'Power Tools', 'TE 7-A36', 'HT36789012', '2024-02-14', 420.00, 390.00, 'available', 'Tool Room', 'Quarterly', '2024-09-01', auth.uid()),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Werner Extension Ladder', '32-foot aluminum extension ladder', 'Ladders', 'D6232-2', 'WR32145678', '2023-09-05', 385.00, 340.00, 'available', 'Main Yard', 'Every 6 months', '2024-09-05', auth.uid()),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Makita Table Saw', 'Professional cabinet table saw', 'Power Tools', '2705X1', 'MK27056789', '2023-11-20', 1250.00, 1100.00, 'in_use', 'Downtown Office Project', 'Bi-weekly', '2024-07-25', auth.uid()),
((SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1), 'Air Compressor - Portable', '6-gallon portable air compressor', 'Air Tools', 'PC1TG', 'AC6G789123', '2024-04-10', 180.00, 170.00, 'available', 'Tool Room', 'Monthly', '2024-08-10', auth.uid());

-- Insert time tracking entries (last 30 days)
INSERT INTO time_entries (employee_id, project_id, cost_code_id, hours_worked, hourly_rate, description, date, created_by) 
SELECT 
  auth.uid(),
  p.id,
  cc.id,
  (ARRAY[6.5, 7.0, 7.5, 8.0, 8.5])[floor(random() * 5 + 1)],
  (ARRAY[25.00, 28.00, 32.00, 35.00])[floor(random() * 4 + 1)],
  (ARRAY[
    'Framing work on main structure',
    'Installing electrical rough-in',
    'Plumbing installation',
    'Drywall installation and taping',
    'Painting and finish work',
    'Tile installation in bathroom',
    'Cabinet installation',
    'Flooring installation',
    'Site cleanup and preparation',
    'Quality inspection and touch-ups'
  ])[floor(random() * 10 + 1)],
  CURRENT_DATE - (interval '1 day' * generate_series(1, 25)),
  auth.uid()
FROM 
  projects p,
  cost_codes cc
WHERE 
  p.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND cc.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.status IN ('active', 'in_progress')
ORDER BY random()
LIMIT 75;

-- Insert daily reports
INSERT INTO daily_reports (project_id, date, crew_count, weather_conditions, work_performed, materials_delivered, equipment_used, delays_issues, safety_incidents, created_by)
SELECT 
  p.id,
  CURRENT_DATE - (interval '1 day' * generate_series(1, 15)),
  (ARRAY[3, 4, 5, 6])[floor(random() * 4 + 1)],
  (ARRAY['Clear and sunny', 'Partly cloudy', 'Overcast', 'Light rain (work continued)', 'Sunny with light breeze'])[floor(random() * 5 + 1)],
  (ARRAY[
    'Completed framing for north wall, installed electrical conduit',
    'Poured concrete for foundation section B, began waterproofing',
    'Installed drywall in bedrooms 1-3, completed taping',
    'Cabinet installation 75% complete, plumbing rough-in finished',
    'Tile work progressing in master bathroom, grouting completed',
    'Hardwood flooring installation in living areas',
    'Painting prep work and primer application',
    'HVAC ductwork installation, electrical final connections',
    'Site cleanup, material organization, safety walk-through',
    'Quality control inspection, punch list items addressed'
  ])[floor(random() * 10 + 1)],
  (ARRAY[
    'Lumber delivery (2x4s, 2x6s), drywall sheets',
    'Granite countertops, cabinet hardware',
    'Electrical fixtures, switch plates',
    'Tile delivery, grout, and adhesive',
    'Paint supplies, brushes, and rollers',
    'Plumbing fixtures, PVC fittings',
    'Concrete bags, rebar reinforcement',
    'Insulation materials, vapor barrier',
    'Hardwood flooring, underlayment',
    'No deliveries today'
  ])[floor(random() * 10 + 1)],
  (ARRAY[
    'Bobcat skid steer, miter saw, hammer drill',
    'Table saw, air compressor, extension ladder',
    'Work truck for material transport',
    'Hammer drill, various hand tools',
    'Miter saw, air compressor for nail guns',
    'Extension ladder, hand tools only',
    'Skid steer for material moving',
    'Full tool complement including power tools',
    'Work truck, portable air compressor',
    'Hand tools only, minimal equipment day'
  ])[floor(random() * 10 + 1)],
  (ARRAY[
    'None - work progressed on schedule',
    'Material delivery delayed by 2 hours',
    'Rain delay in morning, resumed after lunch',
    'Inspection scheduled for tomorrow',
    'Waiting on permit approval for electrical',
    'None - excellent progress today',
    'Client requested minor design change',
    'Supply chain delay on specialty fixtures',
    'None - all systems go',
    'Traffic delayed crew arrival by 30 minutes'
  ])[floor(random() * 10 + 1)],
  (ARRAY[
    'No incidents - good safety day',
    'None reported',
    'Minor cut on hand - first aid applied',
    'No incidents - safety meeting held',
    'None - excellent safety record continues',
    'No incidents reported',
    'Toolbox safety talk completed',
    'No incidents - safety protocols followed',
    'None - crew following all safety procedures',
    'No incidents or near misses'
  ])[floor(random() * 10 + 1)],
  auth.uid()
FROM projects p
WHERE p.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.status IN ('active', 'in_progress')
ORDER BY random()
LIMIT 45;

-- Insert material usage records
INSERT INTO material_usage (material_id, project_id, quantity_used, unit_cost, total_cost, date_used, used_by, notes)
SELECT 
  m.id,
  p.id,
  (random() * 50 + 5)::numeric(10,2),
  m.unit_cost,
  ((random() * 50 + 5) * m.unit_cost)::numeric(10,2),
  CURRENT_DATE - (interval '1 day' * floor(random() * 30)),
  auth.uid(),
  (ARRAY[
    'Used for main construction phase',
    'Kitchen renovation materials',
    'Bathroom installation project',
    'Living room upgrade work',
    'General construction use',
    'Emergency repair materials',
    'Scheduled maintenance work',
    'Quality upgrade request',
    'Code compliance update',
    'Client change order materials'
  ])[floor(random() * 10 + 1)]
FROM 
  materials m,
  projects p
WHERE 
  m.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.status IN ('active', 'in_progress')
ORDER BY random()
LIMIT 50;

-- Insert equipment usage records
INSERT INTO equipment_usage (equipment_id, project_id, start_date, end_date, hours_used, hourly_rate, total_cost, operator_id, notes)
SELECT 
  e.id,
  p.id,
  CURRENT_DATE - (interval '1 day' * floor(random() * 20)),
  CURRENT_DATE - (interval '1 day' * floor(random() * 15)),
  (random() * 8 + 1)::numeric(10,2),
  (ARRAY[45.00, 50.00, 55.00, 35.00, 25.00])[floor(random() * 5 + 1)],
  ((random() * 8 + 1) * (ARRAY[45.00, 50.00, 55.00, 35.00, 25.00])[floor(random() * 5 + 1)])::numeric(10,2),
  auth.uid(),
  (ARRAY[
    'Site preparation and excavation',
    'Material handling and transport',
    'Demolition work completed',
    'Finish work and detail cuts',
    'General construction support',
    'Emergency repair work',
    'Scheduled project maintenance',
    'Heavy lifting and positioning',
    'Precision cutting operations',
    'Site cleanup and organization'
  ])[floor(random() * 10 + 1)]
FROM 
  equipment e,
  projects p
WHERE 
  e.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.status IN ('active', 'in_progress', 'completed')
ORDER BY random()
LIMIT 30;

-- Insert job costs tracking
INSERT INTO job_costs (project_id, cost_code_id, date, labor_cost, material_cost, equipment_cost, other_cost, labor_hours, description, created_by)
SELECT 
  p.id,
  cc.id,
  CURRENT_DATE - (interval '1 day' * floor(random() * 25)),
  (random() * 2000 + 500)::numeric(10,2),
  (random() * 1500 + 200)::numeric(10,2),
  (random() * 800 + 100)::numeric(10,2),
  (random() * 300 + 50)::numeric(10,2),
  (random() * 40 + 8)::numeric(10,2),
  (ARRAY[
    'Daily construction progress costs',
    'Material installation and labor',
    'Equipment operation and maintenance',
    'Subcontractor coordination costs',
    'Quality control and inspection',
    'Site preparation and cleanup',
    'Specialized installation work',
    'Emergency repair costs',
    'Client change order work',
    'Permit and inspection fees'
  ])[floor(random() * 10 + 1)],
  auth.uid()
FROM 
  projects p,
  cost_codes cc
WHERE 
  p.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND cc.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.status IN ('active', 'in_progress', 'completed')
ORDER BY random()
LIMIT 60;

-- Update projects with calculated totals (simplified)
UPDATE projects 
SET updated_at = now()
WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1);

-- Insert some change orders
INSERT INTO change_orders (project_id, change_order_number, title, description, amount, reason, status, client_approved, internal_approved, created_by)
SELECT 
  p.id,
  'CO-' || LPAD((row_number() OVER ())::text, 4, '0'),
  (ARRAY[
    'Kitchen Island Design Change',
    'Additional Electrical Outlets',
    'Upgraded Bathroom Fixtures',
    'Hardwood Floor Extension',
    'Enhanced Security System',
    'Additional Insulation Upgrade',
    'Premium Paint Upgrade',
    'Extra Recessed Lighting',
    'Upgraded HVAC System',
    'Additional Storage Solutions'
  ])[floor(random() * 10 + 1)],
  (ARRAY[
    'Client requested larger kitchen island with additional storage and seating area',
    'Addition of 6 more electrical outlets in living areas for enhanced functionality',
    'Upgrade to premium fixtures in master bathroom including rainfall shower head',
    'Extend hardwood flooring to include hallway and bedroom areas',
    'Installation of comprehensive security system with cameras and smart locks',
    'Add premium insulation package for better energy efficiency',
    'Upgrade to zero-VOC premium paint throughout interior spaces',
    'Installation of additional recessed lighting in kitchen and dining areas',
    'Upgrade HVAC system to high-efficiency variable speed unit',
    'Custom built-in storage solutions in master bedroom closet'
  ])[floor(random() * 10 + 1)],
  (random() * 15000 + 2000)::numeric(10,2),
  (ARRAY[
    'Client requested upgrade',
    'Code compliance requirement',
    'Design improvement',
    'Functionality enhancement',
    'Quality upgrade',
    'Energy efficiency improvement',
    'Safety enhancement',
    'Aesthetic improvement',
    'Future-proofing',
    'Maintenance reduction'
  ])[floor(random() * 10 + 1)],
  (ARRAY['pending', 'approved', 'in_progress'])[floor(random() * 3 + 1)],
  (random() > 0.5),
  true,
  auth.uid()
FROM projects p
WHERE p.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1)
  AND p.status IN ('active', 'in_progress')
ORDER BY random()
LIMIT 8;