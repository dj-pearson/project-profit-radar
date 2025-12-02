-- Insert demo daily reports and change orders with simple approach
-- Get the first project ID
DO $$
DECLARE
    first_project_id UUID;
    first_cost_code_id UUID;
BEGIN
    -- Get first project ID
    SELECT id INTO first_project_id FROM projects WHERE company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af' LIMIT 1;
    SELECT id INTO first_cost_code_id FROM cost_codes WHERE company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af' LIMIT 1;
    
    -- Insert time tracking entries
    INSERT INTO time_entries (user_id, project_id, cost_code_id, start_time, end_time, total_hours, description)
    VALUES 
    (
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
        first_project_id,
        first_cost_code_id,
        '2024-07-02 08:00:00+00',
        '2024-07-02 16:00:00+00',
        8.0,
        'Framing work and electrical rough-in'
    ),
    (
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
        first_project_id,
        first_cost_code_id,
        '2024-07-01 08:00:00+00',
        '2024-07-01 16:30:00+00',
        8.5,
        'Kitchen cabinet installation'
    ),
    (
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
        first_project_id,
        first_cost_code_id,
        '2024-06-28 08:00:00+00',
        '2024-06-28 15:00:00+00',
        7.0,
        'Plumbing installation'
    );

    -- Insert daily reports
    INSERT INTO daily_reports (project_id, date, crew_count, weather_conditions, work_performed, materials_delivered, equipment_used, delays_issues, safety_incidents, created_by)
    VALUES 
    (
        first_project_id,
        '2024-07-02',
        4,
        'Clear and sunny',
        'Completed framing for north wall, installed electrical conduit',
        'Lumber delivery (2x4s, 2x6s), electrical supplies',
        'Bobcat skid steer, miter saw, hammer drill',
        'None - work progressed on schedule',
        'No incidents - good safety day',
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
    ),
    (
        first_project_id,
        '2024-07-01',
        5,
        'Partly cloudy',
        'Cabinet installation 75% complete, plumbing rough-in finished',
        'Granite countertops, cabinet hardware',
        'Table saw, air compressor, extension ladder',
        'Material delivery delayed by 1 hour',
        'None reported',
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
    ),
    (
        first_project_id,
        '2024-06-28',
        3,
        'Overcast',
        'Tile work progressing in master bathroom, grouting completed',
        'Tile delivery, grout, and adhesive',
        'Work truck for material transport',
        'None - excellent progress today',
        'No incidents - safety meeting held',
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
    );

    -- Insert change orders
    INSERT INTO change_orders (project_id, change_order_number, title, description, amount, reason, status, client_approved, internal_approved, created_by)
    VALUES 
    (
        first_project_id,
        'CO-0001',
        'Kitchen Island Design Change',
        'Client requested larger kitchen island with additional storage and seating area',
        8500.00,
        'Client requested upgrade',
        'approved',
        true,
        true,
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
    ),
    (
        first_project_id,
        'CO-0002',
        'Additional Electrical Outlets',
        'Addition of 6 more electrical outlets in living areas for enhanced functionality',
        2400.00,
        'Functionality enhancement',
        'pending',
        false,
        true,
        '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
    );
END $$;