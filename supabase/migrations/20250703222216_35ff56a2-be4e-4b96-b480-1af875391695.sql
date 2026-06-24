-- Insert comprehensive demo data using existing company
DO $$
DECLARE
    demo_company_id UUID := 'fcfd2e31-637b-466b-b533-df70f7f1b3af';
    demo_user_id UUID := '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19';
    project1_id UUID := gen_random_uuid();
    project2_id UUID := gen_random_uuid();
    project3_id UUID := gen_random_uuid();
    project4_id UUID := gen_random_uuid();
    cc1_id UUID := gen_random_uuid();
    cc2_id UUID := gen_random_uuid();
    cc3_id UUID := gen_random_uuid();
BEGIN

-- Insert demo projects
INSERT INTO projects (
    id, company_id, name, description, status, start_date, end_date, 
    budget, client_name, client_email, site_address, project_manager_id, created_at
) VALUES 
(
    project1_id,
    demo_company_id,
    'Luxury Kitchen Remodel - Smith Residence',
    'Complete kitchen renovation including custom cabinets, granite countertops, hardwood flooring, and electrical upgrades. High-end appliance installation and designer lighting.',
    'in_progress',
    '2024-06-01',
    '2024-08-15',
    85000.00,
    'Robert & Sarah Smith',
    'rsmith@email.com',
    '1425 Oak Ridge Drive, Beverly Hills, CA 90210',
    demo_user_id,
    '2024-06-01 08:00:00+00'
),
(
    project2_id,
    demo_company_id,
    'Downtown Office Building Renovation',
    'Corporate office space renovation including conference rooms, open workspace design, modern lighting, HVAC upgrades, and technology infrastructure.',
    'active',
    '2024-07-01',
    '2024-10-30',
    425000.00,
    'TechCorp Industries',
    'facilities@techcorp.com',
    '2500 Business Center Drive, Los Angeles, CA 90017',
    demo_user_id,
    '2024-07-01 09:00:00+00'
),
(
    project3_id,
    demo_company_id,
    'Retail Store Front Expansion',
    'Expansion of existing retail space including new storefront, interior design updates, electrical work, and security system installation.',
    'planning',
    '2024-08-15',
    '2024-11-01',
    125000.00,
    'Sunset Boutique',
    'owner@sunsetboutique.com',
    '8899 Sunset Boulevard, West Hollywood, CA 90069',
    demo_user_id,
    '2024-07-15 10:00:00+00'
),
(
    project4_id,
    demo_company_id,
    'Custom Home Build - Mountain View Estate',
    'New construction of 4,500 sq ft custom home with smart home technology, luxury finishes, pool, and landscaping.',
    'completed',
    '2024-01-15',
    '2024-06-30',
    750000.00,
    'James & Lisa Johnson',
    'ljohnson@email.com',
    '15 Mountain View Circle, Malibu, CA 90265',
    demo_user_id,
    '2024-01-15 08:00:00+00'
);

-- Insert cost codes
INSERT INTO cost_codes (id, company_id, code, name, description, category) VALUES
(cc1_id, demo_company_id, '01-100', 'Site Preparation', 'Excavation, grading, and site preparation work', 'Site Work'),
(cc2_id, demo_company_id, '06-100', 'Rough Carpentry', 'Framing, sheathing, and structural carpentry', 'Carpentry'),
(cc3_id, demo_company_id, '16-100', 'Electrical', 'Electrical systems and fixtures', 'Electrical'),
(gen_random_uuid(), demo_company_id, '03-300', 'Concrete Work', 'Foundations, slabs, and concrete structures', 'Concrete'),
(gen_random_uuid(), demo_company_id, '06-200', 'Finish Carpentry', 'Trim, cabinets, and finish work', 'Carpentry'),
(gen_random_uuid(), demo_company_id, '07-200', 'Insulation', 'Thermal and acoustic insulation', 'Insulation'),
(gen_random_uuid(), demo_company_id, '09-300', 'Tile Work', 'Ceramic, stone, and tile installation', 'Finishes'),
(gen_random_uuid(), demo_company_id, '09-900', 'Painting', 'Interior and exterior painting', 'Finishes'),
(gen_random_uuid(), demo_company_id, '22-100', 'Plumbing', 'Plumbing systems and fixtures', 'Plumbing'),
(gen_random_uuid(), demo_company_id, '23-100', 'HVAC', 'Heating, ventilation, and air conditioning', 'HVAC');

