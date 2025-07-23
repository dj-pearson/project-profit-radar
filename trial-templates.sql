-- 14-Day Trial Email Templates for BuildDesk
-- Using existing company ID for system templates

-- Email 1: Welcome & Setup (Day 0 - Immediate)
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
  'Trial Welcome & Setup',
  'Welcome to BuildDesk! Let''s get you set up in 5 minutes',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Welcome to BuildDesk! 🏗️</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>You just took the smartest step to stop losing time and money on chaotic project management.</p>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="font-weight: bold; margin-bottom: 10px;">Your 14-day free trial starts now - no credit card required.</p>
    </div>
    
    <h2 style="color: #1a365d;">Here''s what happens next:</h2>
    <ul style="line-height: 1.6;">
      <li>🚀 <strong>STEP 1:</strong> Complete your company setup (2 minutes)</li>
      <li>👥 <strong>STEP 2:</strong> Add your first project (3 minutes)</li>
      <li>📱 <strong>STEP 3:</strong> Download the mobile app for field access</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/setup" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Complete Setup Now →</a>
    </div>
    
    <h3 style="color: #1a365d;">What you''ll discover in the next 14 days:</h3>
    <ul style="line-height: 1.6;">
      <li>✅ How to cut admin time from 6 hours to 30 minutes daily</li>
      <li>✅ Real-time project tracking that actually works</li>
      <li>✅ Mobile tools your crew will actually use</li>
      <li>✅ Financial insights that protect your margins</li>
    </ul>
    
    <p>Questions? Just reply to this email - I''m here to help.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
    
    <p style="font-size: 14px; color: #666;"><strong>P.S.</strong> Check your email daily - I''ll be sending you quick wins and tips to get the most from your trial.</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 2: First Win - Project Dashboard (Day 1)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial First Win - Project Dashboard',
  'See all your projects in one place (like this contractor did)',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Your First Quick Win</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Yesterday you started your BuildDesk trial. Today, let''s get your first quick win.</p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-weight: bold; margin-bottom: 10px;">Meet Sarah, a contractor from Texas:</p>
      <p style="font-style: italic; margin-bottom: 0;">"I used to juggle 8 different spreadsheets for my projects. Now I see everything in one dashboard. Game changer."</p>
    </div>
    
    <h2 style="color: #1a365d;">Your 2-minute action for today:</h2>
    <p>Set up your Project Dashboard to see:</p>
    <ul style="line-height: 1.6;">
      <li>Live project status updates</li>
      <li>Budget vs actual costs</li>
      <li>Crew assignments and schedules</li>
      <li>Upcoming deadlines</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Up Your Dashboard →</a>
    </div>
    
    <div style="background: #fffbeb; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin-bottom: 10px;"><strong>Why this matters:</strong></p>
      <p style="margin-bottom: 0;">77% of construction projects run behind schedule because contractors don''t have real-time visibility. Your dashboard fixes this.</p>
    </div>
    
    <p><strong>Pro tip:</strong> Pin your most active projects to the top for instant access.</p>
    
    <p><strong>Tomorrow:</strong> I''ll show you how to add your crew and get them tracking time in under 60 seconds.</p>
    
    <p>Questions? Reply to this email.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 3: Mobile Power (Day 2)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial Mobile Power',
  'Your crew will actually use this (3-minute setup)',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Mobile Setup for Your Crew</h1>
    
    <p>Hi {{first_name}},</p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-style: italic; margin-bottom: 0;">"My foreman hates technology, but he''s already using BuildDesk on his phone." - Mike, General Contractor</p>
    </div>
    
    <h2 style="color: #1a365d;">Here''s why contractors love our mobile app:</h2>
    <ul style="line-height: 1.6;">
      <li>📱 Works offline (no cell tower? No problem)</li>
      <li>⚡ 15-second time clock-ins with GPS</li>
      <li>📸 Photo updates sent instantly to clients</li>
      <li>📋 Digital safety checklists</li>
    </ul>
    
    <h3 style="color: #1a365d;">Your 3-minute action:</h3>
    <ol style="line-height: 1.6;">
      <li>Download the BuildDesk mobile app</li>
      <li>Add one crew member</li>
      <li>Show them the 15-second check-in process</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/mobile-app" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Mobile App →</a>
    </div>
    
    <div style="background: #fffbeb; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin-bottom: 10px;"><strong>Real example:</strong></p>
      <p style="margin-bottom: 0;">Yesterday, contractor James caught a $3,000 material delivery error because his crew uploaded photos in real-time. The mobile app pays for itself on day one.</p>
    </div>
    
    <p><strong>Stuck?</strong> Book a 10-minute call with our team: <a href="https://builddesk.com/support-call" style="color: #2563eb;">Schedule Call →</a></p>
    
    <p><strong>Tomorrow:</strong> Setting up your first automated workflow.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 4: Automation Magic (Day 3)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial Automation Magic',
  'Stop chasing updates - let BuildDesk do it for you',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Automation Magic</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>How many hours do you spend each week chasing project updates?</p>
    
    <h2 style="color: #1a365d;">Today''s game-changer: Automated workflows</h2>
    
    <p>Set it once, never chase again:</p>
    <ul style="line-height: 1.6;">
      <li>🔄 Daily progress reports sent automatically</li>
      <li>📧 Client updates without lifting a finger</li>
      <li>⚠️ Instant alerts when something needs attention</li>
      <li>📊 Weekly financial summaries in your inbox</li>
    </ul>
    
    <h3 style="color: #1a365d;">Your 5-minute action:</h3>
    <p>Set up your first automated workflow:</p>
    <ol style="line-height: 1.6;">
      <li>Go to Settings > Workflows</li>
      <li>Choose "Daily Project Updates"</li>
      <li>Select your recipients</li>
      <li>Click "Activate"</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/workflows" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Up Automation →</a>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-weight: bold; margin-bottom: 10px;">Real impact:</p>
      <p style="font-style: italic; margin-bottom: 0;">"I used to spend 2 hours every Monday morning calling crews for updates. Now it''s automated and I know everything by 8 AM." - Lisa, Project Manager</p>
    </div>
    
    <p><strong>Tomorrow:</strong> We''ll show you the feature that saves contractors $50K+ per year.</p>
    
    <p>Questions? Just reply.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 5: The $50K Feature (Day 4)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial $50K Feature',
  'This feature alone saves contractors $50K+ per year',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">The $50K Feature</h1>
    
    <p>Hi {{first_name}},</p>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="font-weight: bold; margin-bottom: 10px;">True story:</p>
      <p style="margin-bottom: 0;">Last month, contractor David caught a $47,000 change order that was never billed. How? BuildDesk''s change order tracking.</p>
    </div>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <p style="font-weight: bold; margin-bottom: 10px;">The problem:</p>
      <p style="margin-bottom: 0;">Most contractors lose $30K-$80K annually on unbilled change orders, forgotten extras, and scope creep.</p>
    </div>
    
    <h2 style="color: #1a365d;">The solution:</h2>
    <p>BuildDesk automatically tracks every change:</p>
    <ul style="line-height: 1.6;">
      <li>💰 Instant change order generation</li>
      <li>📝 Digital client approvals</li>
      <li>🔄 Automatic billing integration</li>
      <li>📊 Change order profitability analysis</li>
    </ul>
    
    <h3 style="color: #1a365d;">Your action today:</h3>
    <ol style="line-height: 1.6;">
      <li>Go to Projects > [Your Project] > Change Orders</li>
      <li>Create a test change order</li>
      <li>See how easy client approval works</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/change-orders" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Try Change Orders →</a>
    </div>
    
    <p><strong>Pro tip:</strong> Enable "Auto-notify" to alert you when verbal changes happen on-site.</p>
    
    <div style="background: #fffbeb; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin-bottom: 0;"><strong>This one feature typically pays for BuildDesk within the first month.</strong></p>
    </div>
    
    <p><strong>Tomorrow:</strong> How to never lose another receipt or document.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 6: Document Control (Day 5)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial Document Control',
  'Never dig through a milk crate of receipts again',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Digital Document Management</h1>
    
    <p>Hi {{first_name}},</p>
    
    <p>Inspector shows up unannounced: "Show me your safety logs."</p>
    <p>Your foreman starts digging through a milk crate of papers...</p>
    
    <p><strong>Sound familiar?</strong></p>
    
    <h2 style="color: #1a365d;">BuildDesk becomes your digital filing cabinet:</h2>
    <ul style="line-height: 1.6;">
      <li>📁 All documents organized by project</li>
      <li>📸 Mobile photo capture with auto-tagging</li>
      <li>🔍 Find any document in 3 seconds</li>
      <li>☁️ Automatic cloud backup</li>
      <li>🔒 OSHA-compliant storage</li>
    </ul>
    
    <h3 style="color: #1a365d;">Your action:</h3>
    <ol style="line-height: 1.6;">
      <li>Upload 5 important project documents</li>
      <li>Try the mobile photo capture</li>
      <li>Use the search function</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/documents" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Organize Your Documents →</a>
    </div>
    
    <p><strong>Bonus:</strong> Set up automatic document requests from subcontractors. Never chase insurance certificates again.</p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-weight: bold; margin-bottom: 10px;">Real example:</p>
      <p style="font-style: italic; margin-bottom: 0;">When contractor Mike''s insurance auditor requested 2 years of safety logs, he pulled them up in 30 seconds. "Best $89/month I''ve ever spent."</p>
    </div>
    
    <p><strong>Tomorrow:</strong> The crew scheduling feature that stops the Monday morning scramble.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 13: Special Offer (Day 12)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial Special Offer',
  'Win more bids with these reports',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 10px;">Only 2 days left in your trial!</h1>
    </div>
    
    <p>Hi {{first_name}},</p>
    
    <h2 style="color: #1a365d;">Today''s advantage: Professional Reporting</h2>
    
    <p>BuildDesk reports help you:</p>
    <ul style="line-height: 1.6;">
      <li>📊 Bid more accurately (real historical data)</li>
      <li>💰 Show clients transparent progress</li>
      <li>📈 Prove ROI to stakeholders</li>
      <li>🎯 Identify most profitable work</li>
      <li>⚠️ Spot problems before they''re expensive</li>
    </ul>
    
    <h3 style="color: #1a365d;">Key reports to try:</h3>
    <ul style="line-height: 1.6;">
      <li>Project Profitability Analysis</li>
      <li>Labor Cost Breakdown</li>
      <li>Material Usage Trends</li>
      <li>Timeline Performance</li>
      <li>Safety Compliance Dashboard</li>
    </ul>
    
    <h3 style="color: #1a365d;">Your action:</h3>
    <ol style="line-height: 1.6;">
      <li>Generate 3 different reports</li>
      <li>Share one with a client</li>
      <li>Use data for your next bid</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/reports" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Generate Reports →</a>
    </div>
    
    <div style="background: #fffbeb; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin-bottom: 0;"><strong>Competitive advantage:</strong> Contractors using data-driven bidding win 34% more projects.</p>
    </div>
    
    <p><strong>Final day tomorrow:</strong> Your transition to paid subscription (special trial pricing).</p>
    
    <p>Questions about reporting? Reply to this email.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 14: Last Day Special Offer (Day 13)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial Last Day Special Offer',
  'Your trial ends tomorrow - special pricing inside',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #dc2626;">
      <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 10px;">Your 14-day trial ends tomorrow.</h1>
    </div>
    
    <p>Hi {{first_name}},</p>
    
    <p>First, let me ask: How has BuildDesk changed your business?</p>
    
    <h2 style="color: #1a365d;">What you''ve accomplished:</h2>
    <ul style="line-height: 1.6;">
      <li>✅ Streamlined project management</li>
      <li>✅ Automated time-consuming tasks</li>
      <li>✅ Improved client communication</li>
      <li>✅ Better financial visibility</li>
      <li>✅ Enhanced safety compliance</li>
      <li>✅ Professional reporting capabilities</li>
    </ul>
    
    <p style="font-weight: bold; font-size: 18px;">Don''t lose this progress.</p>
    
    <div style="background: #f0f9ff; border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #2563eb; margin-top: 0;">SPECIAL TRIAL PRICING (expires in 48 hours):</h2>
      <ul style="line-height: 1.6; margin-bottom: 0;">
        <li><strong>50% off your first 3 months</strong></li>
        <li><strong>Free data migration from any system</strong></li>
        <li><strong>Priority customer support</strong></li>
        <li><strong>Money-back guarantee</strong></li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/special-offer" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">Claim Your 50% Discount →</a>
    </div>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #dc2626; margin-top: 0;">What happens if you don''t continue:</h3>
      <ul style="line-height: 1.6; margin-bottom: 0;">
        <li>❌ Lose all your project data</li>
        <li>❌ Back to spreadsheet chaos</li>
        <li>❌ Crew returns to paper timesheets</li>
        <li>❌ Miss change orders and profit leaks</li>
      </ul>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
      <p style="font-weight: bold; margin-bottom: 10px;">What contractors say after Month 1:</p>
      <p style="font-style: italic; margin-bottom: 0;">"BuildDesk saved us $18,000 in the first month through better change order tracking alone." - Mike T.</p>
    </div>
    
    <p><strong>Questions?</strong> Book a 10-minute call: <a href="https://builddesk.com/support-call" style="color: #2563eb;">Schedule Call →</a></p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://builddesk.com/continue-subscription" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">Start Your Subscription →</a>
    </div>
    
    <p style="font-weight: bold;">Don''t go back to the old way. Your business deserves better.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
    
    <p style="font-size: 14px; color: #666;"><strong>P.S.</strong> This pricing expires in 48 hours. After that, you''ll pay full price.</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
),

