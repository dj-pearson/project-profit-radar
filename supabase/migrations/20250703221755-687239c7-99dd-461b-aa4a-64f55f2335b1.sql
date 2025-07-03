-- Insert demo data for construction management platform

-- Insert demo projects (using correct column names)
INSERT INTO projects (
  id, company_id, name, description, status, start_date, end_date, 
  budget, client_name, client_email, site_address, project_manager_id, created_at
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