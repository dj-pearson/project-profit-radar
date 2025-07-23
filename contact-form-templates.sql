-- Contact Form Follow-up Email Templates for BuildDesk
-- Using existing company ID for system templates

-- Email 1: Immediate Response & Next Steps (Immediate)
INSERT INTO public.email_templates (
  company_id,
  name,
  subject,
  content,
  template_type,
  category,
  variables,
  is_system_template
) VALUES
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Contact Form - Immediate Response',
  'Thanks for reaching out! Here''s what happens next...',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Thanks for contacting BuildDesk!</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>I just received your inquiry about BuildDesk, and I wanted to reach out personally to help answer your questions.</p>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 18px;">Your inquiry has been prioritized</h2>
      <p style="margin-bottom: 0;">A BuildDesk specialist will personally review your message and respond within 2 hours during business hours.</p>
    </div>
    
    <h2 style="color: #1a365d;">While you wait, here''s what other contractors ask about:</h2>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1a365d; margin-top: 0; font-size: 16px;">🚀 Quick Setup & Implementation</h3>
      <p style="margin-bottom: 0;">"How fast can we get up and running?" Most contractors are fully operational within 48 hours, with our team handling the entire setup process.</p>
    </div>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1a365d; margin-top: 0; font-size: 16px;">💰 ROI & Cost Savings</h3>
      <p style="margin-bottom: 0;">"What''s the return on investment?" Our customers typically save $3,000-$8,000 per project through better change order tracking and reduced admin time.</p>
    </div>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1a365d; margin-top: 0; font-size: 16px;">📱 Team Adoption</h3>
      <p style="margin-bottom: 0;">"Will my crew actually use it?" Our mobile app is designed for construction workers - 95% of crews are actively using it within one week.</p>
    </div>
    
    <h2 style="color: #1a365d;">Want to see it in action right now?</h2>
    <p>Don''t wait for a response - you can explore BuildDesk immediately:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/demo" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">Watch 5-Min Demo</a>
      <a href="https://builddesk.com/trial" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Start Free Trial</a>
    </div>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #d97706; margin-top: 0;">⚡ Urgent Project Deadline?</h3>
      <p style="margin-bottom: 10px;">If you need BuildDesk set up quickly for an active project, call our rapid deployment team:</p>
      <p style="margin-bottom: 0; font-weight: bold; font-size: 18px;">📞 (555) 123-4567</p>
    </div>
    
    <p>I''ll personally follow up within 2 hours to address your specific questions.</p>
    
    <p>Best regards,<br>
    <strong>Sarah Johnson</strong><br>
    Construction Solutions Specialist<br>
    BuildDesk</p>
    
    <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; color: #718096; font-size: 14px;">
      <p>BuildDesk - Professional Construction Management</p>
      <p>Questions? Reply to this email or call (555) 123-4567</p>
    </div>
  </div>',
  'automation',
  'contact_form',
  '["first_name", "last_name", "email", "company", "message"]'::jsonb,
  true
),

