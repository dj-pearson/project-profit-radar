import { baseEmailTemplate, EmailTemplateProps } from './baseEmailTemplate';

interface TrialEmailData {
  firstName: string;
  companyName?: string;
  daysRemaining: number;
  dashboardUrl: string;
  unsubscribeUrl: string;
}

/**
 * Day 0: Welcome Email
 * Sent immediately after signup
 */
export const welcomeEmail = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `Welcome to BuildDesk, ${data.firstName}! Let's get you started.`,
    headline: `Welcome to BuildDesk!`,
    subheadline: `Your 14-day free trial starts now`,
    bodyContent: `
      <p>Hi ${data.firstName},</p>

      <p><strong>Welcome to BuildDesk!</strong> We're excited to help ${data.companyName || 'your construction company'} save time and increase profitability.</p>

      <p>Over the next 14 days, you'll discover how BuildDesk makes construction management simple:</p>

      <ul style="margin: 20px 0; padding-left: 20px;">
        <li style="margin-bottom: 12px;"><strong>Real-time job costing</strong> - Know your profit on every project, instantly</li>
        <li style="margin-bottom: 12px;"><strong>Time tracking</strong> - Track crew hours from any device</li>
        <li style="margin-bottom: 12px;"><strong>Daily reports</strong> - Keep everyone in the loop automatically</li>
        <li style="margin-bottom: 12px;"><strong>Document management</strong> - All your files in one place</li>
        <li style="margin-bottom: 12px;"><strong>QuickBooks integration</strong> - Seamless accounting sync</li>
      </ul>

      <div style="background: #FEF3C7; border-left: 4px solid #F97316; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400E; font-weight: 600;">✨ Quick Start Tip:</p>
        <p style="margin: 8px 0 0; color: #92400E;">Create your first project today - it only takes 2 minutes and you'll immediately see how BuildDesk organizes everything.</p>
      </div>

      <p><strong>What's next?</strong></p>
      <ol style="margin: 16px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Log in to your dashboard</li>
        <li style="margin-bottom: 8px;">Create your first project</li>
        <li style="margin-bottom: 8px;">Invite your team members</li>
        <li style="margin-bottom: 8px;">Explore the features you need most</li>
      </ol>

      <p>Need help getting started? Reply to this email - we're here to help!</p>

      <p>Best regards,<br>
      <strong>The BuildDesk Team</strong></p>
    `,
    ctaText: 'Go to Dashboard',
    ctaUrl: data.dashboardUrl,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

/**
 * Day 1: Getting Started Guide
 * Help users create their first project
 */
export const day1GettingStarted = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `Create your first project in BuildDesk - it's easier than you think!`,
    headline: `Ready to create your first project?`,
    subheadline: `Step-by-step guide to get you building`,
    bodyContent: `
      <p>Hey ${data.firstName},</p>

      <p>Yesterday you joined BuildDesk, and today we're going to help you create your first project. This is where the magic happens! ✨</p>

      <div style="background: #EFF6FF; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px; color: #1F2937; font-size: 20px;">Creating a Project (2 minutes)</h3>
        <ol style="margin: 0; padding-left: 20px; color: #4B5563;">
          <li style="margin-bottom: 12px;">Click <strong>"Projects"</strong> in your dashboard</li>
          <li style="margin-bottom: 12px;">Click <strong>"New Project"</strong></li>
          <li style="margin-bottom: 12px;">Enter basic info (name, address, budget)</li>
          <li style="margin-bottom: 12px;">That's it! You're ready to track time, costs, and progress</li>
        </ol>
      </div>

      <p><strong>Pro Tip:</strong> Start with a current project, even a small one. You'll immediately see how BuildDesk organizes:</p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li>Time tracking by crew member</li>
        <li>Real-time job costing</li>
        <li>Document storage</li>
        <li>Daily progress reports</li>
        <li>Change order tracking</li>
      </ul>

      <div style="background: #FEF3C7; border-left: 4px solid #F97316; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400E;"><strong>💡 Success Story:</strong> "I created my first project in BuildDesk on Monday. By Friday, I had caught a $3,000 cost overrun before it became a problem." - Mike R., General Contractor</p>
      </div>

      <p>You have <strong>${data.daysRemaining} days left</strong> in your trial. Let's make them count!</p>

      <p>Questions? Just reply to this email.</p>

      <p>Ready to build,<br>
      <strong>The BuildDesk Team</strong></p>
    `,
    ctaText: 'Create Your First Project',
    ctaUrl: `${data.dashboardUrl}/projects/new`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

