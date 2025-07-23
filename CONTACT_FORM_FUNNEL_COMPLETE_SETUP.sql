-- Complete Contact Form Funnel Setup
-- Run this after the main setup script to complete the contact form funnel

-- Step 1: Get the contact form funnel ID
-- (Run this query first and note the ID)
SELECT id, name FROM public.lead_funnels 
WHERE trigger_event = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid;

-- Step 2: Get the contact form template IDs
-- (Run this query and note the IDs)
SELECT id, name FROM public.email_templates 
WHERE category = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid
ORDER BY name;

-- Step 3: Create the contact form funnel steps
-- Replace the UUIDs below with the actual IDs from the queries above

-- Template mapping (update these with actual IDs):
-- 'Contact Form - Address Concerns' -> ADDRESS_CONCERNS_ID
-- 'Contact Form - Case Study Follow-up' -> CASE_STUDY_ID  
-- 'Contact Form - Final Follow-up' -> FINAL_FOLLOWUP_ID
-- 'Contact Form - Immediate Response' -> IMMEDIATE_RESPONSE_ID
-- 'Contact Form - Social Proof' -> SOCIAL_PROOF_ID

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
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 1, 'Immediate Response & Next Steps', 'IMMEDIATE_RESPONSE_ID'::uuid, 0, 'minutes', true),
  
  -- Step 2: Case Study Follow-up (Day 1)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 2, 'Case Study Follow-up', 'CASE_STUDY_ID'::uuid, 1, 'days', true),
  
  -- Step 3: Address Common Concerns (Day 3)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 3, 'Address Common Concerns', 'ADDRESS_CONCERNS_ID'::uuid, 2, 'days', true),
  
  -- Step 4: Social Proof & Urgency (Day 5)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 4, 'Social Proof & Urgency', 'SOCIAL_PROOF_ID'::uuid, 2, 'days', true),
  
  -- Step 5: Final Follow-up (Day 7)
  ('CONTACT_FORM_FUNNEL_ID'::uuid, 5, 'Final Follow-up', 'FINAL_FOLLOWUP_ID'::uuid, 2, 'days', true);

-- Step 4: Update the total_steps count
UPDATE public.lead_funnels 
SET total_steps = 5 
WHERE trigger_event = 'contact_form' 
AND company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid;
*/

-- Step 5: Verify the contact form funnel is set up correctly
SELECT 
  lf.name as funnel_name,
  lf.trigger_event,
  lf.total_steps,
  fs.step_order,
  fs.name as step_name,
  et.name as template_name,
  fs.delay_amount,
  fs.delay_unit
FROM public.funnel_steps fs
JOIN public.lead_funnels lf ON fs.funnel_id = lf.id
LEFT JOIN public.email_templates et ON fs.email_template_id = et.id
WHERE lf.trigger_event = 'contact_form'
AND lf.company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid
ORDER BY fs.step_order;