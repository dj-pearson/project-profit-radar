-- Complete Contact Form Funnel Setup
-- This script creates the contact form funnel and connects all templates

-- Step 1: Create the Contact Form Funnel
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

-- Step 2: Get the newly created funnel ID
-- (You'll need this for the next step - run this query and note the ID)
SELECT id, name FROM public.lead_funnels 
WHERE trigger_event = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid;

-- Step 3: Create Contact Form Funnel Steps
-- Replace 'FUNNEL_ID_HERE' with the actual funnel ID from Step 2

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
  ('FUNNEL_ID_HERE'::uuid, 1, 'Immediate Response & Next Steps', 'e5b79320-b28b-40f6-89e2-8e25332c34fe'::uuid, 0, 'minutes', true),
  
  -- Step 2: Case Study Follow-up (Day 1)
  ('FUNNEL_ID_HERE'::uuid, 2, 'Case Study Follow-up', 'b941fff7-49fb-48c5-9861-5091e5372056'::uuid, 1, 'days', true),
  
  -- Step 3: Address Common Concerns (Day 3)
  ('FUNNEL_ID_HERE'::uuid, 3, 'Address Common Concerns', '5f334663-4f4b-4dd9-8a76-79b44e43f7a2'::uuid, 2, 'days', true),
  
  -- Step 4: Social Proof & Urgency (Day 5)
  ('FUNNEL_ID_HERE'::uuid, 4, 'Social Proof & Urgency', '95a7e96b-dd34-4ab3-81f0-b9ac05e1db64'::uuid, 2, 'days', true),
  
  -- Step 5: Final Follow-up (Day 7)
  ('FUNNEL_ID_HERE'::uuid, 5, 'Final Follow-up', 'c52e01bd-aaef-4c2c-9c62-0ec3fd8adf52'::uuid, 2, 'days', true);

-- Step 4: Update the total_steps count
UPDATE public.lead_funnels 
SET total_steps = 5 
WHERE trigger_event = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid;

-- Step 5: Verify the Contact Form Funnel Setup
SELECT 
  lf.name as funnel_name,
  lf.trigger_event,
  lf.total_steps,
  lf.is_active,
  fs.step_order,
  fs.name as step_name,
  et.name as template_name,
  fs.delay_amount,
  fs.delay_unit,
  fs.is_active as step_active
FROM public.funnel_steps fs
JOIN public.lead_funnels lf ON fs.funnel_id = lf.id
LEFT JOIN public.email_templates et ON fs.email_template_id = et.id
WHERE lf.trigger_event = 'contact_form'
AND lf.company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid
ORDER BY fs.step_order;