-- Insert sample knowledge base articles with real construction management content

-- Get first root admin user for author_id
DO $$
DECLARE
    admin_user_id UUID;
    getting_started_cat_id UUID;
    project_mgmt_cat_id UUID;
    financial_cat_id UUID;
    safety_cat_id UUID;
    mobile_cat_id UUID;
    integrations_cat_id UUID;
    troubleshooting_cat_id UUID;
    best_practices_cat_id UUID;
BEGIN
    -- Get first root admin user
    SELECT id INTO admin_user_id 
    FROM public.user_profiles 
    WHERE role = 'root_admin' 
    LIMIT 1;

    -- Get category IDs
    SELECT id INTO getting_started_cat_id FROM public.knowledge_base_categories WHERE slug = 'getting-started';
    SELECT id INTO project_mgmt_cat_id FROM public.knowledge_base_categories WHERE slug = 'project-management';
    SELECT id INTO financial_cat_id FROM public.knowledge_base_categories WHERE slug = 'financial-management';
    SELECT id INTO safety_cat_id FROM public.knowledge_base_categories WHERE slug = 'safety-compliance';
    SELECT id INTO mobile_cat_id FROM public.knowledge_base_categories WHERE slug = 'mobile-app';
    SELECT id INTO integrations_cat_id FROM public.knowledge_base_categories WHERE slug = 'integrations';
    SELECT id INTO troubleshooting_cat_id FROM public.knowledge_base_categories WHERE slug = 'troubleshooting';
    SELECT id INTO best_practices_cat_id FROM public.knowledge_base_categories WHERE slug = 'best-practices';

    -- Insert sample articles
    INSERT INTO public.knowledge_base_articles (
        title, slug, content, excerpt, article_type, category_id, author_id,
        difficulty_level, estimated_read_time, is_published, is_featured,
        tags, published_at, sort_order
    ) VALUES 
    -- Getting Started Articles
    (
        'Getting Started with Build Desk: Complete Setup Guide',
        'getting-started-complete-setup-guide',
        '# Getting Started with Build Desk: Complete Setup Guide

Welcome to Build Desk! This comprehensive guide will walk you through setting up your construction management platform for success.

## Step 1: Company Setup

### Basic Company Information
1. Navigate to **Company Settings** from your dashboard
2. Fill in your company details:
   - Company name and address
   - Industry type (Residential, Commercial, or Specialty)
   - License numbers
   - Annual revenue range

### Branding Configuration
- Upload your company logo
- Set your primary brand color
- Configure email signatures

## Step 2: Team Management

### Adding Team Members
1. Go to **Team Management**
2. Click **Add Team Member**
3. Assign appropriate roles:
   - **Admin**: Full access to all features
   - **Project Manager**: Manage projects and teams
   - **Field Supervisor**: Mobile access and crew management
   - **Office Staff**: Administrative tasks and client communication

### Setting Permissions
Each role comes with predefined permissions. Customize as needed based on your company structure.

## Step 3: Project Templates

### Creating Your First Template
1. Navigate to **Projects** > **Templates**
2. Choose from industry-standard templates:
   - Residential Construction
   - Commercial Build-out
   - Renovation Projects
   - Specialty Trade Work

### Customizing Templates
- Add your standard cost codes
- Set default markup percentages
- Configure approval workflows

## Step 4: Financial Configuration

### Chart of Accounts
- Import from QuickBooks (recommended)
- Or use our standard construction chart of accounts
- Map cost codes to accounting categories

### Tax Settings
- Configure tax rates by location
- Set up 1099 contractor tracking
- Define retention percentages

## Step 5: Mobile App Setup

### Download and Install
- iOS: Download from App Store
- Android: Download from Google Play
- Use your web login credentials

### Field Configuration
- Enable GPS tracking for time cards
- Configure photo requirements for daily reports
- Set up offline sync preferences

## Next Steps

Once your basic setup is complete:
1. Create your first project
2. Add team members to projects
3. Start tracking time and costs
4. Generate your first reports

## Need Help?

- Check our video tutorials
- Contact support at support@build-desk.com
- Schedule a training session with our team',
        'Complete step-by-step guide to setting up your Build Desk account, configuring your company settings, and getting your team ready to manage construction projects effectively.',
        'how_to',
        getting_started_cat_id,
        admin_user_id,
        'beginner',
        15,
        true,
        true,
        ARRAY['setup', 'onboarding', 'company-settings', 'team-management'],
        now(),
        1
    ),
    (
        'Essential Features Every Construction Company Should Use',
        'essential-features-construction-companies',
        '# Essential Features Every Construction Company Should Use

Build Desk offers comprehensive construction management tools. Here are the must-use features that will transform your business operations.

## 1. Real-Time Job Costing

### Why It Matters
- Track profitability as projects progress
- Identify cost overruns early
- Make data-driven decisions

### How to Use
1. Set up cost codes for each trade
2. Track labor hours by cost code
3. Record material costs as incurred
4. Monitor equipment usage
5. Generate weekly cost reports

### Best Practices
- Update costs daily
- Review reports weekly
- Compare actual vs. estimated costs
- Adjust future bids based on data

## 2. Mobile Daily Reports

### Benefits
- Real-time project updates
- Photo documentation
- Weather tracking
- Crew accountability

### Implementation
- Train field staff on mobile app
- Require daily photo submissions
- Set up automatic email notifications
- Review reports with project managers

## 3. Change Order Management

### Streamline Approvals
- Digital change order forms
- Client approval workflows
- Automatic cost calculations
- Timeline impact assessment

### Process Flow
1. Field identifies change
2. Estimator prices change
3. Client receives approval request
4. Approved changes update project budget
5. Costs tracked separately

## 4. Document Management

### Centralized Storage
- All project documents in one place
- Version control for drawings
- Mobile access for field teams
- Automatic backup and sync

### Organization Structure
```
Project ABC
├── Contracts
├── Drawings
│   ├── Architectural
│   ├── Structural
│   └── MEP
├── Permits
├── Photos
└── Reports
```

## 5. Safety Management

### OSHA Compliance
- Digital safety forms
- Incident reporting
- Training tracking
- Inspection checklists

### Safety Meetings
- Schedule toolbox talks
- Track attendance
- Store safety documents
- Generate compliance reports

## 6. Client Communication Portal

### Professional Client Experience
- Project progress updates
- Photo galleries
- Document sharing
- Change order approvals
- Payment tracking

### Setup Steps
1. Enable client portal in project settings
2. Create client login credentials
3. Configure what clients can see
4. Send welcome email with instructions

## Implementation Timeline

### Week 1-2: Foundation
- Complete company setup
- Add team members
- Configure basic settings

### Week 3-4: Core Features
- Set up job costing
- Train on mobile app
- Implement change order process

### Week 5-6: Advanced Features
- Configure client portal
- Set up safety management
- Optimize document workflows

### Week 7+: Optimization
- Analyze reports
- Refine processes
- Train additional staff

## Measuring Success

Track these KPIs to measure ROI:
- Project profitability improvement
- Time saved on administrative tasks
- Client satisfaction scores
- Safety incident reduction
- Change order approval time

## Getting Support

Our implementation team is here to help:
- Schedule training sessions
- Weekly check-ins during setup
- Best practice consultations
- Ongoing support as you grow',
        'Discover the core Build Desk features that successful construction companies use daily to improve profitability, efficiency, and client satisfaction.',
        'article',
        getting_started_cat_id,
        admin_user_id,
        'beginner',
        12,
        true,
        true,
        ARRAY['features', 'implementation', 'best-practices', 'roi'],
        now(),
        2
    ),
    -- Project Management Articles
    (
        'Project Setup Checklist: Starting Projects Right',
        'project-setup-checklist',
        '# Project Setup Checklist: Starting Projects Right

Proper project setup is crucial for success. Use this comprehensive checklist to ensure nothing falls through the cracks.

## Pre-Project Phase

### Contract Review
- [ ] Contract signed and executed
- [ ] Scope of work clearly defined
- [ ] Payment schedule established
- [ ] Change order process agreed upon
- [ ] Timeline and milestones set

### Project Information
- [ ] Project name and address entered
- [ ] Client contact information complete
- [ ] Project manager assigned
- [ ] Start and end dates set
- [ ] Contract value entered

## Financial Setup

### Budget Configuration
- [ ] Total contract amount entered
- [ ] Cost codes assigned
- [ ] Labor budget by trade
- [ ] Material budget by category
- [ ] Equipment and subcontractor costs
- [ ] Contingency percentage set

### Cost Tracking
- [ ] QuickBooks integration configured
- [ ] Purchase order process established
- [ ] Invoice approval workflow set
- [ ] Time tracking enabled
- [ ] Expense categories defined

## Team Assignment

### Project Team
- [ ] Project manager assigned
- [ ] Field supervisor designated
- [ ] Admin support assigned
- [ ] Client portal access configured
- [ ] Communication preferences set

### Permissions
- [ ] Team member roles defined
- [ ] Access levels configured
- [ ] Mobile app permissions set
- [ ] Document access rights assigned

## Document Management

### Project Documents
- [ ] Contract uploaded
- [ ] Drawings and plans uploaded
- [ ] Permits and approvals
- [ ] Insurance certificates
- [ ] Subcontractor agreements

### Document Organization
- [ ] Folder structure created
- [ ] Version control enabled
- [ ] Access permissions set
- [ ] Backup enabled

## Safety and Compliance

### Safety Setup
- [ ] Site-specific safety plan created
- [ ] Emergency contact information
- [ ] Required permits obtained
- [ ] Insurance verification complete
- [ ] Safety meeting schedule set

### Compliance Requirements
- [ ] OSHA requirements reviewed
- [ ] Local code requirements
- [ ] Environmental considerations
- [ ] Bonding requirements verified

## Communication Setup

### Internal Communication
- [ ] Project communication plan
- [ ] Meeting schedule established
- [ ] Reporting frequency set
- [ ] Escalation procedures defined

### Client Communication
- [ ] Client portal configured
- [ ] Update frequency agreed upon
- [ ] Change order process explained
- [ ] Payment reminders set up

## Mobile and Field Setup

### Mobile Configuration
- [ ] Field staff added to project
- [ ] Mobile app permissions set
- [ ] Offline sync enabled
- [ ] Photo requirements configured

### Field Requirements
- [ ] Site access information
- [ ] Material delivery procedures
- [ ] Quality control standards
- [ ] Daily reporting requirements

## Quality Control

### Quality Standards
- [ ] Quality control checklist created
- [ ] Inspection schedule set
- [ ] Acceptance criteria defined
- [ ] Punch list process established

### Documentation Requirements
- [ ] Photo documentation standards
- [ ] Progress reporting format
- [ ] Change documentation process
- [ ] Final documentation checklist

## Project Kickoff

### Kickoff Meeting
- [ ] All team members present
- [ ] Project overview presented
- [ ] Roles and responsibilities clarified
- [ ] Timeline reviewed
- [ ] Questions addressed

### Final Checks
- [ ] All systems functional
- [ ] Team training complete
- [ ] Client expectations set
- [ ] Go-live date confirmed

## Post-Setup Monitoring

### Week 1 Checklist
- [ ] Daily reports being submitted
- [ ] Time tracking working properly
- [ ] Costs being recorded
- [ ] Any issues identified and resolved

### Month 1 Review
- [ ] Budget vs. actual analysis
- [ ] Team feedback collected
- [ ] Process adjustments made
- [ ] Client satisfaction check

## Common Setup Mistakes to Avoid

1. **Incomplete cost codes** - Ensure all work types are covered
2. **Missing team assignments** - All roles should be clearly defined
3. **Inadequate document organization** - Establish structure early
4. **Unclear communication protocols** - Set expectations upfront
5. **Insufficient safety planning** - Address safety requirements first

## Templates and Resources

- Standard project setup template
- Cost code library
- Safety checklist template
- Client communication templates
- Document folder structure guide

Remember: Taking time for proper setup saves hours of problems later. A well-configured project runs smoothly from day one.',
        'Complete checklist for setting up construction projects properly from the start, covering financial setup, team assignments, safety requirements, and quality control.',
        'checklist',
        project_mgmt_cat_id,
        admin_user_id,
        'beginner',
        8,
        true,
        false,
        ARRAY['project-setup', 'checklist', 'planning', 'organization'],
        now(),
        1
    );

END $$;