-- CONTACT FORM FUNNEL SETUP ONLY
-- Simple script to set up just the contact form funnel

-- Step 1: Create the Contact Form Funnel
INSERT INTO public.lead_funnels (
  company_id,
  name,
  description,
  trigger_event,
  is_active,
  total_steps
) VALUES (
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'BuildDesk Contact Form Follow-up Funnel',
  'Lead nurturing sequence for prospects who submitted contact forms',
  'contact_form',
  true,
  5
);

-- Step 2: Get the funnel ID (run this query to see the new funnel ID)
SELECT id, name, trigger_event FROM public.lead_funnels 
WHERE trigger_event = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid;

-- Step 3: Create the Funnel Steps
-- Replace 'YOUR_FUNNEL_ID_HERE' with the actual ID from Step 2, then run this:

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
  ('YOUR_FUNNEL_ID_HERE'::uuid, 1, 'Immediate Response', 'e5b79320-b28b-40f6-89e2-8e25332c34fe'::uuid, 0, 'minutes', true),
  ('YOUR_FUNNEL_ID_HERE'::uuid, 2, 'Case Study Follow-up', 'b941fff7-49fb-48c5-9861-5091e5372056'::uuid, 1, 'days', true),
  ('YOUR_FUNNEL_ID_HERE'::uuid, 3, 'Address Concerns', '5f334663-4f4b-4dd9-8a76-79b44e43f7a2'::uuid, 2, 'days', true),
  ('YOUR_FUNNEL_ID_HERE'::uuid, 4, 'Social Proof', '95a7e96b-dd34-4ab3-81f0-b9ac05e1db64'::uuid, 2, 'days', true),
  ('YOUR_FUNNEL_ID_HERE'::uuid, 5, 'Final Follow-up', 'c52e01bd-aaef-4c2c-9c62-0ec3fd8adf52'::uuid, 2, 'days', true);
*/

-- Step 4: Verify Setup (run after completing Step 3)
/*
SELECT 
  lf.name as funnel_name,
  lf.trigger_event,
  fs.step_order,
  fs.name as step_name,
  et.name as template_name,
  CASE 
    WHEN fs.delay_amount = 0 THEN 'Immediate'
    ELSE fs.delay_amount || ' ' || fs.delay_unit
  END as timing
FROM public.funnel_steps fs
JOIN public.lead_funnels lf ON fs.funnel_id = lf.id
JOIN public.email_templates et ON fs.email_template_id = et.id
WHERE lf.trigger_event = 'contact_form'
ORDER BY fs.step_order;
*/

-- Email Sequence Summary:
-- Day 0 (Immediate): Immediate Response & Next Steps
-- Day 1: Case Study Follow-up (Real contractor success story)
-- Day 3: Address Common Concerns (Objection handling)
-- Day 5: Social Proof & Urgency (Industry stats + offer)
-- Day 7: Final Follow-up (Personal check-in)