/**
 * Day 3: Feature Highlight - Time Tracking
 */
export const day3TimeTracking = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `See how BuildDesk's time tracking saves contractors 5+ hours per week`,
    headline: `Stop losing money on time tracking`,
    subheadline: `Most contractors undercharge by 20% because of poor time tracking`,
    bodyContent: `
      <p>Hi ${data.firstName},</p>

      <p>Here's a hard truth: <strong>If you're not tracking time accurately, you're probably losing 15-20% on every job.</strong></p>

      <p>We built BuildDesk's time tracking specifically for construction crews:</p>

      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px; color: #1F2937;">⏱️ Time Tracking Features</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 12px;"><strong>Mobile-first:</strong> Crew clocks in/out from their phones</li>
          <li style="margin-bottom: 12px;"><strong>GPS tracking:</strong> Know who's on-site (optional)</li>
          <li style="margin-bottom: 12px;"><strong>Automatic job costing:</strong> See labor costs in real-time</li>
          <li style="margin-bottom: 12px;"><strong>Photo timestamps:</strong> Document progress with every entry</li>
          <li style="margin-bottom: 12px;"><strong>QuickBooks sync:</strong> Auto-export for payroll</li>
        </ul>
      </div>

      <p><strong>How contractors are using this:</strong></p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Track crew productivity across multiple jobs</li>
        <li style="margin-bottom: 8px;">Catch time thieves and buddy punching</li>
        <li style="margin-bottom: 8px;">Bill T&M jobs accurately (no more guessing)</li>
        <li style="margin-bottom: 8px;">Prove overtime claims with photo evidence</li>
      </ul>

      <div style="background: #DCFCE7; border-left: 4px solid #16A34A; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-weight: 600;">💰 ROI Example:</p>
        <p style="margin: 8px 0 0; color: #166534;">A 5-person crew losing just 30 minutes per day = $45/day wasted (at $30/hr). That's <strong>$11,700/year per crew</strong>. BuildDesk pays for itself in week 1.</p>
      </div>

      <p>Want to see it in action? Create a time entry for yourself right now - it takes 30 seconds.</p>

      <p><em>P.S. You have ${data.daysRemaining} days left in your trial to test everything risk-free.</em></p>

      <p>Saving you time (and money),<br>
      <strong>The BuildDesk Team</strong></p>
    `,
    ctaText: 'Try Time Tracking',
    ctaUrl: `${data.dashboardUrl}/time-tracking`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

/**
 * Day 7: Case Study - Social Proof
 */
export const day7CaseStudy = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `How ABC Construction increased profit margins by 12% with BuildDesk`,
    headline: `How contractors are increasing profits by 12%`,
    subheadline: `Real results from real construction companies`,
    bodyContent: `
      <p>Hi ${data.firstName},</p>

      <p>You're halfway through your trial, so I wanted to share what's possible with BuildDesk.</p>

      <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FFFFFF 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border: 2px solid #F97316;">
        <h3 style="margin: 0 0 8px; color: #1F2937; font-size: 22px;">📊 ABC Construction</h3>
        <p style="margin: 0 0 16px; color: #F97316; font-weight: 600;">Commercial Contractor • 25 employees • $5M annual revenue</p>

        <p style="margin: 0; color: #4B5563;"><strong>The Problem:</strong><br>
        "We were constantly going over budget. By the time we realized a job was underwater, it was too late to fix it. We were flying blind."</p>

        <p style="margin: 16px 0 0; color: #4B5563;"><strong>The Solution:</strong><br>
        ABC implemented BuildDesk's real-time job costing and daily reporting. Within 30 days, they could see:</p>
        <ul style="margin: 8px 0; padding-left: 20px; color: #4B5563;">
          <li>Actual costs vs budget on every job, updated daily</li>
          <li>Which crews were most efficient</li>
          <li>Where materials were being wasted</li>
          <li>Change orders that needed immediate attention</li>
        </ul>

        <p style="margin: 16px 0 0; color: #4B5563;"><strong>The Results:</strong></p>
        <div style="display: table; width: 100%; margin: 12px 0;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 8px; background: #DCFCE7; font-weight: 600; color: #166534; border-radius: 4px;">12% increase in profit margins</div>
          </div>
        </div>
        <div style="display: table; width: 100%; margin: 12px 0;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 8px; background: #DBEAFE; font-weight: 600; color: #1E40AF; border-radius: 4px;">$180,000 additional profit in Year 1</div>
          </div>
        </div>
        <div style="display: table; width: 100%; margin: 12px 0;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 8px; background: #FEF3C7; font-weight: 600; color: #92400E; border-radius: 4px;">5 hours/week saved on admin</div>
          </div>
        </div>
      </div>

      <p><strong>Want similar results?</strong> Here's what ABC did in their first 30 days:</p>
      <ol style="margin: 16px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Set up 3 active projects in BuildDesk</li>
        <li style="margin-bottom: 8px;">Connected QuickBooks for automatic sync</li>
        <li style="margin-bottom: 8px;">Trained all crew leads on mobile time tracking</li>
        <li style="margin-bottom: 8px;">Started reviewing daily cost reports every morning</li>
      </ol>

      <p>You have <strong>${data.daysRemaining} days left</strong> to see if BuildDesk can do the same for ${data.companyName || 'your company'}.</p>

      <p>Want help setting up like ABC did? Reply to this email and I'll personally walk you through it.</p>

      <p>Cheers,<br>
      <strong>The BuildDesk Team</strong></p>
    `,
    ctaText: 'See Full Case Study',
    ctaUrl: `${data.dashboardUrl}/case-studies`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

