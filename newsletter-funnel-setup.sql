-- BuildDesk Newsletter Funnel Setup
-- This script demonstrates how to create a newsletter signup funnel with the templates

-- Step 1: Create the newsletter funnel
-- Note: In practice, this would be done through the UI or API with proper company_id

-- Example funnel creation (replace company_id with actual company UUID)
/*
INSERT INTO public.lead_funnels (
  company_id,
  name,
  description,
  trigger_event,
  is_active
) VALUES (
  'your-company-id-here'::uuid,
  'BuildDesk Newsletter Signup Funnel',
  'Educational email sequence for newsletter subscribers providing valuable construction management insights',
  'newsletter_signup',
  true
);
*/

-- Step 2: Create funnel steps with the email templates
-- Note: These would reference the actual template IDs after insertion

-- Get template IDs (example query)
/*
SELECT id, name FROM public.email_templates 
WHERE name LIKE 'Newsletter%' 
ORDER BY name;
*/

-- Create funnel steps (example - replace with actual IDs)
/*
INSERT INTO public.funnel_steps (
  funnel_id,
  step_order,
  name,
  email_template_id,
  delay_amount,
  delay_unit,
  is_active
) VALUES
  -- Step 1: Welcome Email (Immediate)
  ('funnel-id-here'::uuid, 1, 'Welcome & Platform Overview', 'template-1-id'::uuid, 0, 'minutes', true),
  
  -- Step 2: Financial Management (Day 3)
  ('funnel-id-here'::uuid, 2, 'Financial Management Mastery', 'template-2-id'::uuid, 3, 'days', true),
  
  -- Step 3: Project Management (Day 7)
  ('funnel-id-here'::uuid, 3, 'Project Management Excellence', 'template-3-id'::uuid, 4, 'days', true),
  
  -- Step 4: Client Relationships (Day 10)
  ('funnel-id-here'::uuid, 4, 'Client Relationship Excellence', 'template-4-id'::uuid, 3, 'days', true),
  
  -- Step 5: Mobile Team Management (Day 14)
  ('funnel-id-here'::uuid, 5, 'Mobile Team Management', 'template-5-id'::uuid, 4, 'days', true),
  
  -- Step 6: Industry Future (Day 21)
  ('funnel-id-here'::uuid, 6, 'Construction Industry Future', 'template-6-id'::uuid, 7, 'days', true);
*/

-- Step 3: Test adding a subscriber to the funnel
-- Use the built-in function to add subscribers
/*
SELECT public.add_subscriber_to_funnel(
  'funnel-id-here'::uuid,
  'test@example.com',
  'John',
  'Doe',
  'newsletter_signup'
);
*/

-- Newsletter Funnel Email Schedule:
-- Day 0 (Immediate): Welcome & Platform Overview
-- Day 3: Financial Management Deep Dive  
-- Day 7: Project Management & Scheduling
-- Day 10: Client Relationships & Transparency
-- Day 14: Mobile & Team Management
-- Day 21: Industry Trends & Future

-- Key Features of This Newsletter Funnel:
-- 
-- 1. Educational Content: Each email provides valuable industry insights
-- 2. Progressive Disclosure: Content builds from basics to advanced topics
-- 3. Social Proof: Customer testimonials and success stories
-- 4. Clear CTAs: Relevant links to platform features and demos
-- 5. Professional Design: Consistent branding and mobile-friendly layout
-- 6. Personalization: Uses first_name and other subscriber data
-- 7. Value-First Approach: Focuses on helping subscribers, not just selling
-- 8. Strategic Timing: Optimal spacing for engagement without overwhelm
-- 9. Strong Finish: Final email includes special offer for engaged subscribers
-- 10. Unsubscribe Options: Professional and compliant email practices

-- This funnel is designed to:
-- - Educate prospects about construction management best practices
-- - Showcase BuildDesk's capabilities through real-world examples
-- - Build trust through valuable, actionable content
-- - Convert engaged subscribers into trial users
-- - Position BuildDesk as the industry thought leader