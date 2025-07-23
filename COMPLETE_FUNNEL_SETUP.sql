-- COMPLETE FUNNEL SETUP SCRIPT
-- Run this script to set up all three funnels with their email templates

-- =============================================
-- NEWSLETTER FUNNEL STEPS
-- =============================================
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
  ('0f4420cd-76a0-4c1a-a58d-5d4a72d31c7b'::uuid, 1, 'Welcome & Platform Overview', 'c7679014-1ddc-443e-9a91-d5da81579696'::uuid, 0, 'minutes', true),
  
  -- Step 2: Financial Management (Day 3)
  ('0f4420cd-76a0-4c1a-a58d-5d4a72d31c7b'::uuid, 2, 'Financial Management Mastery', '75c29c2d-3fc6-468b-8f94-6c979c4b749f'::uuid, 3, 'days', true),
  
  -- Step 3: Project Management (Day 7)
  ('0f4420cd-76a0-4c1a-a58d-5d4a72d31c7b'::uuid, 3, 'Project Management Excellence', '30c489be-6271-4615-a49b-83e6a8635320'::uuid, 4, 'days', true),
  
  -- Step 4: Client Relationships (Day 10)
  ('0f4420cd-76a0-4c1a-a58d-5d4a72d31c7b'::uuid, 4, 'Client Relationship Excellence', '293064a1-0993-476a-9fe0-b26c497f55cc'::uuid, 3, 'days', true),
  
  -- Step 5: Mobile Team Management (Day 14)
  ('0f4420cd-76a0-4c1a-a58d-5d4a72d31c7b'::uuid, 5, 'Mobile Team Management', '7be023f2-5034-4443-baf6-688c8896a4af'::uuid, 4, 'days', true),
  
  -- Step 6: Industry Future (Day 21)
  ('0f4420cd-76a0-4c1a-a58d-5d4a72d31c7b'::uuid, 6, 'Construction Industry Future', 'eaa7a300-dd9d-4f4f-9e0f-4b37091ccb56'::uuid, 7, 'days', true);

-- =============================================
-- TRIAL FUNNEL STEPS
-- =============================================
INSERT INTO public.funnel_steps (
  funnel_id,
  step_order,
  name,
  email_template_id,
  delay_amount,
  delay_unit,
  is_active
) VALUES
  -- Step 1: Welcome & Setup (Immediate)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 1, 'Welcome & Setup', '2a4d261b-d7d4-4b1a-af70-979dc16c1ac9'::uuid, 0, 'minutes', true),
  
  -- Step 2: Project Dashboard (Day 1)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 2, 'First Win - Project Dashboard', '58948ed3-f7bb-4c06-a5dd-44c692ed25c5'::uuid, 1, 'days', true),
  
  -- Step 3: Mobile Power (Day 2)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 3, 'Mobile Power', 'ef79bc6a-5b44-4585-8ec2-ddfc849d2894'::uuid, 1, 'days', true),
  
  -- Step 4: Automation Magic (Day 3)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 4, 'Automation Magic', '89c456df-6454-40a2-99ce-e807e13a33fe'::uuid, 1, 'days', true),
  
  -- Step 5: The $50K Feature (Day 4)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 5, 'The $50K Feature', 'f1311b6c-86f8-49f7-8803-edfdfa8f9aab'::uuid, 1, 'days', true),
  
  -- Step 6: Document Control (Day 5)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 6, 'Document Control', 'a93ce929-cfbe-4eb4-a1d3-ec714fdd12a6'::uuid, 1, 'days', true),
  
  -- Step 7: Special Offer (Day 12)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 7, 'Win More Bids - Reports', '3b4c30f5-71e4-4a51-95a9-95c053db4c94'::uuid, 7, 'days', true),
  
  -- Step 8: Last Day Offer (Day 13)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 8, 'Last Day Special Offer', 'ef0bbb8f-12f7-4f27-8544-78ae3cddc066'::uuid, 1, 'days', true),
  
  -- Step 9: Final Notice (Day 14)
  ('01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid, 9, 'Final Notice', '8dd1cca5-5612-4c28-b785-70507f36e763'::uuid, 1, 'days', true);

-- =============================================
-- CREATE CONTACT FORM FUNNEL
-- =============================================
INSERT INTO public.lead_funnels (
  company_id,
  name,
  description,
  trigger_event,
  is_active
) VALUES (
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'BuildDesk Contact Form Follow-up Funnel',
  'Lead nurturing sequence for prospects who submitted contact forms but haven''t taken next steps',
  'contact_form',
  true
);

-- Get the contact form funnel ID (run this to get the ID for the next step)
-- You'll need to run this separately and update the INSERT below with the actual funnel ID
/*
SELECT id FROM public.lead_funnels 
WHERE trigger_event = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid;
*/

-- =============================================
-- CONTACT FORM FUNNEL STEPS
-- =============================================
-- IMPORTANT: Replace 'CONTACT_FORM_FUNNEL_ID' with the actual ID from the query above
-- Then uncomment and run this section:

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
  -- Step 1: Immediate Response (Immediate)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 1, 'Immediate Response & Next Steps', 'e5b79320-b28b-40f6-89e2-8e25332c34fe'::uuid, 0, 'minutes', true),
  
  -- Step 2: Case Study Follow-up (Day 1)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 2, 'Case Study Follow-up', 'b941fff7-49fb-48c5-9861-5091e5372056'::uuid, 1, 'days', true),
  
  -- Step 3: Address Common Concerns (Day 3)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 3, 'Address Common Concerns', '5f334663-4f4b-4dd9-8a76-79b44e43f7a2'::uuid, 2, 'days', true),
  
  -- Step 4: Social Proof & Urgency (Day 5)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 4, 'Social Proof & Urgency', '95a7e96b-dd34-4ab3-81f0-b9ac05e1db64'::uuid, 2, 'days', true),
  
  -- Step 5: Final Follow-up (Day 7)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 5, 'Final Follow-up', 'c52e01bd-aaef-4c2c-9c62-0ec3fd8adf52'::uuid, 2, 'days', true);