-- Email 2: Follow-up with Case Study (Day 1)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Contact Form - Case Study Follow-up',
  'How contractor Mike saved $47K in his first month (real numbers)',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Real Results from a Real Contractor</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Yesterday you reached out about BuildDesk. I wanted to share a recent success story that might answer some of your questions.</p>
    
    <div style="background: #f0fdf4; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <h2 style="color: #16a34a; margin-top: 0; font-size: 20px;">Mike''s Construction - 90 Days with BuildDesk</h2>
      <p style="margin-bottom: 15px;"><strong>Company:</strong> Mid-size general contractor, 25 employees</p>
      <p style="margin-bottom: 15px;"><strong>Challenge:</strong> Losing money on change orders, crews scattered across 8 job sites</p>
      <p style="margin-bottom: 0;"><strong>Results after 90 days:</strong></p>
    </div>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1a365d; margin-top: 0;">💰 Financial Impact:</h3>
      <ul style="line-height: 1.8; margin-bottom: 0;">
        <li><strong>$47,000 recovered</strong> in previously unbilled change orders</li>
        <li><strong>$12,000 monthly savings</strong> in admin time (was paying overtime for office work)</li>
        <li><strong>15% profit margin increase</strong> through better job costing</li>
        <li><strong>$8,500 insurance discount</strong> for digital safety tracking</li>
      </ul>
    </div>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">⏱️ Time Savings:</h3>
      <ul style="line-height: 1.8; margin-bottom: 0;">
        <li><strong>6 hours → 45 minutes:</strong> Weekly project status meetings</li>
        <li><strong>4 hours → 20 minutes:</strong> Daily crew coordination</li>
        <li><strong>3 hours → 15 minutes:</strong> Client update calls</li>
        <li><strong>8 hours → 2 hours:</strong> Monthly financial reporting</li>
      </ul>
    </div>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #d97706; margin-top: 0;">🎯 Operational Improvements:</h3>
      <ul style="line-height: 1.8; margin-bottom: 0;">
        <li><strong>98% crew adoption</strong> of mobile app within 2 weeks</li>
        <li><strong>Zero missed change orders</strong> in the last 60 days</li>
        <li><strong>45% faster client approvals</strong> through digital workflows</li>
        <li><strong>60% reduction</strong> in safety incidents</li>
      </ul>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #16a34a;">
      <p style="font-style: italic; font-size: 18px; margin-bottom: 15px;">"BuildDesk didn''t just save us money - it gave me my life back. I''m not chasing project updates until 9 PM anymore."</p>
      <p style="margin-bottom: 0; font-weight: bold;">- Mike Rodriguez, Rodriguez Construction</p>
    </div>
    
    <h2 style="color: #1a365d;">Could BuildDesk deliver similar results for your business?</h2>
    
    <p>The best way to find out is to see it in action with your own projects:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/book-demo" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">Book Personal Demo</a>
      <a href="https://builddesk.com/trial" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Start Free Trial</a>
    </div>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">Questions about implementation?</h3>
      <p style="margin-bottom: 10px;">I''m here to help. Common questions I answer:</p>
      <ul style="line-height: 1.6; margin-bottom: 10px;">
        <li>How long does setup take for a company your size?</li>
        <li>What''s the learning curve for existing processes?</li>
        <li>How do you handle data migration from current systems?</li>
        <li>What kind of support is available during rollout?</li>
      </ul>
      <p style="margin-bottom: 0;">Reply to this email or call me directly: <strong>(555) 123-4567</strong></p>
    </div>
    
    <p>Looking forward to helping you achieve similar results.</p>
    
    <p>Best regards,<br>
    <strong>Sarah Johnson</strong><br>
    Construction Solutions Specialist<br>
    BuildDesk</p>
  </div>',
  'automation',
  'contact_form',
  '["first_name", "last_name", "email", "company", "message"]'::jsonb,
  true
),

