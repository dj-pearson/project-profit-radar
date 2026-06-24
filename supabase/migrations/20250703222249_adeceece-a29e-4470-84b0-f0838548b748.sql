-- Insert basic demo data
INSERT INTO projects (
    company_id, name, description, status, start_date, end_date, 
    budget, client_name, client_email, site_address, project_manager_id, created_at
) VALUES 
(
    'fcfd2e31-637b-466b-b533-df70f7f1b3af',
    'Luxury Kitchen Remodel - Smith Residence',
    'Complete kitchen renovation including custom cabinets, granite countertops, hardwood flooring, and electrical upgrades.',
    'in_progress',
    '2024-06-01',
    '2024-08-15',
    85000.00,
    'Robert & Sarah Smith',
    'rsmith@email.com',
    '1425 Oak Ridge Drive, Beverly Hills, CA 90210',
    '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
    '2024-06-01 08:00:00+00'
),
(
    'fcfd2e31-637b-466b-b533-df70f7f1b3af',
    'Downtown Office Building Renovation',
    'Corporate office space renovation including conference rooms, open workspace design, modern lighting, HVAC upgrades.',
    'active',
    '2024-07-01',
    '2024-10-30',
    425000.00,
    'TechCorp Industries',
    'facilities@techcorp.com',
    '2500 Business Center Drive, Los Angeles, CA 90017',
    '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
    '2024-07-01 09:00:00+00'
),
(
    'fcfd2e31-637b-466b-b533-df70f7f1b3af',
    'Retail Store Front Expansion',
    'Expansion of existing retail space including new storefront, interior design updates, electrical work.',
    'planning',
    '2024-08-15',
    '2024-11-01',
    125000.00,
    'Sunset Boutique',
    'owner@sunsetboutique.com',
    '8899 Sunset Boulevard, West Hollywood, CA 90069',
    '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
    '2024-07-15 10:00:00+00'
),
(
    'fcfd2e31-637b-466b-b533-df70f7f1b3af',
    'Custom Home Build - Mountain View Estate',
    'New construction of 4,500 sq ft custom home with smart home technology, luxury finishes, pool, and landscaping.',
    'completed',
    '2024-01-15',
    '2024-06-30',
    750000.00,
    'James & Lisa Johnson',
    'ljohnson@email.com',
    '15 Mountain View Circle, Malibu, CA 90265',
    '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
    '2024-01-15 08:00:00+00'
);