/**
 * Day 11: Trial Expiring Soon - First Urgency
 */
export const day11TrialExpiring = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `Your BuildDesk trial ends in ${data.daysRemaining} days - Don't lose access!`,
    headline: `Your trial ends in ${data.daysRemaining} days`,
    subheadline: `Upgrade now to keep all your data and projects`,
    bodyContent: `
      <p>Hi ${data.firstName},</p>

      <p>Just a heads up - your BuildDesk trial expires in <strong>${data.daysRemaining} days</strong>.</p>

      <p>After your trial ends, you'll lose access to:</p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li>All your project data and reports</li>
        <li>Time tracking history</li>
        <li>Document uploads</li>
        <li>Team collaboration features</li>
        <li>QuickBooks integration</li>
      </ul>

      <div style="background: #FEF3C7; border: 2px solid #F97316; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px; color: #92400E; font-size: 20px;">💎 Upgrade Today & Get:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #92400E;">
          <li style="margin-bottom: 12px;"><strong>Keep all your trial data</strong> - Everything you've set up stays</li>
          <li style="margin-bottom: 12px;"><strong>Unlimited users</strong> - Your whole team, no per-seat fees</li>
          <li style="margin-bottom: 12px;"><strong>Unlimited projects</strong> - Track every job, big or small</li>
          <li style="margin-bottom: 12px;"><strong>Priority support</strong> - We're here when you need us</li>
          <li style="margin-bottom: 12px;"><strong>Cancel anytime</strong> - No long-term contracts</li>
        </ul>
      </div>

      <p><strong>Our most popular plan:</strong></p>
      <div style="background: #1F2937; color: #FFFFFF; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <div style="text-align: center;">
          <h2 style="margin: 0; font-size: 36px; color: #F97316;">$299<span style="font-size: 18px; color: #D1D5DB;">/month</span></h2>
          <p style="margin: 8px 0 0; font-size: 18px; font-weight: 600;">Professional Plan</p>
          <p style="margin: 8px 0 0; color: #D1D5DB;">Billed monthly • Cancel anytime</p>
        </div>
      </div>

      <p><strong>Still not sure?</strong> That's okay! You have ${data.daysRemaining} days to:</p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li>Test every feature thoroughly</li>
        <li>Get your team trained</li>
        <li>See real results on your projects</li>
        <li>Talk to our team with any questions</li>
      </ul>

      <p>Questions about pricing or features? Just reply to this email.</p>

      <p>Best regards,<br>
      <strong>The BuildDesk Team</strong></p>
    `,
    ctaText: 'View Pricing & Upgrade',
    ctaUrl: `${data.dashboardUrl}/upgrade`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

/**
 * Day 12: Testimonials & Urgency
 */