-- Email 3: Address Common Concerns (Day 3)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Contact Form - Address Concerns',
  'The 3 biggest concerns about construction software (and honest answers)',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Let''s Address the Elephant in the Room</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>After 8 years helping contractors implement management software, I''ve heard every concern, objection, and horror story.</p>
    
    <p>Let me address the 3 biggest concerns honestly:</p>
    
    <div style="background: #fef2f2; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <h2 style="color: #dc2626; margin-top: 0; font-size: 20px;">😤 Concern #1: "My crew will never use it"</h2>
      <p style="margin-bottom: 15px;"><strong>I get it.</strong> You''ve probably tried software before and watched it collect digital dust.</p>
      <p style="margin-bottom: 15px;"><strong>The difference:</strong> BuildDesk was built BY contractors FOR contractors. The mobile app takes 15 seconds to clock in, works offline, and actually makes their job easier.</p>
      <p style="margin-bottom: 15px;"><strong>Real stats:</strong></p>
      <ul style="margin-bottom: 15px;">
        <li>95% crew adoption rate within 1 week</li>
        <li>Average age of users: 47 years old</li>
        <li>Most common feedback: "Finally, something that works"</li>
      </ul>
      <p style="margin-bottom: 0;"><strong>Guarantee:</strong> If your crew isn''t actively using it after 30 days, we''ll refund your money.</p>
    </div>
    
    <div style="background: #fffbeb; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
      <h2 style="color: #d97706; margin-top: 0; font-size: 20px;">💸 Concern #2: "It''s too expensive"</h2>
      <p style="margin-bottom: 15px;"><strong>Let''s do the math.</strong> BuildDesk costs $89/month for unlimited users.</p>
      <p style="margin-bottom: 15px;"><strong>What you''re currently losing:</strong></p>
      <ul style="margin-bottom: 15px;">
        <li>$2,000-5,000 per project in unbilled change orders</li>
        <li>$800/month in admin overtime</li>
        <li>$1,200/month in miscommunication delays</li>
        <li>$500/month in lost tool/equipment tracking</li>
      </ul>
      <p style="margin-bottom: 15px;"><strong>Average savings:</strong> $4,500/month</p>
      <p style="margin-bottom: 0;"><strong>ROI:</strong> BuildDesk pays for itself 50x over. The question isn''t whether you can afford it - it''s whether you can afford NOT to have it.</p>
    </div>
    
    <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">⏰ Concern #3: "We don''t have time to implement new software"</h2>
      <p style="margin-bottom: 15px;"><strong>I hear this every day.</strong> You''re already overwhelmed - who has time for a software rollout?</p>
      <p style="margin-bottom: 15px;"><strong>Here''s the reality:</strong> Our implementation team does 90% of the work for you.</p>
      <p style="margin-bottom: 15px;"><strong>What we handle:</strong></p>
      <ul style="margin-bottom: 15px;">
        <li>Complete system setup (2 hours of your time max)</li>
        <li>Data migration from existing systems</li>
        <li>Team training sessions</li>
        <li>Custom workflow configuration</li>
        <li>30 days of white-glove support</li>
      </ul>
      <p style="margin-bottom: 0;"><strong>Timeline:</strong> Most contractors are fully operational within 48 hours.</p>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #16a34a;">
      <h2 style="color: #16a34a; margin-top: 0;">The Bottom Line</h2>
      <p style="margin-bottom: 15px;">Every day you wait is money left on the table:</p>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>Average contractor loses $150/day in inefficiencies</li>
        <li>That''s $54,750 per year in lost profit</li>
        <li>BuildDesk costs $1,068 per year</li>
      </ul>
      <p style="margin-bottom: 0; font-weight: bold; font-size: 18px;">Net benefit: $53,682 annually</p>
    </div>
    
    <h2 style="color: #1a365d;">Ready to see if BuildDesk is right for your business?</h2>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/book-demo" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">Book a Demo Call</a>
      <a href="https://builddesk.com/trial" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Start Free Trial</a>
    </div>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1a365d; margin-top: 0;">Still have concerns?</h3>
      <p style="margin-bottom: 10px;">I''ve probably heard them before. Let''s talk:</p>
      <ul style="line-height: 1.6; margin-bottom: 10px;">
        <li>📞 Call me directly: (555) 123-4567</li>
        <li>📧 Reply to this email with your questions</li>
        <li>💬 Live chat at builddesk.com</li>
      </ul>
      <p style="margin-bottom: 0;">I''m here to give you honest answers, not a sales pitch.</p>
    </div>
    
    <p>Looking forward to addressing your specific concerns.</p>
    
    <p>Best regards,<br>
    <strong>Sarah Johnson</strong><br>
    Construction Solutions Specialist<br>
    BuildDesk</p>
  </div>',
  'automation',
  'contact_form',
  '["first_name", "last_name", "email", "company", "message"]'::jsonb,
  true
),

