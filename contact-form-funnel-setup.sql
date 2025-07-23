-- Contact Form Follow-up Funnel Setup
-- This script demonstrates how to create a contact form follow-up funnel

-- Step 1: Create the contact form funnel
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
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'BuildDesk Contact Form Follow-up Funnel',
  'Lead nurturing sequence for prospects who submitted contact forms but haven''t taken next steps',
  'contact_form',
  true
);
*/

-- Step 2: Create funnel steps with the email templates
-- Note: These would reference the actual template IDs after insertion

-- Get template IDs (example query)
/*
SELECT id, name FROM public.email_templates 
WHERE name LIKE 'Contact Form%' 
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
  -- Step 1: Immediate Response (Immediate)
  ('funnel-id-here'::uuid, 1, 'Immediate Response & Next Steps', 'template-1-id'::uuid, 0, 'minutes', true),
  
  -- Step 2: Case Study Follow-up (Day 1)
  ('funnel-id-here'::uuid, 2, 'Case Study Follow-up', 'template-2-id'::uuid, 1, 'days', true),
  
  -- Step 3: Address Common Concerns (Day 3)
  ('funnel-id-here'::uuid, 3, 'Address Common Concerns', 'template-3-id'::uuid, 2, 'days', true),
  
  -- Step 4: Social Proof & Urgency (Day 5)
  ('funnel-id-here'::uuid, 4, 'Social Proof & Urgency', 'template-4-id'::uuid, 2, 'days', true),
  
  -- Step 5: Final Follow-up (Day 7)
  ('funnel-id-here'::uuid, 5, 'Final Follow-up', 'template-5-id'::uuid, 2, 'days', true);
*/

-- Step 3: Test adding a subscriber to the funnel
-- Use the built-in function to add subscribers
/*
SELECT public.add_subscriber_to_funnel(
  'funnel-id-here'::uuid,
  'test@example.com',
  'John',
  'Doe',
  'contact_form'
);
*/

-- Contact Form Funnel Email Schedule:
-- Day 0 (Immediate): Immediate Response & Next Steps
-- Day 1: Case Study Follow-up
-- Day 3: Address Common Concerns  
-- Day 5: Social Proof & Urgency
-- Day 7: Final Follow-up

-- Key Features of This Contact Form Funnel:
-- 
-- 1. Immediate Response: Acknowledges inquiry within minutes
-- 2. Value-First Approach: Provides helpful information before selling
-- 3. Objection Handling: Addresses common concerns proactively
-- 4. Social Proof: Real customer stories and statistics
-- 5. Urgency Creation: Time-sensitive offers and competitive pressure
-- 6. Personal Touch: Written from individual specialist perspective
-- 7. Multiple CTAs: Demo booking and trial options throughout
-- 8. Respectful Exit: Offers easy unsubscribe in final email
-- 9. Direct Contact: Phone numbers and email for personal response
-- 10. Problem-Solution Focus: Addresses specific contractor pain points

-- This funnel is designed to:
-- - Quickly respond to contact form inquiries
-- - Build trust through valuable content and case studies
-- - Address common objections before they become barriers
-- - Create urgency through social proof and limited-time offers  
-- - Convert interested prospects into demos or trials
-- - Maintain professional relationship even if prospect isn't ready

-- Integration with Contact Forms:
-- When a contact form is submitted on the website, trigger this funnel by:
-- 1. Creating an email subscriber record
-- 2. Adding them to this funnel with trigger_event = 'contact_form'
-- 3. The first email will be sent immediately
-- 4. Subsequent emails follow the scheduled timing

-- Sample Contact Form Integration Code:
/*
// Frontend contact form submission
async function submitContactForm(formData) {
  const response = await fetch('/api/contact-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      company: formData.company,
      message: formData.message,
      source: 'website_contact_form'
    })
  });
  
  if (response.ok) {
    // Show success message
    // Funnel will be triggered automatically on backend
  }
}
*/

-- Backend API Handler:
/*
// API route: /api/contact-form
export async function POST(request) {
  const { firstName, lastName, email, company, message, source } = await request.json();
  
  // Get the contact form funnel ID
  const { data: funnel } = await supabase
    .from('lead_funnels')
    .select('id')
    .eq('trigger_event', 'contact_form')
    .eq('is_active', true)
    .single();
  
  if (funnel) {
    // Add subscriber to funnel (this triggers the email sequence)
    await supabase.rpc('add_subscriber_to_funnel', {
      p_funnel_id: funnel.id,
      p_email: email,
      p_first_name: firstName,
      p_last_name: lastName,
      p_source: source
    });
  }
  
  // Also save the contact form submission for sales team follow-up
  await supabase
    .from('contact_form_submissions')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: email,
      company: company,
      message: message,
      source: source
    });
  
  return Response.json({ success: true });
}
*/