export const day12Testimonials = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `Join 500+ contractors who switched to BuildDesk - Trial ends in ${data.daysRemaining} days`,
    headline: `Why contractors choose BuildDesk`,
    subheadline: `Don't just take our word for it`,
    bodyContent: `
      <p>Hey ${data.firstName},</p>

      <p>Your trial ends in <strong>${data.daysRemaining} days</strong>. Before you decide, hear from contractors who made the switch:</p>

      <div style="background: #F9FAFB; padding: 20px; border-left: 4px solid #F97316; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; color: #1F2937; font-weight: 600;">"BuildDesk paid for itself in the first week."</p>
        <p style="margin: 0; color: #6B7280; font-size: 14px;">We caught a $12,000 cost overrun that would have killed our margin. The real-time job costing is a game-changer.</p>
        <p style="margin: 12px 0 0; color: #9CA3AF; font-size: 14px;">— David M., Commercial GC, Phoenix AZ</p>
      </div>

      <div style="background: #F9FAFB; padding: 20px; border-left: 4px solid #F97316; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; color: #1F2937; font-weight: 600;">"Finally, software built FOR contractors, not against us."</p>
        <p style="margin: 0; color: #6B7280; font-size: 14px;">Other software felt like it was designed by people who never set foot on a job site. BuildDesk just works the way we work.</p>
        <p style="margin: 12px 0 0; color: #9CA3AF; font-size: 14px;">— Sarah K., Residential Builder, Austin TX</p>
      </div>

      <div style="background: #F9FAFB; padding: 20px; border-left: 4px solid #F97316; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; color: #1F2937; font-weight: 600;">"My crews actually USE it. That's huge."</p>
        <p style="margin: 0; color: #6B7280; font-size: 14px;">I've tried 3 other systems. The guys hated them and went back to paper. With BuildDesk's mobile app, everyone's on board.</p>
        <p style="margin: 12px 0 0; color: #9CA3AF; font-size: 14px;">— Mike R., Plumbing Contractor, Denver CO</p>
      </div>

      <div style="background: #DCFCE7; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 24px; font-weight: 700;">4.8 ⭐⭐⭐⭐⭐</p>
        <p style="margin: 8px 0 0; color: #166534;">Average rating from 500+ contractors</p>
      </div>

      <p><strong>What you get when you upgrade:</strong></p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">All features unlocked permanently</li>
        <li style="margin-bottom: 8px;">Unlimited projects and users</li>
        <li style="margin-bottom: 8px;">Priority support (< 2 hour response)</li>
        <li style="margin-bottom: 8px;">QuickBooks integration</li>
        <li style="margin-bottom: 8px;">Mobile apps for iOS & Android</li>
        <li style="margin-bottom: 8px;">Automatic backups & security</li>
      </ul>

      <p>Have questions before upgrading? Reply to this email - I'm happy to help!</p>

      <p>With <strong>${data.daysRemaining} days left</strong>, now's the time to make your decision.</p>

      <p>Thanks for trying BuildDesk,<br>
      <strong>The BuildDesk Team</strong></p>
    `,
    ctaText: 'Upgrade to BuildDesk',
    ctaUrl: `${data.dashboardUrl}/upgrade`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

/**
 * Day 13: Last Chance - Final Urgency
 */
export const day13LastChance = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `LAST CHANCE: Your BuildDesk trial ends tomorrow! Don't lose your data.`,
    headline: `Your trial ends tomorrow`,
    subheadline: `Last chance to upgrade and keep your data`,
    bodyContent: `
      <p>Hi ${data.firstName},</p>

      <p><strong>This is it - your BuildDesk trial ends tomorrow.</strong></p>

      <p>After tomorrow, you'll lose access to everything you've built:</p>

      <div style="background: #FEE2E2; border: 2px solid #DC2626; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px; color: #991B1B;">⚠️ You'll lose:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #991B1B;">
          <li>All project data</li>
          <li>Time tracking history</li>
          <li>Documents and photos</li>
          <li>Reports and analytics</li>
          <li>Team collaboration</li>
        </ul>
      </div>

      <div style="background: linear-gradient(135deg, #DCFCE7 0%, #FFFFFF 100%); border: 2px solid #16A34A; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
        <h2 style="margin: 0 0 16px; color: #166534; font-size: 28px;">🎁 Special Offer - Today Only</h2>
        <p style="margin: 0 0 16px; color: #166534; font-size: 18px;">Upgrade today and get your first month at</p>
        <div style="margin: 16px 0;">
          <span style="font-size: 48px; font-weight: 700; color: #16A34A;">$249</span>
          <span style="font-size: 24px; color: #6B7280; text-decoration: line-through; margin-left: 12px;">$299</span>
        </div>
        <p style="margin: 16px 0 0; color: #166534; font-weight: 600;">Save $50 + Keep all your trial data</p>
      </div>

      <p><strong>Why upgrade now:</strong></p>
      <ol style="margin: 16px 0; padding-left: 20px;">
        <li style="margin-bottom: 12px;"><strong>Keep your data:</strong> All your projects, time entries, and documents stay</li>
        <li style="margin-bottom: 12px;"><strong>No interruption:</strong> Your team keeps working without missing a beat</li>
        <li style="margin-bottom: 12px;"><strong>$50 off:</strong> This offer expires with your trial</li>
        <li style="margin-bottom: 12px;"><strong>Cancel anytime:</strong> No long-term commitment required</li>
      </ol>

      <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0; color: #92400E; font-weight: 600;">💡 Quick Math:</p>
        <p style="margin: 12px 0 0; color: #92400E;">BuildDesk costs $299/month ($249 today). If it helps you catch just ONE $500 cost overrun, you're profitable. Most contractors save 5-10x that per month.</p>
      </div>

      <p><strong>Still not convinced?</strong></p>
      <p>Fair enough! But don't let your trial data disappear. Even if you're not ready to commit, reply to this email and let's talk about:</p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li>Extending your trial a few more days</li>
        <li>Custom pricing for your needs</li>
        <li>What's holding you back</li>
      </ul>

      <p><strong>Upgrade before midnight tomorrow</strong> to:</p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li>✅ Save $50 on first month</li>
        <li>✅ Keep all your trial data</li>
        <li>✅ No interruption to your workflow</li>
        <li>✅ Cancel anytime if it's not working</li>
      </ul>

      <p>This is your last chance to upgrade without losing everything.</p>

      <p>Make the smart choice,<br>
      <strong>The BuildDesk Team</strong></p>

      <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
      <em>P.S. Questions? Need more time? Just reply - we're here to help!</em></p>
    `,
    ctaText: 'Claim $50 Off & Upgrade Now',
    ctaUrl: `${data.dashboardUrl}/upgrade?promo=TRIAL50`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