-- Email 15: Final Notice (Day 14)
(
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'::uuid,
  'Trial Final Notice',
  'FINAL NOTICE: Your trial expires tonight',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <h1 style="font-size: 24px; margin-bottom: 10px;">FINAL NOTICE</h1>
      <p style="font-size: 18px; margin-bottom: 0;">Your BuildDesk trial expires at midnight tonight.</p>
    </div>
    
    <p>Hi {{first_name}},</p>
    
    <div style="background: #f0f9ff; border: 2px solid #2563eb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">Last chance for 50% off (expires in 12 hours):</p>
      <a href="https://builddesk.com/save-50" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">Save 50% - Continue Your Subscription →</a>
    </div>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #dc2626; margin-top: 0;">Quick reminder of what you''ll lose:</h3>
      <ul style="line-height: 1.6;">
        <li>All your project data</li>
        <li>Automated workflows you set up</li>
        <li>Team access and training</li>
        <li>14 days of progress</li>
      </ul>
    </div>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1a365d; margin-top: 0;">What you''ll go back to:</h3>
      <ul style="line-height: 1.6;">
        <li>Spreadsheet chaos</li>
        <li>Manual time tracking</li>
        <li>Chasing project updates</li>
        <li>Lost change orders</li>
        <li>Paper document storage</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fffbeb; border-radius: 8px;">
      <p style="font-size: 18px; margin-bottom: 15px;"><strong>Continue for just $44.50/month</strong> (normally $89/month)</p>
      <a href="https://builddesk.com/continue-subscription" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">Continue Your Subscription →</a>
    </div>
    
    <p><strong>Questions?</strong> Call us: (555) 123-4567</p>
    
    <p style="font-weight: bold; color: #dc2626;">This is your final notice. After midnight, your account will be deactivated.</p>
    
    <p>Best,<br>
    BuildDesk Support Team</p>
  </div>',
  'automation',
  'trial',
  '["first_name", "last_name", "email"]'::jsonb,
  true
);