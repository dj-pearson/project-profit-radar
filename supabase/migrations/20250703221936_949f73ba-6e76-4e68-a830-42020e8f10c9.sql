-- Create a demo company
INSERT INTO companies (name, address, industry_type, company_size, annual_revenue_range)
VALUES (
  'Demo Construction Company',
  '123 Builder Avenue, Construction City, CA 90210',
  'residential',
  '10-50',
  '1M-5M'
);

-- Get the company ID for reference
DO $$
DECLARE
    demo_company_id UUID;
BEGIN
    SELECT id INTO demo_company_id FROM companies WHERE name = 'Demo Construction Company' ORDER BY created_at DESC LIMIT 1;
    
    -- Create or update user profile with the company
    INSERT INTO user_profiles (id, email, company_id, role, first_name, last_name)
    VALUES (auth.uid(), 'demo@example.com', demo_company_id, 'admin', 'Demo', 'User')
    ON CONFLICT (id) DO UPDATE SET 
        company_id = demo_company_id,
        updated_at = now();
        
    -- Insert demo projects
    INSERT INTO projects (
        company_id, name, description, status, start_date, end_date, 
        budget, client_name, client_email, site_address, project_manager_id, created_at
    ) VALUES 
    (
        demo_company_id,
        'Luxury Kitchen Remodel - Smith Residence',
        'Complete kitchen renovation including custom cabinets, granite countertops, hardwood flooring, and electrical upgrades.',
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
        demo_company_id,
        'Downtown Office Building Renovation',
        'Corporate office space renovation including conference rooms, open workspace design, modern lighting, HVAC upgrades.',
        'active',
        '2024-07-01',
        '2024-10-30',
        425000.00,
        'TechCorp Industries',
        'facilities@techcorp.com',
        '2500 Business Center Drive, Los Angeles, CA 90017',
        auth.uid(),
        '2024-07-01 09:00:00+00'
    );
END $$;