-- Email 4: Social Proof & Urgency (Day 5)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Contact Form - Social Proof',
  'Why 847 contractors chose BuildDesk this month',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">You''re Not Alone in This Decision</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>This month, 847 contractors made the switch to BuildDesk. Here''s why:</p>
    
    <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">📊 The Numbers Don''t Lie</h2>
      <ul style="line-height: 1.8; margin-bottom: 0;">
        <li><strong>4.9/5 stars</strong> average rating (500+ reviews)</li>
        <li><strong>98% customer retention</strong> rate</li>
        <li><strong>$4.2M recovered</strong> in missed change orders this quarter</li>
        <li><strong>2.3 hours saved</strong> per day per contractor</li>
        <li><strong>67% faster</strong> project completion times</li>
      </ul>
    </div>
    
    <h2 style="color: #1a365d;">What Contractors Are Saying This Week:</h2>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-style: italic; margin-bottom: 15px;">"We caught a $23,000 change order that would have been forgotten. BuildDesk paid for itself in the first week."</p>
      <p style="margin-bottom: 0;"><strong>- Tom Wilson, Wilson Construction (Joined Monday)</strong></p>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-style: italic; margin-bottom: 15px;">"My crew loves the mobile app. They''re actually asking to use it on other projects now."</p>
      <p style="margin-bottom: 0;"><strong>- Lisa Martinez, Martinez Builders (Joined Wednesday)</strong></p>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-style: italic; margin-bottom: 15px;">"Setup took 3 hours total. We were managing all our projects by Thursday."</p>
      <p style="margin-bottom: 0;"><strong>- Dave Chen, Pacific Construction (Joined Friday)</strong></p>
    </div>
    
    <h2 style="color: #1a365d;">Why the Rush to Switch?</h2>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #d97706; margin-top: 0;">🏗️ Busy Construction Season</h3>
      <p style="margin-bottom: 0;">Smart contractors are getting organized NOW before their busy season hits. Summer project volume is up 34% this year - can your current system handle it?</p>
    </div>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">💰 Economic Pressure</h3>
      <p style="margin-bottom: 0;">With material costs up 18% and labor costs up 12%, contractors can''t afford to lose money on inefficiencies. Every missed change order or overtime hour hurts more than ever.</p>
    </div>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #dc2626; margin-top: 0;">⚠️ Competition</h3>
      <p style="margin-bottom: 0;">Contractors using BuildDesk are winning more bids with data-driven proposals. They''re completing projects faster and delivering better client experiences. Don''t get left behind.</p>
    </div>
    
    <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 25px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #16a34a; margin-top: 0;">Special Offer - This Week Only</h2>
      <p style="margin-bottom: 15px;">Since you contacted us this week, you qualify for our Q2 Implementation Special:</p>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>✅ <strong>50% off first 3 months</strong> ($44.50/month instead of $89)</li>
        <li>✅ <strong>Free priority setup</strong> (completed within 24 hours)</li>
        <li>✅ <strong>Free data migration</strong> from any existing system</li>
        <li>✅ <strong>Dedicated success manager</strong> for 90 days</li>
        <li>✅ <strong>Money-back guarantee</strong> if not satisfied</li>
      </ul>
      <p style="margin-bottom: 0; font-weight: bold; color: #dc2626;">Offer expires Sunday at midnight.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/special-offer" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 18px;">Claim Special Offer</a>
    </div>
    
    <h2 style="color: #1a365d;">Don''t Wait - Here''s Why:</h2>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin-bottom: 15px;"><strong>Every week you delay costs you:</strong></p>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>$1,050 in lost efficiency</li>
        <li>$2,400 in potential missed change orders</li>
        <li>$600 in unnecessary admin overtime</li>
        <li>$300 in client communication delays</li>
      </ul>
      <p style="margin-bottom: 0; font-weight: bold;">Total weekly cost of waiting: $4,350</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/book-demo" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">Book Demo Call</a>
      <a href="https://builddesk.com/trial" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Start Free Trial</a>
    </div>
    
    <p>Join the 847 contractors who made the smart decision this month.</p>
    
    <p>Best regards,<br>
    <strong>Sarah Johnson</strong><br>
    Construction Solutions Specialist<br>
    BuildDesk</p>
    
    <p style="font-size: 14px; color: #666;"><strong>P.S.</strong> This special pricing ends Sunday. After that, you''ll pay full price and wait in line for implementation.</p>
  </div>',
  'automation',
  'contact_form',
  '["first_name", "last_name", "email", "company", "message"]'::jsonb,
  true
),