-- Insert materials with correct column names
INSERT INTO materials (company_id, name, description, unit, quantity_available, minimum_stock_level, unit_cost, supplier_name, supplier_contact, category, material_code, created_by) VALUES
(demo_company_id, '2x4 Lumber - 8ft', 'Premium grade Douglas Fir framing lumber', 'piece', 150, 50, 8.50, 'Pacific Lumber Supply', '(555) 123-4567', 'Lumber', 'LUM-2X4-8', demo_user_id),
(demo_company_id, '2x6 Lumber - 10ft', 'Premium grade Douglas Fir framing lumber', 'piece', 75, 25, 15.25, 'Pacific Lumber Supply', '(555) 123-4567', 'Lumber', 'LUM-2X6-10', demo_user_id),
(demo_company_id, 'Granite Countertop - Kashmir White', 'Premium granite slab, polished finish', 'sq ft', 85, 20, 65.00, 'Stone Masters Inc', '(555) 987-6543', 'Stone', 'GRN-KAS-WHT', demo_user_id),
(demo_company_id, 'Ceramic Floor Tile 12x12', 'Porcelain ceramic tile, various colors', 'sq ft', 500, 100, 4.25, 'Tile World', '(555) 246-8135', 'Tile', 'CER-12X12', demo_user_id),
(demo_company_id, 'Drywall 1/2" - 4x8', 'Standard gypsum drywall sheets', 'sheet', 200, 50, 12.75, 'Builder Supply Co', '(555) 369-2580', 'Drywall', 'DRY-12-4X8', demo_user_id),
(demo_company_id, 'Premium Paint - Interior', 'Zero VOC premium interior paint', 'gallon', 45, 10, 42.50, 'Pro Paint Supply', '(555) 159-7531', 'Paint', 'PNT-INT-PREM', demo_user_id),
(demo_company_id, 'Hardwood Flooring - Oak', 'Solid red oak hardwood flooring', 'sq ft', 800, 200, 8.95, 'Hardwood Depot', '(555) 753-9514', 'Flooring', 'HW-OAK-SOL', demo_user_id),
(demo_company_id, 'LED Recessed Lights', 'Energy efficient LED downlights', 'fixture', 50, 15, 35.00, 'Electric Supply House', '(555) 852-7419', 'Electrical', 'LED-REC-6', demo_user_id),
(demo_company_id, 'PVC Pipe - 1/2 inch', 'Schedule 40 PVC plumbing pipe', 'linear ft', 300, 75, 1.85, 'Plumbing Supply Pro', '(555) 741-9630', 'Plumbing', 'PVC-12-S40', demo_user_id),
(demo_company_id, 'Concrete Mix - 80lb', 'High strength concrete mix bags', 'bag', 125, 30, 4.50, 'Concrete Direct', '(555) 963-8520', 'Concrete', 'CON-80-HS', demo_user_id);

-- Insert equipment
INSERT INTO equipment (company_id, name, description, equipment_type, model, serial_number, purchase_date, purchase_cost, current_value, status, location, maintenance_schedule, next_maintenance_date, created_by) VALUES
(demo_company_id, 'Bobcat S570 Skid Steer', 'Compact skid steer loader for material handling', 'Heavy Equipment', 'S570', 'ABDC123456789', '2023-03-15', 42000.00, 38000.00, 'available', 'Main Yard', 'Every 250 hours', '2024-08-15', demo_user_id),
(demo_company_id, 'DeWalt Chop Saw', 'Professional grade miter saw for precise cuts', 'Power Tools', 'DWS780', 'DW78012345', '2024-01-20', 650.00, 600.00, 'in_use', 'Smith Kitchen Project', 'Monthly', '2024-08-01', demo_user_id),
(demo_company_id, 'Ford F-350 Work Truck', 'Heavy duty pickup truck with tool storage', 'Vehicles', 'F-350 Super Duty', '1FT8W3BT8XEC12345', '2022-08-10', 55000.00, 48000.00, 'available', 'Main Office', 'Every 5,000 miles', '2024-08-20', demo_user_id),
(demo_company_id, 'Hilti Hammer Drill', 'Cordless rotary hammer drill', 'Power Tools', 'TE 7-A36', 'HT36789012', '2024-02-14', 420.00, 390.00, 'available', 'Tool Room', 'Quarterly', '2024-09-01', demo_user_id),
(demo_company_id, 'Werner Extension Ladder', '32-foot aluminum extension ladder', 'Ladders', 'D6232-2', 'WR32145678', '2023-09-05', 385.00, 340.00, 'available', 'Main Yard', 'Every 6 months', '2024-09-05', demo_user_id),
(demo_company_id, 'Makita Table Saw', 'Professional cabinet table saw', 'Power Tools', '2705X1', 'MK27056789', '2023-11-20', 1250.00, 1100.00, 'in_use', 'Downtown Office Project', 'Bi-weekly', '2024-07-25', demo_user_id),
(demo_company_id, 'Air Compressor - Portable', '6-gallon portable air compressor', 'Air Tools', 'PC1TG', 'AC6G789123', '2024-04-10', 180.00, 170.00, 'available', 'Tool Room', 'Monthly', '2024-08-10', demo_user_id);

