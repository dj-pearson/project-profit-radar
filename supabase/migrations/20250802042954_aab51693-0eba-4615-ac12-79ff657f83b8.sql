-- Comprehensive Demo Data Migration for Construction Management Platform
-- This creates realistic demo data across all major tables

DO $$
DECLARE
    demo_company_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    demo_user_id UUID := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    demo_project_id UUID := 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
    demo_lead_id UUID := 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
    demo_deal_id UUID := 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
    demo_contact_id UUID := 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';
    demo_opportunity_id UUID := 'a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a17';
BEGIN
    -- Insert demo companies
    INSERT INTO companies (id, name, type, address, city, state, postal_code, country, phone, email, website, license_number, tax_id, established_date, description) VALUES
    (demo_company_id, 'BuildMaster Construction LLC', 'general_contractor', '123 Construction Ave', 'Denver', 'CO', '80202', 'USA', '+1-303-555-0123', 'info@buildmaster.com', 'https://buildmaster.com', 'CON-2024-001', '12-3456789', '2015-01-15', 'Premier commercial construction company specializing in office buildings and retail spaces'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'Rocky Mountain Builders', 'residential_contractor', '456 Mountain View Dr', 'Boulder', 'CO', '80301', 'USA', '+1-303-555-0456', 'contact@rmbuilders.com', 'https://rmbuilders.com', 'RES-2024-002', '98-7654321', '2018-03-22', 'Luxury residential construction and custom homes'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'Mile High Electric', 'electrical_contractor', '789 Electric Blvd', 'Colorado Springs', 'CO', '80903', 'USA', '+1-719-555-0789', 'service@milehighelec.com', 'https://milehighelec.com', 'ELE-2024-003', '55-1234567', '2012-08-10', 'Commercial and residential electrical contractor');

    -- Insert demo user profiles  
    INSERT INTO user_profiles (id, email, first_name, last_name, phone, company_id, role, active, avatar_url, title, department, emergency_contact_name, emergency_contact_phone, start_date, employee_id, notes) VALUES
    (demo_user_id, 'john.smith@buildmaster.com', 'John', 'Smith', '+1-303-555-1001', demo_company_id, 'admin', true, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Project Manager', 'Operations', 'Jane Smith', '+1-303-555-1002', '2020-01-15', 'EMP-001', 'Lead project manager with 15 years experience'),
    ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'sarah.johnson@buildmaster.com', 'Sarah', 'Johnson', '+1-303-555-1003', demo_company_id, 'project_manager', true, 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'Site Supervisor', 'Field Operations', 'Mark Johnson', '+1-303-555-1004', '2021-03-01', 'EMP-002', 'Experienced field supervisor'),
    ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'mike.davis@buildmaster.com', 'Mike', 'Davis', '+1-303-555-1005', demo_company_id, 'foreman', true, null, 'Construction Foreman', 'Field Operations', 'Lisa Davis', '+1-303-555-1006', '2019-06-15', 'EMP-003', 'Skilled foreman specializing in commercial builds');

    -- Insert demo contacts
    INSERT INTO contacts (id, company_id, first_name, last_name, email, phone, mobile_phone, title, company_name, address, city, state, postal_code, country, lead_source, contact_type, notes, preferred_contact_method, do_not_contact) VALUES
    (demo_contact_id, demo_company_id, 'Robert', 'Wilson', 'rwilson@acmecorp.com', '+1-303-555-2001', '+1-303-555-2002', 'Facilities Manager', 'Acme Corporation', '999 Corporate Plaza', 'Denver', 'CO', '80202', 'USA', 'referral', 'client', 'Key decision maker for facility projects', 'email', false),
    ('b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', demo_company_id, 'Jennifer', 'Brown', 'jbrown@techstart.com', '+1-303-555-2003', '+1-303-555-2004', 'CEO', 'TechStart Inc', '123 Innovation Way', 'Boulder', 'CO', '80301', 'USA', 'website', 'prospect', 'Fast-growing tech company looking for office expansion', 'phone', false),
    ('c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', demo_company_id, 'David', 'Anderson', 'danderson@retailplus.com', '+1-303-555-2005', null, 'Store Manager', 'RetailPlus Stores', '456 Shopping Center', 'Lakewood', 'CO', '80226', 'USA', 'cold_call', 'client', 'Managing multiple retail locations', 'email', false);

    -- Insert demo leads
    INSERT INTO leads (id, company_id, first_name, last_name, email, phone, company_name, project_type, estimated_budget, project_timeline, decision_maker, financing_secured, location, lead_source, lead_status, assigned_to, notes, follow_up_date, last_contact_date, contact_preferences) VALUES
    (demo_lead_id, demo_company_id, 'Jessica', 'Martinez', 'jmartinez@healthcorp.com', '+1-303-555-3001', 'HealthCorp Medical', 'commercial_office', 850000, '3-6 months', true, true, 'Highlands Ranch, CO', 'referral', 'qualified', demo_user_id, 'Medical office complex expansion project. High priority client.', current_date + interval '3 days', current_date - interval '2 days', jsonb_build_object('method', 'email', 'time', 'morning')),
    ('b8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', demo_company_id, 'Thomas', 'Garcia', 'tgarcia@autogroup.com', '+1-303-555-3002', 'AutoGroup Dealerships', 'commercial_retail', 1200000, '6-12 months', false, false, 'Aurora, CO', 'website', 'new', demo_user_id, 'Auto dealership showroom renovation. Still evaluating options.', current_date + interval '1 week', current_date - interval '5 days', jsonb_build_object('method', 'phone', 'time', 'afternoon')),
    ('c9eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', demo_company_id, 'Amanda', 'Lopez', 'alopez@schooldistrict.edu', '+1-303-555-3003', 'Mountain View School District', 'institutional', 2500000, '1-3 months', true, true, 'Westminster, CO', 'trade_show', 'proposal_sent', demo_user_id, 'Elementary school renovation project. Board approval pending.', current_date + interval '5 days', current_date - interval '1 day', jsonb_build_object('method', 'email', 'time', 'anytime'));

    -- Insert demo opportunities
    INSERT INTO opportunities (id, company_id, name, description, estimated_value, probability_percent, stage, expected_close_date, lead_id, contact_id, account_manager, created_by) VALUES
    (demo_opportunity_id, demo_company_id, 'Downtown Office Complex Renovation', 'Complete renovation of 50,000 sq ft office building including HVAC, electrical, and interior finishes', 1500000, 75, 'proposal', current_date + interval '45 days', demo_lead_id, demo_contact_id, 'John Smith', demo_user_id),
    ('b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', demo_company_id, 'Retail Store Chain Expansion', 'Build 5 new retail locations across Colorado metro area', 3200000, 60, 'negotiation', current_date + interval '60 days', 'b8eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Sarah Johnson', demo_user_id),
    ('c8eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', demo_company_id, 'Industrial Warehouse Project', 'Construction of 100,000 sq ft distribution center with loading docks', 2800000, 40, 'qualification', current_date + interval '90 days', 'c9eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Mike Davis', demo_user_id);

    -- Insert demo deals
    INSERT INTO deals (id, company_id, name, description, estimated_value, expected_close_date, current_stage_id, primary_contact_id, status, priority, risk_level, source, created_by) VALUES
    (demo_deal_id, demo_company_id, 'Medical Center Expansion', 'Expansion of existing medical center with new patient wing and parking structure', 2100000, current_date + interval '120 days', null, demo_contact_id, 'active', 'high', 'medium', 'referral', demo_user_id),
    ('ba eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', demo_company_id, 'Corporate Headquarters Build', 'Ground-up construction of new corporate headquarters building', 4500000, current_date + interval '180 days', null, 'b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'active', 'high', 'low', 'trade_show', demo_user_id),
    ('cb eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', demo_company_id, 'School Modernization Project', 'Complete modernization of aging school facilities', 1800000, current_date + interval '90 days', null, 'c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'won', 'medium', 'low', 'government_contract', demo_user_id);

    -- Insert demo projects
    INSERT INTO projects (id, company_id, name, description, project_type, status, start_date, end_date, estimated_completion_date, budget, actual_cost, client_name, client_contact, project_manager_id, location, completion_percentage, priority, risk_level, contract_type, contract_value, created_by) VALUES
    (demo_project_id, demo_company_id, 'Gateway Shopping Center Phase 1', 'Construction of new 75,000 sq ft shopping center with anchor tenant spaces and parking', 'commercial_retail', 'in_progress', current_date - interval '60 days', current_date + interval '180 days', current_date + interval '160 days', 3500000, 1200000, 'Gateway Development LLC', 'Robert Wilson', demo_user_id, '1234 Commerce Street, Denver, CO 80202', 35.5, 'high', 'medium', 'fixed_price', 3500000, demo_user_id),
    ('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', demo_company_id, 'Luxury Residential Complex', 'Development of 24-unit luxury condominium complex with amenities', 'residential_multifamily', 'planning', current_date + interval '30 days', current_date + interval '365 days', current_date + interval '350 days', 8500000, 0, 'Highland Homes Development', 'Jennifer Brown', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', '5678 Mountain View Drive, Boulder, CO 80301', 0, 'high', 'medium', 'cost_plus', 8500000, demo_user_id),
    ('e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', demo_company_id, 'Municipal Fire Station', 'Construction of new fire station with equipment bays and living quarters', 'institutional', 'completed', current_date - interval '300 days', current_date - interval '30 days', current_date - interval '30 days', 2200000, 2150000, 'City of Westminster', 'David Anderson', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', '999 Municipal Way, Westminster, CO 80031', 100, 'medium', 'low', 'fixed_price', 2200000, demo_user_id);

    -- Insert demo tasks for the main project
    INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, estimated_hours, actual_hours, completion_percentage, dependencies, created_by) VALUES
    (demo_project_id, 'Site Preparation and Excavation', 'Clear site, perform excavation, and prepare foundation areas', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'completed', 'high', current_date - interval '45 days', 120, 115, 100, '[]'::jsonb, demo_user_id),
    (demo_project_id, 'Foundation and Concrete Work', 'Pour foundations, footings, and concrete slab', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'completed', 'high', current_date - interval '30 days', 200, 185, 100, '[]'::jsonb, demo_user_id),
    (demo_project_id, 'Structural Steel Erection', 'Install structural steel framework and roof decking', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'in_progress', 'high', current_date + interval '15 days', 180, 95, 65, '[]'::jsonb, demo_user_id),
    (demo_project_id, 'MEP Rough-In', 'Install mechanical, electrical, and plumbing rough-in work', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'not_started', 'medium', current_date + interval '45 days', 160, 0, 0, '[]'::jsonb, demo_user_id),
    (demo_project_id, 'Interior Finishes', 'Drywall, flooring, painting, and final fixtures', demo_user_id, 'not_started', 'medium', current_date + interval '90 days', 240, 0, 0, '[]'::jsonb, demo_user_id);

    -- Insert demo purchase orders
    INSERT INTO purchase_orders (company_id, project_id, vendor_name, vendor_contact, po_number, description, status, total_amount, tax_amount, requested_by, approved_by, delivery_date, delivery_address, payment_terms, created_by) VALUES
    (demo_company_id, demo_project_id, 'Rocky Mountain Steel Supply', 'Mike Thompson', 'PO-2024-0001', 'Structural steel beams and columns for Phase 1', 'approved', 245000, 19600, demo_user_id, demo_user_id, current_date + interval '10 days', '1234 Commerce Street, Denver, CO 80202', 'Net 30', demo_user_id),
    (demo_company_id, demo_project_id, 'Denver Concrete Solutions', 'Lisa Rodriguez', 'PO-2024-0002', 'Ready-mix concrete for foundation and slab', 'delivered', 85000, 6800, 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', demo_user_id, current_date - interval '25 days', '1234 Commerce Street, Denver, CO 80202', 'Net 15', demo_user_id),
    (demo_company_id, demo_project_id, 'Mile High Electric Supply', 'Carlos Martinez', 'PO-2024-0003', 'Electrical panels, conduit, and wiring materials', 'pending', 125000, 10000, 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', null, current_date + interval '30 days', '1234 Commerce Street, Denver, CO 80202', 'Net 30', demo_user_id);

    -- Insert demo permits
    INSERT INTO permits (company_id, project_id, permit_type, permit_number, issuing_authority, application_date, issued_date, expiry_date, status, description, fee_amount, notes, contact_person, contact_phone, contact_email) VALUES
    (demo_company_id, demo_project_id, 'building', 'BP-2024-1234', 'City of Denver Building Department', current_date - interval '90 days', current_date - interval '75 days', current_date + interval '365 days', 'approved', 'New commercial construction permit for shopping center', 8500, 'All requirements met. Regular inspections required.', 'Janet Foster', '+1-303-555-4001', 'jfoster@denvergov.org'),
    (demo_company_id, demo_project_id, 'electrical', 'EP-2024-5678', 'Colorado State Electrical Board', current_date - interval '80 days', current_date - interval '70 days', current_date + interval '300 days', 'approved', 'Electrical work permit for commercial facility', 2200, 'Master electrician required on site.', 'Tom Bradley', '+1-303-555-4002', 'tbradley@state.co.us'),
    (demo_company_id, demo_project_id, 'excavation', 'EX-2024-9012', 'Denver Public Works', current_date - interval '70 days', current_date - interval '65 days', current_date + interval '180 days', 'approved', 'Excavation and grading permit', 1200, 'Utility marking completed.', 'Susan Chen', '+1-303-555-4003', 'schen@denverpw.org');

    -- Insert demo equipment
    INSERT INTO equipment (company_id, name, type, category, model, manufacturer, serial_number, purchase_date, purchase_price, current_value, condition_rating, status, location, description, maintenance_schedule, insurance_policy, created_by) VALUES
    (demo_company_id, 'Caterpillar 320 Excavator', 'excavator', 'heavy_machinery', '320GC', 'Caterpillar', 'CAT320-2023-001', '2023-01-15', 185000, 165000, 9.5, 'available', 'Main Yard', '20-ton hydraulic excavator with GPS and backup camera', 'Every 250 hours', 'POL-EQ-001', demo_user_id),
    (demo_company_id, 'John Deere 544K Wheel Loader', 'wheel_loader', 'heavy_machinery', '544K', 'John Deere', 'JD544-2022-002', '2022-06-20', 155000, 140000, 8.8, 'in_use', 'Gateway Shopping Center Project', '5-yard bucket capacity with quick-attach system', 'Every 200 hours', 'POL-EQ-002', demo_user_id),
    (demo_company_id, 'Genie S-125 Boom Lift', 'boom_lift', 'aerial_equipment', 'S-125', 'Genie', 'GEN125-2021-003', '2021-03-10', 89000, 75000, 8.2, 'maintenance', 'Service Center', '125-foot telescopic boom lift with 500 lb capacity', 'Every 150 hours', 'POL-EQ-003', demo_user_id);

    -- Insert demo safety incidents
    INSERT INTO safety_incidents (company_id, project_id, incident_type, severity, description, location, incident_date, reported_by, injured_person, injury_type, injury_severity, medical_attention_required, medical_facility, witness_names, root_cause, corrective_actions, follow_up_required, follow_up_date, osha_recordable, investigation_status, created_by) VALUES
    (demo_company_id, demo_project_id, 'near_miss', 'low', 'Worker almost struck by falling tool from scaffold', 'Building A - 2nd Floor', current_date - interval '15 days', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', null, null, null, false, null, '{"Mike Davis", "Tony Rodriguez"}', 'Improper tool tethering on scaffold', 'Mandatory tool tethering training for all workers', true, current_date + interval '5 days', false, 'completed', demo_user_id),
    (demo_company_id, demo_project_id, 'first_aid', 'low', 'Minor laceration on hand from sheet metal edge', 'Equipment Storage Area', current_date - interval '8 days', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'Steve Wilson', 'laceration', 'minor', true, 'On-site first aid', '{"Sarah Johnson"}', 'Lack of cut-resistant gloves', 'Provide cut-resistant gloves for all sheet metal work', false, null, false, 'completed', demo_user_id);

    -- Insert demo inspections
    INSERT INTO inspections (company_id, project_id, inspection_type, inspector_name, inspector_organization, scheduled_date, completed_date, status, result, notes, deficiencies_found, corrective_actions_required, next_inspection_date, checklist_items, photos_taken, certificate_issued, created_by) VALUES
    (demo_company_id, demo_project_id, 'foundation', 'Mark Stevens', 'City of Denver Building Department', current_date - interval '40 days', current_date - interval '40 days', 'completed', 'passed', 'Foundation meets all code requirements. Rebar placement and concrete quality approved.', false, null, null, '{"Rebar placement", "Concrete mix verification", "Foundation dimensions", "Drainage systems"}', true, true, demo_user_id),
    (demo_company_id, demo_project_id, 'framing', 'Jennifer Walsh', 'City of Denver Building Department', current_date - interval '10 days', current_date - interval '10 days', 'completed', 'passed_with_conditions', 'Structural framing approved with minor corrections needed in Area C.', true, 'Install additional lateral bracing in grid C-3', current_date + interval '5 days', '{"Beam installation", "Column plumbness", "Lateral bracing", "Fire ratings"}', true, false, demo_user_id),
    (demo_company_id, demo_project_id, 'electrical_rough', 'Carlos Rodriguez', 'Colorado State Electrical Inspector', current_date + interval '10 days', null, 'scheduled', null, null, null, null, null, '{"Panel installation", "Conduit routing", "Grounding systems", "GFCI protection"}', false, false, demo_user_id);

    -- Insert demo financial transactions
    INSERT INTO financial_transactions (company_id, project_id, transaction_type, category, amount, description, transaction_date, vendor_name, client_name, invoice_number, payment_method, account_code, tax_amount, created_by) VALUES
    (demo_company_id, demo_project_id, 'expense', 'materials', -245000, 'Structural steel purchase from Rocky Mountain Steel', current_date - interval '30 days', 'Rocky Mountain Steel Supply', null, 'INV-RMS-2024-001', 'check', '5100-MAT', -19600, demo_user_id),
    (demo_company_id, demo_project_id, 'expense', 'labor', -85000, 'Concrete crew labor for foundation pour', current_date - interval '25 days', 'Denver Concrete Solutions', null, 'INV-DCS-2024-002', 'ach', '5200-LAB', -6800, demo_user_id),
    (demo_company_id, demo_project_id, 'income', 'progress_payment', 1200000, 'Progress payment #2 - Foundation and structural work', current_date - interval '20 days', null, 'Gateway Development LLC', 'INV-BM-2024-001', 'wire_transfer', '4100-REV', 96000, demo_user_id),
    (demo_company_id, demo_project_id, 'expense', 'equipment', -12500, 'Equipment rental for excavator and loader', current_date - interval '15 days', 'Mile High Equipment Rental', null, 'INV-MHE-2024-003', 'credit_card', '5300-EQU', -1000, demo_user_id);

    -- Insert demo change orders
    INSERT INTO change_orders (company_id, project_id, change_order_number, title, description, reason, cost_impact, schedule_impact_days, status, requested_by, approved_by, request_date, approval_date, client_approval_required, client_approved_date, scope_additions, scope_deletions, created_by) VALUES
    (demo_company_id, demo_project_id, 'CO-001', 'Additional Electrical Outlets', 'Add 12 additional electrical outlets in tenant spaces per client request', 'Client requested upgrade', 8500, 3, 'approved', demo_user_id, demo_user_id, current_date - interval '20 days', current_date - interval '18 days', true, current_date - interval '17 days', 'Additional electrical outlets and associated wiring', null, demo_user_id),
    (demo_project_id, demo_project_id, 'CO-002', 'HVAC System Upgrade', 'Upgrade to high-efficiency HVAC units for better energy performance', 'Code requirement change', 25000, 7, 'pending_approval', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', null, current_date - interval '5 days', null, true, null, 'High-efficiency HVAC units and controls', 'Standard efficiency units', demo_user_id);

    -- Insert demo time tracking entries
    INSERT INTO time_tracking (company_id, user_id, project_id, task_id, clock_in_time, clock_out_time, total_hours, break_duration_minutes, overtime_hours, description, location, approved_by, approval_date) VALUES
    (demo_company_id, 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', demo_project_id, null, (current_date - interval '1 day')::timestamp + time '07:00:00', (current_date - interval '1 day')::timestamp + time '15:30:00', 8.0, 30, 0, 'Foundation work supervision and quality control', 'Gateway Shopping Center', demo_user_id, current_date),
    (demo_company_id, 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', demo_project_id, null, (current_date - interval '1 day')::timestamp + time '06:30:00', (current_date - interval '1 day')::timestamp + time '17:00:00', 9.5, 60, 1.5, 'Steel erection coordination and safety oversight', 'Gateway Shopping Center', demo_user_id, current_date),
    (demo_company_id, demo_user_id, demo_project_id, null, (current_date - interval '1 day')::timestamp + time '08:00:00', (current_date - interval '1 day')::timestamp + time '17:00:00', 8.5, 45, 0.5, 'Project management, client meetings, and progress reporting', 'Gateway Shopping Center', demo_user_id, current_date);

    -- Insert demo blog posts
    INSERT INTO blog_posts (title, slug, excerpt, body, status, seo_title, seo_description, featured_image_url, created_by, published_at) VALUES
    ('5 Essential Safety Practices for Construction Sites', '5-essential-safety-practices-construction-sites', 'Construction sites can be dangerous places. Learn about the five most important safety practices that every construction worker should follow to prevent accidents and injuries.', 'Construction safety is paramount in our industry. Here are five essential practices that every construction site should implement...

## 1. Personal Protective Equipment (PPE)
Always wear appropriate PPE including hard hats, safety glasses, steel-toed boots, and high-visibility clothing.

## 2. Fall Protection
Use proper fall protection equipment when working at heights above 6 feet.

## 3. Tool Safety
Inspect tools before use and maintain them properly.

## 4. Communication
Maintain clear communication with all team members.

## 5. Training
Ensure all workers receive proper safety training.', 'published', '5 Essential Construction Safety Practices | BuildMaster Construction', 'Learn the top 5 safety practices that prevent construction site accidents. Expert tips from BuildMaster Construction for safer worksites.', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', demo_user_id, current_date - interval '10 days'),
    ('Modern Construction Technology Trends', 'modern-construction-technology-trends', 'Explore the latest technology trends transforming the construction industry, from drones and IoT to AI and robotics.', 'The construction industry is experiencing a technological revolution. Here are the key trends shaping our future...

## Building Information Modeling (BIM)
BIM technology allows for detailed 3D modeling and collaboration.

## Drones and Aerial Surveying
Drones provide accurate site surveys and progress monitoring.

## Internet of Things (IoT)
Connected devices monitor equipment and site conditions.

## Artificial Intelligence
AI helps with project planning and risk assessment.', 'published', 'Construction Technology Trends 2024 | BuildMaster', 'Discover the latest construction technology trends including BIM, drones, IoT, and AI. Stay ahead in the construction industry.', 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800', demo_user_id, current_date - interval '5 days');

    -- Insert demo social media posts
    INSERT INTO social_media_posts (company_id, platform, content, media_urls, scheduled_for, published_at, status, engagement_metrics, created_by) VALUES
    (demo_company_id, 'linkedin', 'Exciting progress on our Gateway Shopping Center project! The structural steel is going up ahead of schedule. Great work by our team! #construction #progress #teamwork', '["https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800"]', current_date - interval '3 days', current_date - interval '3 days', 'published', '{"likes": 24, "comments": 8, "shares": 3}', demo_user_id),
    (demo_company_id, 'twitter', 'Safety first! Our team completed another week with zero incidents on the Gateway project. Proud of our safety culture. #safetyfirst #construction', '[]', current_date - interval '1 day', current_date - interval '1 day', 'published', '{"likes": 12, "retweets": 4, "replies": 2}', demo_user_id),
    (demo_company_id, 'facebook', 'Behind the scenes at BuildMaster Construction: Watch our skilled crews work on the foundation for the new Gateway Shopping Center. Quality construction that lasts! #construction #quality', '["https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800"]', current_date + interval '2 days', null, 'scheduled', '{}', demo_user_id);

    -- Insert demo warranty records
    INSERT INTO warranties (company_id, project_id, warranty_type, warranty_duration_months, warranty_start_date, warranty_end_date, coverage_description, exclusions, claim_process, contact_information, status, created_by) VALUES
    (demo_company_id, 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'structural', 120, current_date - interval '30 days', current_date + interval '90 months', 'Complete structural warranty covering foundation, framing, and roofing systems', 'Normal wear and tear, damage from extreme weather events', 'Contact project manager within 48 hours of discovery', 'warranty@buildmaster.com or +1-303-555-0123', 'active', demo_user_id),
    (demo_company_id, 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'mechanical', 24, current_date - interval '30 days', current_date + interval '18 months', 'HVAC systems, plumbing, and electrical components', 'Damage from improper maintenance or modifications', 'Submit warranty claim form through our website', 'warranty@buildmaster.com', 'active', demo_user_id);

    -- Insert demo API keys
    INSERT INTO api_keys (company_id, key_name, api_key_prefix, api_key_hash, permissions, created_by, expires_at) VALUES
    (demo_company_id, 'Mobile App Integration', 'bdesk_', encode(digest('demo_api_key_hash_123', 'sha256'), 'hex'), '["read:projects", "write:time_tracking", "read:tasks"]', demo_user_id, current_date + interval '1 year'),
    (demo_company_id, 'Accounting System Sync', 'bdesk_', encode(digest('demo_api_key_hash_456', 'sha256'), 'hex'), '["read:financial_transactions", "write:invoices", "read:purchase_orders"]', demo_user_id, current_date + interval '6 months');

    -- Insert demo security events
    INSERT INTO security_events (user_id, event_type, severity, description, ip_address, user_agent, metadata) VALUES
    (demo_user_id, 'login_success', 'info', 'User successfully logged in', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '{"session_duration": "2h"}'),
    (demo_user_id, 'password_change', 'medium', 'User changed password', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '{"old_password_strength": "strong", "new_password_strength": "very_strong"}'),
    ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'login_failed', 'medium', 'Failed login attempt - incorrect password', '192.168.1.105', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '{"attempt_count": 2}');

    RAISE NOTICE 'Demo data insertion completed successfully!';
    RAISE NOTICE 'Created demo company: %', demo_company_id;
    RAISE NOTICE 'Created demo users, projects, leads, and comprehensive test data across all tables.';
END $$;