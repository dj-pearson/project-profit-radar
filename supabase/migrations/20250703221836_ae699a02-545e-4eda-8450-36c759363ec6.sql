-- First create a demo company if user doesn't have one
INSERT INTO companies (name, address, industry_type, company_size, annual_revenue_range)
SELECT 
  'Demo Construction Company',
  '123 Builder Avenue, Construction City, CA 90210',
  'residential',
  '10-50',
  '1M-5M'
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL
);

-- Update user profile with company_id if they don't have one
UPDATE user_profiles 
SET company_id = (
  SELECT id FROM companies 
  WHERE name = 'Demo Construction Company' 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE id = auth.uid() AND company_id IS NULL;

-- Now insert the demo data
-- Insert demo projects
INSERT INTO projects (
  company_id, name, description, status, start_date, end_date, 
  budget, client_name, client_email, site_address, project_manager_id, created_at
) VALUES 
(
  (SELECT company_id FROM user_profiles WHERE id = auth.uid()),
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
  (SELECT company_id FROM user_profiles WHERE id = auth.uid()),
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
  (SELECT company_id FROM user_profiles WHERE id = auth.uid()),
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
  (SELECT company_id FROM user_profiles WHERE id = auth.uid()),
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

-- Insert cost codes
INSERT INTO cost_codes (company_id, code, name, description, category) VALUES
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '01-100', 'Site Preparation', 'Excavation, grading, and site preparation work', 'Site Work'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '03-300', 'Concrete Work', 'Foundations, slabs, and concrete structures', 'Concrete'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '06-100', 'Rough Carpentry', 'Framing, sheathing, and structural carpentry', 'Carpentry'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '06-200', 'Finish Carpentry', 'Trim, cabinets, and finish work', 'Carpentry'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '07-200', 'Insulation', 'Thermal and acoustic insulation', 'Insulation'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '09-300', 'Tile Work', 'Ceramic, stone, and tile installation', 'Finishes'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '09-900', 'Painting', 'Interior and exterior painting', 'Finishes'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '16-100', 'Electrical', 'Electrical systems and fixtures', 'Electrical'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '22-100', 'Plumbing', 'Plumbing systems and fixtures', 'Plumbing'),
((SELECT company_id FROM user_profiles WHERE id = auth.uid()), '23-100', 'HVAC', 'Heating, ventilation, and air conditioning', 'HVAC');