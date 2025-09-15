-- Create sample data for Downtown Office Building Renovation project
-- Project ID: a9b52160-4485-4428-9093-facb70ef3cfd
-- Company ID: fcfd2e31-637b-466b-b533-df70f7f1b3af  
-- User ID: 0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19

-- Insert sample daily report
INSERT INTO public.daily_reports (
  project_id,
  date,
  weather_conditions,
  crew_count,
  work_performed,
  materials_delivered,
  equipment_used,
  safety_incidents,
  delays_issues,
  created_by
) VALUES (
  'a9b52160-4485-4428-9093-facb70ef3cfd',
  CURRENT_DATE - INTERVAL '1 day',
  'Partly cloudy, 72°F',
  8,
  'Completed electrical rough-in for floors 2-3. Installed HVAC ductwork in conference rooms. Framing work continued in east wing.',
  'Electrical conduit (500 ft), Junction boxes (24 units), HVAC flexible duct (200 ft)',
  'Scissor lift, Conduit bender, Drill press, Hand tools',
  'None',
  'Delayed 2 hours due to late material delivery from electrical supplier',
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
);

-- Insert sample estimate
INSERT INTO public.estimates (
  company_id,
  project_id,
  estimate_number,
  title,
  description,
  client_name,
  client_email,
  site_address,
  status,
  total_amount,
  markup_percentage,
  estimate_date,
  valid_until,
  notes,
  created_by
) VALUES (
  'fcfd2e31-637b-466b-b533-df70f7f1b3af',
  'a9b52160-4485-4428-9093-facb70ef3cfd',
  'EST-2024-000123',
  'Office Building Renovation - Phase 2',
  'Complete renovation of floors 4-6 including electrical, HVAC, and interior finishes',
  'Downtown Properties LLC',
  'contact@downtownproperties.com',
  '123 Main Street, Downtown District',
  'sent',
  285000.00,
  22.00,
  CURRENT_DATE - INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '20 days',
  'Estimate includes permit fees and 10% contingency for unforeseen conditions',
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
);

-- Insert sample RFI
INSERT INTO public.rfis (
  rfi_number,
  subject,
  description,
  priority,
  submitted_to,
  due_date,
  status,
  project_id,
  company_id,
  created_by
) VALUES (
  'RFI-2024-0089',
  'HVAC Equipment Specifications Clarification',
  'The architectural plans show a 5-ton unit but mechanical drawings specify 7.5-ton. Please clarify which unit size is required for the main conference room on floor 3.',
  'high',
  'Johnson & Associates Architects',
  CURRENT_DATE + INTERVAL '5 days',
  'submitted',
  'a9b52160-4485-4428-9093-facb70ef3cfd',
  'fcfd2e31-637b-466b-b533-df70f7f1b3af',
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
);

-- Insert sample submittal
INSERT INTO public.submittals (
  submittal_number,
  title,
  description,
  spec_section,
  priority,
  due_date,
  submitted_date,
  status,
  project_id,
  company_id,
  created_by
) VALUES (
  'SUB-2024-0156',
  'LED Light Fixture Shop Drawings',
  'Shop drawings and product data for LED pendant lights specified for open office areas',
  '26 51 00 - Interior Lighting',
  'medium',
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE - INTERVAL '2 days',
  'under_review',
  'a9b52160-4485-4428-9093-facb70ef3cfd',
  'fcfd2e31-637b-466b-b533-df70f7f1b3af',
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
);

-- Insert sample change order
INSERT INTO public.change_orders (
  project_id,
  change_order_number,
  title,
  description,
  reason,
  amount,
  status,
  client_approved,
  internal_approved,
  internal_approved_by,
  approval_due_date,
  created_by
) VALUES (
  'a9b52160-4485-4428-9093-facb70ef3cfd',
  'CO-2024-007',
  'Additional Network Infrastructure',
  'Install additional network drops and fiber backbone to support increased IT requirements discovered during renovation',
  'Client requested additional network capacity after initial walk-through revealed outdated infrastructure',
  15750.00,
  'pending_approval',
  false,
  true,
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19',
  CURRENT_DATE + INTERVAL '10 days',
  '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
);