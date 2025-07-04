-- Insert cost codes, materials, and equipment
INSERT INTO cost_codes (company_id, code, name, description, category) VALUES
('fcfd2e31-637b-466b-b533-df70f7f1b3af', '01-100', 'Site Preparation', 'Excavation, grading, and site preparation work', 'Site Work'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', '06-100', 'Rough Carpentry', 'Framing, sheathing, and structural carpentry', 'Carpentry'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', '16-100', 'Electrical', 'Electrical systems and fixtures', 'Electrical'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', '03-300', 'Concrete Work', 'Foundations, slabs, and concrete structures', 'Concrete'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', '09-900', 'Painting', 'Interior and exterior painting', 'Finishes'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', '22-100', 'Plumbing', 'Plumbing systems and fixtures', 'Plumbing');

-- Insert materials
INSERT INTO materials (company_id, name, description, unit, quantity_available, minimum_stock_level, unit_cost, supplier_name, supplier_contact, category, material_code, created_by) VALUES
('fcfd2e31-637b-466b-b533-df70f7f1b3af', '2x4 Lumber - 8ft', 'Premium grade Douglas Fir framing lumber', 'piece', 150, 50, 8.50, 'Pacific Lumber Supply', '(555) 123-4567', 'Lumber', 'LUM-2X4-8', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'Granite Countertop - Kashmir White', 'Premium granite slab, polished finish', 'sq ft', 85, 20, 65.00, 'Stone Masters Inc', '(555) 987-6543', 'Stone', 'GRN-KAS-WHT', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'Ceramic Floor Tile 12x12', 'Porcelain ceramic tile, various colors', 'sq ft', 500, 100, 4.25, 'Tile World', '(555) 246-8135', 'Tile', 'CER-12X12', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'Drywall 1/2" - 4x8', 'Standard gypsum drywall sheets', 'sheet', 200, 50, 12.75, 'Builder Supply Co', '(555) 369-2580', 'Drywall', 'DRY-12-4X8', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'Premium Paint - Interior', 'Zero VOC premium interior paint', 'gallon', 45, 10, 42.50, 'Pro Paint Supply', '(555) 159-7531', 'Paint', 'PNT-INT-PREM', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'LED Recessed Lights', 'Energy efficient LED downlights', 'fixture', 50, 15, 35.00, 'Electric Supply House', '(555) 852-7419', 'Electrical', 'LED-REC-6', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19');

-- Insert equipment
INSERT INTO equipment (company_id, name, description, equipment_type, model, serial_number, purchase_date, purchase_cost, current_value, status, location, maintenance_schedule, next_maintenance_date, created_by) VALUES
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'Bobcat S570 Skid Steer', 'Compact skid steer loader for material handling', 'Heavy Equipment', 'S570', 'ABDC123456789', '2023-03-15', 42000.00, 38000.00, 'available', 'Main Yard', 'Every 250 hours', '2024-08-15', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'DeWalt Chop Saw', 'Professional grade miter saw for precise cuts', 'Power Tools', 'DWS780', 'DW78012345', '2024-01-20', 650.00, 600.00, 'in_use', 'Smith Kitchen Project', 'Monthly', '2024-08-01', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'Ford F-350 Work Truck', 'Heavy duty pickup truck with tool storage', 'Vehicles', 'F-350 Super Duty', '1FT8W3BT8XEC12345', '2022-08-10', 55000.00, 48000.00, 'available', 'Main Office', 'Every 5,000 miles', '2024-08-20', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'),
('fcfd2e31-637b-466b-b533-df70f7f1b3af', 'Makita Table Saw', 'Professional cabinet table saw', 'Power Tools', '2705X1', 'MK27056789', '2023-11-20', 1250.00, 1100.00, 'in_use', 'Downtown Office Project', 'Bi-weekly', '2024-07-25', '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19');