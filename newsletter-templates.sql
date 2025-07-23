-- Newsletter Email Templates for BuildDesk
-- Using existing company ID for system templates

-- Email 1: Welcome & Platform Overview (Immediate)
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
  'Newsletter Welcome - Platform Overview',
  'Welcome to BuildDesk - Your Construction Management Solution',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 10px;">Welcome to BuildDesk!</h1>
      <p style="color: #4a5568; font-size: 16px;">Your all-in-one construction management platform</p>
    </div>
    
    <p>Hi {{first_name}},</p>
    
    <p>Welcome to the BuildDesk community! We''re excited to help you streamline your construction business with our comprehensive management platform.</p>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #1a365d; font-size: 18px; margin-bottom: 15px;">What makes BuildDesk different?</h2>
      <ul style="color: #4a5568; line-height: 1.6;">
        <li>✅ <strong>Real-time job costing</strong> - Track expenses as they happen</li>
        <li>✅ <strong>Mobile-first design</strong> - Work from anywhere, on any device</li>
        <li>✅ <strong>Financial control</strong> - Budget vs actual tracking with alerts</li>
        <li>✅ <strong>Team collaboration</strong> - Keep everyone on the same page</li>
        <li>✅ <strong>Client transparency</strong> - Dedicated client portal</li>
      </ul>
    </div>
    
    <p>Over the next few days, I''ll be sharing valuable insights about construction management best practices, industry trends, and how to maximize your productivity with BuildDesk.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/demo" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Watch Platform Demo</a>
    </div>
    
    <p>To your success,<br>
    The BuildDesk Team</p>
    
    <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; color: #718096; font-size: 14px;">
      <p>BuildDesk - Professional Construction Management</p>
      <p>Questions? Reply to this email or visit our <a href="https://builddesk.com/support" style="color: #2563eb;">help center</a></p>
    </div>
  </div>',
  'marketing',
  'newsletter',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 2: Financial Management Deep Dive (Day 3)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Newsletter - Financial Management Mastery',
  'How to Never Lose Money on a Project Again',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">The #1 Reason Construction Projects Fail</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Did you know that <strong>70% of construction projects</strong> go over budget? The main culprit? Lack of real-time financial visibility.</p>
    
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
      <h3 style="color: #dc2626; margin-top: 0;">The Traditional Problem:</h3>
      <p style="margin-bottom: 0;">By the time you realize a project is over budget, it''s too late to course-correct. You''re looking at historical data, not real-time information.</p>
    </div>
    
    <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">The BuildDesk Solution:</h3>
      <ul style="margin-bottom: 0;">
        <li><strong>Live job costing</strong> - See expenses as they happen</li>
        <li><strong>Budget alerts</strong> - Get notified before you go over</li>
        <li><strong>Variance analysis</strong> - Understand where money is going</li>
        <li><strong>Cash flow forecasting</strong> - Plan for upcoming expenses</li>
      </ul>
    </div>
    
    <h2 style="color: #1a365d;">Real Customer Success Story</h2>
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="font-style: italic; margin-bottom: 15px;">"Before BuildDesk, we were losing 8-12% on every project due to cost overruns. Now we consistently hit our margins and have increased profitability by 15%."</p>
      <p style="margin-bottom: 0;"><strong>- Sarah Mitchell, Mitchell Construction</strong></p>
    </div>
    
    <h3 style="color: #1a365d;">Quick Win: The 80/20 Rule for Construction Finance</h3>
    <p>Focus on tracking these 4 cost categories that typically account for 80% of overruns:</p>
    <ol>
      <li><strong>Labor costs</strong> - Track actual vs estimated hours daily</li>
      <li><strong>Material costs</strong> - Monitor delivery receipts and waste</li>
      <li><strong>Subcontractor costs</strong> - Manage change orders proactively</li>
      <li><strong>Equipment costs</strong> - Track usage and maintenance</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/financial-features" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">See Financial Features</a>
    </div>
    
    <p>Tomorrow, I''ll share how to leverage technology for better project scheduling and team coordination.</p>
    
    <p>Stay profitable,<br>
    The BuildDesk Team</p>
  </div>',
  'marketing',
  'newsletter',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 3: Project Management & Scheduling (Day 7)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Newsletter - Project Management Excellence',
  'The Secret to On-Time, On-Budget Projects',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Why 90% of Construction Projects Are Late</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Here''s a harsh reality: Only <strong>10% of construction projects</strong> finish on time and on budget. But it doesn''t have to be this way.</p>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #dc2626; margin-top: 0;">Common Project Management Mistakes:</h3>
      <ul>
        <li>❌ Using outdated scheduling methods (spreadsheets, whiteboards)</li>
        <li>❌ Poor communication between field and office</li>
        <li>❌ Reactive change order management</li>
        <li>❌ No real-time progress tracking</li>
      </ul>
    </div>
    
    <h2 style="color: #1a365d;">The BuildDesk Project Management System</h2>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">📅 Smart Scheduling</h3>
      <ul>
        <li>Drag-and-drop Gantt charts</li>
        <li>Automatic dependency tracking</li>
        <li>Resource allocation optimization</li>
        <li>Weather delay adjustments</li>
      </ul>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #16a34a; margin-top: 0;">📱 Mobile-First Coordination</h3>
      <ul>
        <li>Daily reports from the field</li>
        <li>Photo documentation with GPS</li>
        <li>Instant messaging between teams</li>
        <li>Offline capability for remote sites</li>
      </ul>
    </div>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #d97706; margin-top: 0;">📊 Real-Time Progress Tracking</h3>
      <ul>
        <li>Live project dashboards</li>
        <li>Milestone completion tracking</li>
        <li>Automated progress reports</li>
        <li>Predictive completion dates</li>
      </ul>
    </div>
    
    <h3 style="color: #1a365d;">Pro Tip: The 3-Day Rule</h3>
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin-bottom: 0;">Always plan your next 3 days in detail, the next 3 weeks in general, and the next 3 months strategically. This gives you the right balance of detailed execution and strategic flexibility.</p>
    </div>
    
    <h2 style="color: #1a365d;">Customer Spotlight</h2>
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="font-style: italic; margin-bottom: 15px;">"BuildDesk helped us reduce project delays by 60%. Our clients love the transparency, and our teams love how easy it is to stay coordinated."</p>
      <p style="margin-bottom: 0;"><strong>- Mike Rodriguez, Rodriguez Builders</strong></p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/project-management" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Explore Project Features</a>
    </div>
    
    <p>Next up: How to transform your client relationships with radical transparency.</p>
    
    <p>Build better,<br>
    The BuildDesk Team</p>
  </div>',
  'marketing',
  'newsletter',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 4: Client Relationships & Transparency (Day 10)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Newsletter - Client Relationship Excellence',
  'How to Turn Clients into Raving Fans',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">The Client Communication Crisis</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Let me ask you something: How many times has a client called asking "What''s the status of my project?" this week?</p>
    
    <p>If you''re like most contractors, the answer is "too many." But what if I told you there''s a way to turn this problem into your biggest competitive advantage?</p>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #dc2626; margin-top: 0;">The Communication Problem:</h3>
      <ul>
        <li>Clients feel left in the dark</li>
        <li>Constant status update requests</li>
        <li>Misaligned expectations</li>
        <li>Change order disputes</li>
        <li>Payment delays due to confusion</li>
      </ul>
    </div>
    
    <h2 style="color: #1a365d;">The Power of Radical Transparency</h2>
    
    <p>What if your clients could see:</p>
    <ul>
      <li>✅ Real-time project progress</li>
      <li>✅ Daily photo updates from the job site</li>
      <li>✅ Detailed expense breakdowns</li>
      <li>✅ Upcoming milestones and deadlines</li>
      <li>✅ Weather delays and their impact</li>
    </ul>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">BuildDesk Client Portal Features:</h3>
      <ul>
        <li><strong>Project Dashboard</strong> - Live progress tracking</li>
        <li><strong>Photo Gallery</strong> - Daily visual updates</li>
        <li><strong>Financial Transparency</strong> - Budget and spend tracking</li>
        <li><strong>Document Library</strong> - Plans, permits, and reports</li>
        <li><strong>Direct Messaging</strong> - Secure communication channel</li>
        <li><strong>Change Order Management</strong> - Digital approvals</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/client-portal" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">See Client Portal Demo</a>
    </div>
    
    <p>Coming next: Mobile workforce management and how to coordinate teams in the field.</p>
    
    <p>Build trust,<br>
    The BuildDesk Team</p>
  </div>',
  'marketing',
  'newsletter',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 5: Mobile & Team Management (Day 14)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Newsletter - Mobile Team Management',
  'Managing Your Mobile Workforce Like a Pro',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">The Mobile Workforce Challenge</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Construction is one of the few industries where your "office" is constantly moving. Your teams are spread across multiple job sites, working in conditions that make traditional office tools useless.</p>
    
    <p>So how do you maintain control, communication, and accountability?</p>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">📱 BuildDesk Mobile: Your Field Office</h3>
      <ul>
        <li>GPS-verified time tracking</li>
        <li>Photo documentation with location tags</li>
        <li>Team messaging by project</li>
        <li>Offline capability for remote sites</li>
        <li>Real-time progress updates</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/mobile-app" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Mobile App</a>
    </div>
    
    <p>Final email tomorrow: Industry trends and the future of construction technology.</p>
    
    <p>Stay connected,<br>
    The BuildDesk Team</p>
  </div>',
  'marketing',
  'newsletter',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 6: Industry Trends & Future (Day 21)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Newsletter - Construction Industry Future',
  'The Future of Construction is Here - Are You Ready?',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">The Construction Revolution</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Over the past few weeks, we''ve covered the fundamentals of modern construction management. Today, let''s look ahead to what''s coming next in our industry.</p>
    
    <h2 style="color: #1a365d;">5 Trends Reshaping Construction</h2>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #2563eb; margin-top: 0;">🤖 1. AI-Powered Project Intelligence</h3>
      <p>Artificial intelligence is analyzing project data to predict delays, cost overruns, and safety issues before they happen.</p>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #16a34a; margin-top: 0;">📊 2. Advanced Analytics & Benchmarking</h3>
      <p>Data-driven decisions are becoming standard. Companies using advanced analytics see 25% improvement in project margins.</p>
    </div>
    
    <h2 style="color: #1a365d;">Special Offer: Future-Proof Your Business</h2>
    
    <div style="background: #f0f9ff; border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin-bottom: 15px;"><strong>Ready to join the construction revolution?</strong></p>
      <p>As a newsletter subscriber, you''re eligible for our exclusive "Future Builder" package:</p>
      <ul>
        <li>✅ 30-day free trial (instead of 14 days)</li>
        <li>✅ Free data migration from your current system</li>
        <li>✅ Dedicated onboarding specialist</li>
        <li>✅ Custom training sessions for your team</li>
        <li>✅ 6 months of priority support</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/future-builder" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">Claim Your Future Builder Package</a>
    </div>
    
    <p>The future of construction is being written today. The question isn''t whether technology will transform our industry—it''s whether you''ll lead the change or be left behind.</p>
    
    <p>Thanks for joining me on this journey. I''m excited to see how you''ll use these insights to build something amazing.</p>
    
    <p>Build the future,<br>
    The BuildDesk Team</p>
    
    <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; color: #718096; font-size: 14px;">
      <p>This concludes our newsletter series, but we''re always here to help.</p>
      <p>Questions? <a href="mailto:support@builddesk.com" style="color: #2563eb;">support@builddesk.com</a> | Need a demo? <a href="https://builddesk.com/book-demo" style="color: #2563eb;">Book a call</a></p>
    </div>
  </div>',
  'marketing',
  'newsletter',
  '["first_name", "last_name", "email"]'::jsonb,
  true
);