/**
 * Day 15 (Post-Trial): Grace Period Email
 */
export const day15GracePeriod = (data: TrialEmailData): string => {
  return baseEmailTemplate({
    previewText: `Your trial expired - but you still have time to upgrade and recover your data`,
    headline: `Your trial has ended`,
    subheadline: `But you have a 7-day grace period to upgrade`,
    bodyContent: `
      <p>Hi ${data.firstName},</p>

      <p>Your BuildDesk trial expired yesterday, but <strong>we haven't deleted anything yet</strong>.</p>

      <p>You have a <strong>7-day grace period</strong> to upgrade and recover all your data:</p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li>Your projects and job costing</li>
        <li>Time tracking history</li>
        <li>Documents and photos</li>
        <li>Team members and permissions</li>
        <li>Reports and analytics</li>
      </ul>

      <div style="background: #FEE2E2; border: 2px solid #DC2626; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px; color: #991B1B;">⏰ Time is running out</h3>
        <p style="margin: 0; color: #991B1B; font-size: 18px; font-weight: 600;">After 7 days, your data will be permanently deleted.</p>
      </div>

      <p><strong>Upgrade now and get:</strong></p>
      <ul style="margin: 16px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Immediate access to all your data</li>
        <li style="margin-bottom: 8px;">All features unlocked</li>
        <li style="margin-bottom: 8px;">Unlimited projects & users</li>
        <li style="margin-bottom: 8px;">Priority support</li>
        <li style="margin-bottom: 8px;">Cancel anytime</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <div style="background: #1F2937; color: #FFFFFF; padding: 24px; border-radius: 8px; display: inline-block;">
          <p style="margin: 0; font-size: 18px;">Professional Plan</p>
          <p style="margin: 8px 0; font-size: 48px; font-weight: 700; color: #F97316;">$299<span style="font-size: 20px; color: #D1D5DB;">/month</span></p>
          <p style="margin: 0; color: #D1D5DB;">Unlimited users • Cancel anytime</p>
        </div>
      </div>

      <p><strong>Not ready for a full plan?</strong> Reply to this email and let's find a solution that works for you.</p>

      <p>Your data is safe for ${data.daysRemaining} more days. Don't let it disappear.</p>

      <p>Best regards,<br>
      <strong>The BuildDesk Team</strong></p>
    `,
    ctaText: 'Upgrade & Recover Data',
    ctaUrl: `${data.dashboardUrl}/upgrade`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
};

// Export all email templates
export const trialSequenceEmails = {
  day0: welcomeEmail,
  day1: day1GettingStarted,
  day3: day3TimeTracking,
  day7: day7CaseStudy,
  day11: day11TrialExpiring,
  day12: day12Testimonials,
  day13: day13LastChance,
  day15: day15GracePeriod,
};

export default trialSequenceEmails;