*/

-- =============================================
-- UPDATE FUNNEL TOTALS
-- =============================================
UPDATE public.lead_funnels 
SET total_steps = 6 
WHERE id = '0f4420cd-76a0-4c1a-a58d-5d4a72d31c7b'::uuid; -- Newsletter funnel

UPDATE public.lead_funnels 
SET total_steps = 9 
WHERE id = '01bd5bfe-1167-49dd-ad34-91cdb6910e64'::uuid; -- Trial funnel

-- Update contact form funnel total (run after creating the steps)
/*
UPDATE public.lead_funnels 
SET total_steps = 5 
WHERE trigger_event = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid;
*/

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check all funnels
SELECT 
  id,
  name,
  trigger_event,
  total_steps,
  is_active
FROM public.lead_funnels 
WHERE company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid
ORDER BY trigger_event;

-- Check Newsletter Funnel Steps
SELECT 
  lf.name as funnel_name,
  fs.step_order,
  fs.name as step_name,
  et.name as template_name,
  fs.delay_amount || ' ' || fs.delay_unit as timing
FROM public.funnel_steps fs
JOIN public.lead_funnels lf ON fs.funnel_id = lf.id
JOIN public.email_templates et ON fs.email_template_id = et.id
WHERE lf.trigger_event = 'newsletter_signup'
ORDER BY fs.step_order;

-- Check Trial Funnel Steps
SELECT 
  lf.name as funnel_name,
  fs.step_order,
  fs.name as step_name,
  et.name as template_name,
  fs.delay_amount || ' ' || fs.delay_unit as timing
FROM public.funnel_steps fs
JOIN public.lead_funnels lf ON fs.funnel_id = lf.id
JOIN public.email_templates et ON fs.email_template_id = et.id
WHERE lf.trigger_event = 'trial_signup'
ORDER BY fs.step_order;

-- Check Contact Form Funnel Steps (run after setting up contact form steps)
/*
SELECT 
  lf.name as funnel_name,
  fs.step_order,
  fs.name as step_name,
  et.name as template_name,
  fs.delay_amount || ' ' || fs.delay_unit as timing
FROM public.funnel_steps fs
JOIN public.lead_funnels lf ON fs.funnel_id = lf.id
JOIN public.email_templates et ON fs.email_template_id = et.id
WHERE lf.trigger_event = 'contact_form'
ORDER BY fs.step_order;
*/