-- Email 5: Final Follow-up (Day 7)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Contact Form - Final Follow-up',
  'One last question before I close your file...',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Before I Close Your File...</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>It''s been a week since you contacted us about BuildDesk, and I haven''t heard back from you.</p>
    
    <p>Before I close your file and move on, I have one question:</p>
    
    <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; text-align: center;">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">What would have to be true for BuildDesk to be a no-brainer decision for you?</h2>
    </div>
    
    <p>I ask because maybe I missed something important in my previous emails.</p>
    
    <h2 style="color: #1a365d;">Is it...</h2>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 15px 0;">
      <h3 style="color: #d97706; margin-top: 0; font-size: 16px;">💰 Price?</h3>
      <p style="margin-bottom: 0;">I can work with you on pricing. We have payment plans and ROI guarantees.</p>
    </div>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 15px 0;">
      <h3 style="color: #dc2626; margin-top: 0; font-size: 16px;">⏰ Timing?</h3>
      <p style="margin-bottom: 0;">We can schedule implementation when it works for you - even during your slow season.</p>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 15px 0;">
      <h3 style="color: #16a34a; margin-top: 0; font-size: 16px;">🤔 Not sure it''s right for your business?</h3>
      <p style="margin-bottom: 0;">Let''s do a 15-minute assessment call. I''ll tell you honestly if BuildDesk is a good fit.</p>
    </div>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 15px 0;">
      <h3 style="color: #2563eb; margin-top: 0; font-size: 16px;">❓ Still have questions?</h3>
      <p style="margin-bottom: 0;">I''m here to answer them. No pressure, just honest information.</p>
    </div>
    
    <div style="background: #f7fafc; padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #1a365d;">
      <h2 style="color: #1a365d; margin-top: 0;">Here''s What I Can Do</h2>
      <p style="margin-bottom: 15px;">If you reply to this email with your biggest concern, I''ll:</p>
      <ul style="line-height: 1.6; margin-bottom: 15px;">
        <li>✅ Give you an honest assessment</li>
        <li>✅ Show you exactly how BuildDesk would work for your situation</li>
        <li>✅ Provide real references from similar contractors</li>
        <li>✅ Work out a solution that fits your budget and timeline</li>
      </ul>
      <p style="margin-bottom: 0;">Even if BuildDesk isn''t right for you, I''ll point you in the right direction.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="mailto:sarah@builddesk.com?subject=My biggest concern about BuildDesk" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Tell Me Your Biggest Concern</a>
    </div>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #d97706; margin-top: 0;">Or, if you''re ready to move forward:</h3>
      <div style="text-align: center; margin: 15px 0;">
        <a href="https://builddesk.com/book-demo" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">Book Demo Call</a>
        <a href="https://builddesk.com/trial" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Start Free Trial</a>
      </div>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #16a34a; margin-top: 0;">Not interested? No problem.</h3>
      <p style="margin-bottom: 10px;">I respect your decision. If you''d prefer not to receive these emails, just reply with "REMOVE" and I''ll take you off the list immediately.</p>
      <p style="margin-bottom: 0;">But if there''s a chance BuildDesk could help your business, I''d hate for you to miss out because I didn''t explain something clearly.</p>
    </div>
    
    <p>Either way, I''d love to hear from you.</p>
    
    <p>Best regards,<br>
    <strong>Sarah Johnson</strong><br>
    Construction Solutions Specialist<br>
    BuildDesk</p>
    
    <p style="font-size: 14px; color: #666;"><strong>Direct:</strong> (555) 123-4567 | <strong>Email:</strong> sarah@builddesk.com</p>
  </div>',
  'automation',
  'contact_form',
  '["first_name", "last_name", "email", "company", "message"]'::jsonb,
  true
);