-- Insert time tracking entries for the last 20 days
INSERT INTO time_entries (employee_id, project_id, cost_code_id, hours_worked, hourly_rate, description, date, created_by)
SELECT 
    demo_user_id,
    project_ids.id,
    cc1_id,
    CASE 
        WHEN random() < 0.7 THEN 8.0 + (random() * 0.5)
        ELSE 4.0 + (random() * 4.0)
    END,
    CASE 
        WHEN random() < 0.3 THEN 25.00
        WHEN random() < 0.6 THEN 28.00
        WHEN random() < 0.8 THEN 32.00
        ELSE 35.00
    END,
    descriptions.desc,
    (CURRENT_DATE - (interval '1 day' * generate_series)),
    demo_user_id
FROM 
    (VALUES (project1_id), (project2_id)) AS project_ids(id),
    (VALUES 
        ('Framing work on main structure'),
        ('Installing electrical rough-in'),
        ('Plumbing installation'),
        ('Drywall installation and taping'),
        ('Painting and finish work'),
        ('Site cleanup and preparation')
    ) AS descriptions(desc),
    generate_series(1, 20)
WHERE generate_series <= 20;

-- Insert daily reports for the last 10 days
INSERT INTO daily_reports (project_id, date, crew_count, weather_conditions, work_performed, materials_delivered, equipment_used, delays_issues, safety_incidents, created_by)
SELECT 
    project_ids.id,
    (CURRENT_DATE - (interval '1 day' * generate_series)),
    CASE 
        WHEN random() < 0.25 THEN 3
        WHEN random() < 0.5 THEN 4
        WHEN random() < 0.75 THEN 5
        ELSE 6
    END,
    weather.condition,
    work.performed,
    materials.delivered,
    equipment.used,
    delays.issue,
    safety.incident,
    demo_user_id
FROM 
    (VALUES (project1_id), (project2_id)) AS project_ids(id),
    (VALUES 
        ('Clear and sunny'), 
        ('Partly cloudy'), 
        ('Overcast'), 
        ('Light rain (work continued)'), 
        ('Sunny with light breeze')
    ) AS weather(condition),
    (VALUES 
        ('Completed framing for north wall, installed electrical conduit'),
        ('Cabinet installation 75% complete, plumbing rough-in finished'),
        ('Tile work progressing in master bathroom, grouting completed'),
        ('Hardwood flooring installation in living areas'),
        ('Quality control inspection, punch list items addressed')
    ) AS work(performed),
    (VALUES 
        ('Lumber delivery (2x4s, 2x6s), drywall sheets'),
        ('Granite countertops, cabinet hardware'),
        ('Electrical fixtures, switch plates'),
        ('Paint supplies, brushes, and rollers'),
        ('No deliveries today')
    ) AS materials(delivered),
    (VALUES 
        ('Bobcat skid steer, miter saw, hammer drill'),
        ('Table saw, air compressor, extension ladder'),
        ('Work truck for material transport'),
        ('Hand tools only, minimal equipment day'),
        ('Full tool complement including power tools')
    ) AS equipment(used),
    (VALUES 
        ('None - work progressed on schedule'),
        ('Material delivery delayed by 2 hours'),
        ('Inspection scheduled for tomorrow'),
        ('None - excellent progress today'),
        ('Client requested minor design change')
    ) AS delays(issue),
    (VALUES 
        ('No incidents - good safety day'),
        ('None reported'),
        ('No incidents - safety meeting held'),
        ('None - excellent safety record continues'),
        ('No incidents reported')
    ) AS safety(incident),
    generate_series(1, 10)
WHERE generate_series <= 10;

-- Insert some change orders
INSERT INTO change_orders (project_id, change_order_number, title, description, amount, reason, status, client_approved, internal_approved, created_by)
VALUES 
(
    project1_id,
    'CO-0001',
    'Kitchen Island Design Change',
    'Client requested larger kitchen island with additional storage and seating area',
    8500.00,
    'Client requested upgrade',
    'approved',
    true,
    true,
    demo_user_id
),
(
    project2_id,
    'CO-0002',
    'Additional Electrical Outlets',
    'Addition of 6 more electrical outlets in conference rooms for enhanced functionality',
    2400.00,
    'Functionality enhancement',
    'pending',
    false,
    true,
    demo_user_id
),
(
    project1_id,
    'CO-0003',
    'Upgraded Bathroom Fixtures',
    'Upgrade to premium fixtures in master bathroom including rainfall shower head',
    3200.00,
    'Quality upgrade',
    'in_progress',
    true,
    true,
    demo_user_id
);

END $$;