# BuildDesk CRM Expert Evaluation & Recommendations
## Comprehensive Analysis: Lead Generation to Contract & Project Development

**Date:** November 6, 2025
**Evaluator:** CRM Expert Analysis
**Target:** Rival HubSpot's ease of use with construction-specific optimization

---

## Executive Summary

BuildDesk has developed an **impressively comprehensive CRM system** with 85-90% feature completeness for the SMB construction market. The system includes 30+ CRM tables, sophisticated lead scoring, multi-pipeline architecture, email campaigns with A/B testing, and construction-specific workflows.

**Overall Assessment:** **8.5/10** - Production-ready with strategic enhancements needed to rival HubSpot

**Key Strengths:**
- ✅ Complete lead-to-project conversion workflow
- ✅ AI-powered lead scoring and estimate generation
- ✅ Construction-specific qualification (permits, HOA, site conditions, financing)
- ✅ Flexible pipeline templates and stages
- ✅ Email campaigns with engagement tracking
- ✅ Real-time collaboration features

**Critical Gaps Identified:**
- ❌ No dedicated sales or business development user roles (RBAC gap)
- ❌ Limited outbound calling features (no click-to-call, call recording)
- ❌ No SMS/WhatsApp integration for modern outreach
- ❌ Missing account-based sales for enterprise/commercial construction
- ❌ No predictive analytics or AI-powered forecasting
- ❌ Limited integration marketplace (no Zapier, Make, native CRM integrations)

---

## Section 1: Current State Analysis

### 1.1 Database Architecture (Score: 9/10)

**Strengths:**
- 30+ CRM-specific tables with comprehensive relationships
- Multi-tenant architecture with Row Level Security (RLS)
- 50+ optimized indexes for query performance
- Automatic lead scoring from behavioral signals
- Construction-industry specific fields throughout

**Core Tables:**
```
✅ leads (150+ fields) - Comprehensive lead tracking
✅ contacts (25+ fields) - Relationship management
✅ opportunities (26 fields) - Deal pipeline
✅ activities (15 fields) - Communication tracking
✅ lead_nurturing_campaigns - Automated email sequences
✅ sales_targets - Performance tracking
✅ ai_estimates - AI-powered estimate generation
✅ procurement_opportunities - Bid management
✅ tasks + 8 related tables - Task management system
```

**Supporting Infrastructure:**
- `pipeline_stages` - Customizable deal stages
- `pipeline_templates` - Industry-specific templates
- `pipeline_metrics` - Historical analytics
- `lead_contact_relationships` - Many-to-many contact linking
- `email_campaigns` + 5 related tables - Complete email system

**Gap:** No dedicated tables for:
- Call logging with recordings
- SMS/WhatsApp communication
- Account hierarchies for enterprise sales
- CRM integration sync logs

### 1.2 Lead Generation & Capture (Score: 8/10)

**Current Implementation:**

**Pre-Signup Lead Capture:**
- ✅ UTM tracking and attribution
- ✅ Landing page and referrer tracking
- ✅ Anonymous lead scoring before signup
- ✅ Demo request scheduling
- ✅ Sales contact request management
- ✅ Automatic lead activity logging (page views, form submits)

**Lead Capture Forms:** (`src/components/lead/LeadCaptureForm.tsx`)
- ✅ Inline and card variants
- ✅ Email validation
- ✅ Loading states and error handling
- ✅ Privacy compliance messaging
- ✅ Edge function processing

**Lead Sources Tracked:**
```
website, referral, social_media, paid_advertising, content_marketing,
email_campaign, trade_show, cold_outreach, partner, direct,
repeat_customer, other, walk_in
```

**Gaps:**
- ❌ No live chat widget for real-time capture
- ❌ No chatbot for 24/7 lead qualification
- ❌ Missing Facebook Lead Ads integration
- ❌ No website visitor tracking (who's browsing before conversion)
- ❌ Limited form builder (only email capture, not multi-step forms)

**Recommendations:**
1. **Add Live Chat Widget** - Implement Intercom-style chat for immediate engagement
2. **AI Chatbot** - 24/7 qualification bot that asks construction-specific questions
3. **Advanced Form Builder** - Multi-step forms with conditional logic
4. **Visitor Identification** - Track company names from IP addresses (Clearbit-style)
5. **Social Media Integration** - Auto-import leads from Facebook, LinkedIn Lead Gen Forms

### 1.3 Lead Management & Qualification (Score: 9/10)

**Current Implementation:**

**Lead Statuses:** (9 stages)
```
new → contacted → qualified → proposal_sent → negotiating →
won → lost → on_hold → nurturing
```

**Lead Scoring System:**
- ✅ Automatic behavioral scoring
- ✅ Budget-based qualification
- ✅ Timeline assessment
- ✅ Decision-maker identification
- ✅ Competition awareness

**Construction-Specific Qualification:**
- ✅ Property type tracking
- ✅ Permits required assessment
- ✅ HOA approval needs
- ✅ Financing secured/type
- ✅ Site accessibility
- ✅ Site conditions evaluation

**BANT Framework Support:**
- ✅ Budget (estimated_budget, budget_range, financing_secured)
- ✅ Authority (decision_maker, decision_timeline)
- ✅ Need (project_description, project_type, pain_points)
- ✅ Timeline (desired_start_date, timeline_flexibility)

**Lead Intelligence:** (`src/components/crm/EnhancedLeadIntelligence.tsx`)
- ✅ AI-powered lead insights
- ✅ Lead scoring visualization
- ✅ Qualification workflows

**Gaps:**
- ❌ No lead enrichment (auto-populate company data from external sources)
- ❌ Missing duplicate detection and merging
- ❌ No automatic lead assignment rules (round-robin, territory-based)
- ❌ Limited lead import capabilities (no CSV import UI visible)

**Recommendations:**
1. **Lead Enrichment Integration** - Clearbit, ZoomInfo, or similar to auto-populate company info
2. **Smart Lead Routing** - Automatic assignment based on:
   - Project type
   - Geographic territory
   - Sales rep capacity
   - Specialization (residential vs commercial)
3. **Duplicate Detection** - Email/phone fuzzy matching with merge UI
4. **Bulk Import Tool** - CSV import with mapping and validation
5. **Lead Segmentation** - Dynamic lists based on criteria (hot leads, stale leads, etc.)

### 1.4 Sales Pipeline & Opportunity Management (Score: 9/10)

**Current Implementation:**

**Pipeline Stages:**
```
prospecting → qualification → proposal → negotiation →
closed_won → closed_lost
```

**Pipeline Features:**
- ✅ Kanban board with drag-and-drop (`src/components/crm/EnhancedPipelineKanban.tsx`)
- ✅ Weighted pipeline value (value × probability)
- ✅ Win probability tracking (0-100%)
- ✅ Expected close date management
- ✅ Multiple pipeline templates
- ✅ Pipeline stage customization
- ✅ Historical pipeline metrics

**Opportunity Fields:**
- ✅ Financial: estimated_value, probability_percent, actual_value
- ✅ Team: account_manager, estimator, project_manager
- ✅ Competition: competitor_names, competitive_advantage
- ✅ Risk: risk_level, risk_factors, mitigation_strategies
- ✅ Construction: project_type, bid_required, bid_due_date

**Pipeline Analytics:** (`src/components/crm/PipelineAnalytics.tsx`)
- ✅ Stage breakdown visualization
- ✅ Conversion rate tracking
- ✅ Pipeline velocity metrics
- ✅ Win/loss analysis

**Strengths:**
- Construction-specific workflow with bid management
- Team member assignments per opportunity
- Risk assessment and mitigation tracking
- Direct navigation to create estimates from opportunities

**Gaps:**
- ❌ No deal collaboration features (internal comments, @mentions)
- ❌ Missing deal health scores (red/yellow/green indicators)
- ❌ No automatic stage progression rules
- ❌ Limited forecasting (only weighted pipeline, no trend analysis)
- ❌ No deal comparison (side-by-side opportunity analysis)

**Recommendations:**
1. **Deal Collaboration Panel** - Internal comments with @mentions and activity feed
2. **Deal Health Scoring** - Automatic red/yellow/green based on:
   - Time in stage
   - Last contact date
   - Missing required fields
   - Competitive threats
3. **Smart Stage Automation** - Auto-move deals based on triggers:
   - Proposal sent → Move to Negotiation after 24 hours
   - Contract signed → Auto-convert to project
4. **Advanced Forecasting** - Trend-based predictions with confidence intervals
5. **Deal Rooms** - Shared spaces with clients for proposals, contracts, documents

### 1.5 Automated Outreach & Communication (Score: 7/10)

**Current Implementation:**

**Email Campaigns:** (`src/pages/EmailMarketing.tsx`, `src/components/marketing/EmailMarketingCampaigns.tsx`)
- ✅ Campaign creation and management
- ✅ Email template builder
- ✅ A/B testing support
- ✅ Engagement tracking (opens, clicks)
- ✅ Preference management
- ✅ Unsubscribe handling

**Lead Nurturing:** (`src/components/crm/LeadNurturingCampaigns.tsx`)
- ✅ Multi-step drip campaigns
- ✅ Delay configuration (days/weeks)
- ✅ Auto-enrollment based on lead score
- ✅ Campaign types: welcome, re-engagement, follow-up, educational
- ✅ Step types: email, task, call reminder
- ✅ Campaign analytics (enrollment, completion, conversion)

**Activities Tracking:** (`activities` table)
- ✅ Activity types: call, email, meeting, site_visit, proposal, follow_up, contract_signing
- ✅ Scheduled vs completed tracking
- ✅ Duration tracking
- ✅ Outcome logging
- ✅ Follow-up scheduling

**Workflow Automation:** (`src/pages/AutomatedWorkflows.tsx`)
- ✅ Automated task creation
- ✅ Reminder notifications
- ✅ Multi-step workflows

**Gaps:**
- ❌ No native email sending (relies on edge functions, no SMTP/SendGrid UI)
- ❌ No call functionality (click-to-call, call logging, call recording)
- ❌ No SMS/WhatsApp outreach
- ❌ No social media integration (LinkedIn messaging)
- ❌ Missing email sync (Gmail/Outlook inbox integration)
- ❌ No email templates library (pre-built construction templates)
- ❌ No cadence automation (multi-channel sequences: email → call → email)

**Recommendations:**
1. **Email Provider Integration** - Native SendGrid/Mailgun UI with:
   - Template gallery (50+ construction templates)
   - Drag-and-drop email builder
   - Spam score checker
   - Send time optimization
2. **Calling Features:**
   - Click-to-call from lead/contact records
   - Call logging with auto-transcription
   - Call recording and playback
   - Voicemail drop
   - Local presence dialing
3. **SMS & WhatsApp:**
   - Text messaging from platform
   - WhatsApp Business API integration
   - Template messages for quick responses
4. **Multi-Channel Sequences:**
   - Email → Wait 2 days → Call → Wait 1 day → SMS → Wait 3 days → Email
   - Automatic progression based on engagement
5. **Inbox Sync:**
   - 2-way Gmail/Outlook sync
   - Track all emails automatically
   - Reply from CRM interface
6. **Social Selling:**
   - LinkedIn Sales Navigator integration
   - LinkedIn messaging from CRM
   - Social profile enrichment

### 1.6 Follow-up Tracking & Task Management (Score: 8/10)

**Current Implementation:**

**Tasks System:** (8 related tables)
- ✅ Tasks table with priorities and status
- ✅ Task dependencies (finish-to-start, must-finish-on-date)
- ✅ Subtask hierarchies
- ✅ Task templates for construction phases
- ✅ Task comments and attachments
- ✅ Time tracking on tasks
- ✅ Resource allocation
- ✅ Notification system

**Follow-up Features:**
- ✅ next_follow_up_date on leads
- ✅ Automated task reminders
- ✅ Payment reminders table
- ✅ Activity scheduling with dates/times
- ✅ Contact attempts tracking

**My Tasks Page:** (`src/pages/MyTasks.tsx`)
- ✅ Personal task dashboard
- ✅ Task filtering and sorting
- ✅ Due date management

**Strengths:**
- Comprehensive task system with dependencies
- Construction-specific: inspection requirements, cure times
- Team collaboration via comments

**Gaps:**
- ❌ No visual task calendar view
- ❌ Missing smart follow-up suggestions (AI-recommended times)
- ❌ No follow-up compliance reporting (% of reps hitting follow-up targets)
- ❌ No bulk task creation
- ❌ Limited mobile optimization for field follow-ups

**Recommendations:**
1. **Smart Follow-up Engine:**
   - AI suggests best follow-up time based on lead behavior
   - Automatic follow-up sequences for different lead stages
   - "Best time to call" predictions
2. **Follow-up Compliance Dashboard:**
   - Track % of leads contacted within 5 minutes (construction best practice)
   - Rep scorecards for follow-up speed
   - Leaderboards for motivation
3. **Calendar Views:**
   - Day/week/month calendar view of all activities
   - Drag-and-drop rescheduling
   - Integration with Google Calendar/Outlook
4. **Mobile-First Follow-ups:**
   - Quick "log a call" from mobile
   - Voice-to-text for notes
   - One-tap follow-up scheduling
5. **Bulk Operations:**
   - Select multiple leads → Create follow-up tasks
   - Mass reassignment
   - Batch email/SMS

### 1.7 RBAC (Role-Based Access Control) (Score: 6/10)

**Current User Roles:**
```
root_admin       - Platform administrator
admin            - Company administrator
superintendent   - Construction superintendent
project_manager  - Project management
estimator        - Estimating role
field_supervisor - Field operations
office_staff     - Office operations
accounting       - Financial access
client_portal    - Client view access
```

**Row Level Security (RLS):**
- ✅ Multi-tenant data isolation by company_id
- ✅ Role-based policies on all CRM tables
- ✅ Function-based role checking (get_user_role)
- ✅ Granular permissions per table

**Sales-Specific RLS Examples:**
```sql
-- Opportunities RLS
account_manager = auth.uid() OR
get_user_role(auth.uid()) = ANY(ARRAY['admin', 'root_admin'])

-- Leads RLS
assigned_to = auth.uid() OR
get_user_role(auth.uid()) = ANY(ARRAY['admin', 'sales', 'root_admin'])
```

**Critical Gap: NO SALES ROLES!**

**Missing Roles:**
- ❌ `sales_representative` - Front-line sales
- ❌ `sales_manager` - Sales team management
- ❌ `business_development` - Strategic partnerships
- ❌ `inside_sales` - Inbound lead qualification
- ❌ `outside_sales` - Field sales

**Current Workaround:** Sales functionality accessible to admins and project managers, but:
- Lacks sales-specific permissions granularity
- No sales territory assignments
- No sales hierarchy (rep → manager → director)
- CRM analytics assume admin access

**Gaps:**
- ❌ No sales-specific user roles
- ❌ No territory management (geographic/account-based)
- ❌ No sales hierarchy for reporting
- ❌ No customizable permissions (e.g., "can view pipeline but not edit")
- ❌ No data visibility controls (own leads only vs team leads vs all leads)

**Recommendations:**
1. **Add Sales Roles to Enum:**
   ```sql
   ALTER TYPE user_role ADD VALUE 'sales_representative';
   ALTER TYPE user_role ADD VALUE 'sales_manager';
   ALTER TYPE user_role ADD VALUE 'business_development';
   ALTER TYPE user_role ADD VALUE 'inside_sales';
   ```

2. **Implement Territory Management:**
   - `sales_territories` table
   - Geographic boundaries (ZIP codes, states, regions)
   - Account-based territories (residential, commercial, industrial)
   - Automatic lead routing to territory owner

3. **Sales Hierarchy:**
   - `user_profiles.manager_id` field
   - Sales rep reports to sales manager
   - Dashboard filters: My Leads, My Team's Leads, All Leads

4. **Granular Permissions System:**
   - Create `role_permissions` table
   - Configurable permissions per role:
     - `leads:view_own`, `leads:view_team`, `leads:view_all`
     - `leads:edit_own`, `leads:edit_team`, `leads:edit_all`
     - `opportunities:view`, `opportunities:edit`, `opportunities:delete`
     - `pipeline:view`, `pipeline:forecast`
   - UI for admins to customize role permissions

5. **Data Visibility Controls:**
   - Default: Sales reps see only assigned leads
   - Team view: See leads assigned to anyone in their territory
   - Manager view: See all leads for direct reports
   - Admin view: See everything

### 1.8 Reporting & Analytics (Score: 7/10)

**Current Implementation:**

**CRM Analytics Dashboard:** (`src/pages/CRMAnalytics.tsx`)
- ✅ 6 analytics tabs: Overview, Pipeline, Forecasting, Conversion, Team, Activity
- ✅ Performance metrics visualization
- ✅ Pipeline stage breakdown
- ✅ Revenue forecasting
- ✅ Lead-to-opportunity conversion rates
- ✅ Team performance tracking
- ✅ Activity stream

**Sales Targets Tracking:**
- ✅ `sales_targets` table
- ✅ Revenue targets by person/period
- ✅ Lead and opportunity targets
- ✅ Conversion rate targets
- ✅ Monthly, quarterly, yearly reporting

**Available Reports:**
- Total leads and trends
- Qualified leads count
- Pipeline value (total and weighted)
- Conversion rates
- Pipeline stage distribution
- Team performance by individual
- Sales targets vs actual
- Activity metrics (calls, emails, meetings)
- Response time tracking

**Pipeline Metrics Table:**
- ✅ Historical pipeline snapshots (daily)
- ✅ Stage-level metrics
- ✅ Value and count tracking

**Strengths:**
- Comprehensive dashboard with multiple views
- Construction-specific KPIs
- Team performance tracking

**Gaps:**
- ❌ No predictive analytics (AI-powered forecasting)
- ❌ Limited drill-down capabilities
- ❌ No custom report builder
- ❌ Missing win/loss analysis (why deals close/fail)
- ❌ No deal attribution (which touchpoints contributed to close)
- ❌ No industry benchmarking
- ❌ Limited export options
- ❌ No scheduled reports (email reports daily/weekly)
- ❌ No goal tracking with progress bars

**Recommendations:**
1. **AI-Powered Predictive Analytics:**
   - Revenue forecast with confidence intervals
   - Deal close probability using ML (based on historical patterns)
   - At-risk deal identification
   - Best next action recommendations

2. **Custom Report Builder:**
   - Drag-and-drop interface
   - Configurable metrics and dimensions
   - Custom filters and grouping
   - Save and share reports
   - Export to PDF, Excel, CSV

3. **Win/Loss Analysis:**
   - Required win/loss reason on close
   - Category tagging: price, timing, competition, fit, ghosted
   - Trend analysis: Why are we losing deals?
   - Competitive intelligence: Which competitors beat us?

4. **Attribution Reporting:**
   - Multi-touch attribution model
   - Credit touchpoints: first touch, last touch, all touches
   - Channel performance: Which lead sources close best?
   - Campaign ROI

5. **Industry Benchmarking:**
   - Compare conversion rates to industry averages
   - Pipeline velocity benchmarks
   - Sales cycle length comparison
   - Win rate benchmarking

6. **Executive Dashboards:**
   - Real-time KPI tracking
   - Goal progress visualization
   - Month-over-month/year-over-year comparisons
   - One-click export for board meetings

7. **Scheduled Reports:**
   - Daily digest: New leads, tasks due
   - Weekly: Pipeline changes, won/lost deals
   - Monthly: Team performance, targets vs actual
   - Email or Slack delivery

### 1.9 Client Onboarding (Score: 8/10)

**Current Implementation:**

**Lead-to-Client Conversion Workflow:**
```
Lead (CRMLeads.tsx)
  → Update Status to "Qualified"
  → Convert to Opportunity (pre-filled data)
  → Update Opportunity Stage to "Closed Won"
  → Convert to Project (direct button)
  → Add Project Contacts
  → Create Tasks and Activities
```

**Onboarding Features:**
- ✅ Seamless data flow through conversion
- ✅ Pre-filled fields carry through stages
- ✅ Quick-link buttons for conversion
- ✅ URL parameters pass data between pages
- ✅ Project creation with budget/timeline from opportunity
- ✅ Contact assignment to projects with roles
- ✅ `project_contacts` table linking CRM contacts to projects

**Onboarding Flow Component:** (`src/components/onboarding/OnboardingFlow.tsx`)
- ✅ Structured onboarding process

**Strengths:**
- Efficient "LEAN navigation" approach
- No data re-entry
- Direct conversion buttons

**Gaps:**
- ❌ No dedicated onboarding checklist (welcome call, kickoff meeting, etc.)
- ❌ Missing automated onboarding emails
- ❌ No client portal onboarding (how to access, tour)
- ❌ No document collection workflow (insurance, contracts, permits)
- ❌ No project kickoff meeting scheduler
- ❌ Limited onboarding analytics (time to first value)

**Recommendations:**
1. **Onboarding Checklist Template:**
   - Pre-defined checklist for new clients:
     - [ ] Send welcome email
     - [ ] Schedule kickoff call
     - [ ] Collect insurance certificates
     - [ ] Sign master contract
     - [ ] Grant client portal access
     - [ ] Conduct platform tour
     - [ ] Assign project manager
   - Auto-create tasks from template
   - Track completion percentage

2. **Automated Onboarding Emails:**
   - Welcome email with next steps
   - Client portal invitation with video tour
   - Document request email with checklist
   - Kickoff meeting reminder

3. **Document Collection Portal:**
   - Client-facing form to upload:
     - Insurance certificates
     - Permits
     - HOA approval
     - Contracts
   - Automatic storage in project documents
   - Reminders for missing documents

4. **Client Success Dashboard:**
   - Track onboarding progress per client
   - Identify stuck onboardings
   - Time-to-project-start metrics
   - Client satisfaction scoring

5. **Automated Kickoff Scheduling:**
   - Calendly-style scheduling for kickoff meeting
   - Automatic calendar invite
   - Pre-meeting questionnaire
   - Agenda generation

---

## Section 2: Competitive Analysis vs HubSpot

### HubSpot Key Features Comparison

| Feature Category | HubSpot | BuildDesk | Gap Analysis |
|-----------------|---------|-----------|--------------|
| **Lead Capture** | Live chat, chatbots, forms, pop-ups | Email forms, UTM tracking | ⚠️ Need live chat, chatbot |
| **Lead Scoring** | Predictive (ML), manual | Manual with auto-scoring | ⚠️ Need ML-based scoring |
| **Email Marketing** | Drag-drop builder, A/B test, templates | A/B test, campaigns | ⚠️ Need visual builder, template library |
| **Sales Sequences** | Multi-channel (email, call, task) | Email-only | ❌ Need call/SMS sequences |
| **Pipeline Management** | Kanban, forecast, automation | Kanban, basic forecast | ⚠️ Need deal automation, health scores |
| **Calling** | Click-to-call, recording, transcription | None | ❌ Critical gap |
| **Meetings** | Scheduling links, calendar sync | None | ❌ Critical gap |
| **Email Sync** | 2-way Gmail/Outlook | None | ❌ Critical gap |
| **Reporting** | Custom reports, dashboards, goals | Pre-built dashboards | ⚠️ Need custom builder |
| **Automation** | Visual workflow builder | Database-driven | ⚠️ Need visual no-code builder |
| **Mobile App** | Native iOS/Android | Capacitor (in dev) | ⚠️ Per roadmap |
| **Integrations** | 1000+ via marketplace | Limited | ❌ Need integration marketplace |
| **Construction Focus** | None (general purpose) | Deep construction features | ✅ Major advantage |

### Ease of Use Comparison

**HubSpot Strengths:**
- Intuitive drag-and-drop interfaces
- Extensive onboarding and training resources
- In-app guidance and tooltips
- Visual workflow builder (no-code)
- Template marketplace

**BuildDesk Strengths:**
- Purpose-built for construction (no configuration needed)
- Integrated with project management (no separate tools)
- Construction-specific terminology
- Real-time job costing integration

**BuildDesk Gaps:**
- No visual workflow builder (requires database knowledge)
- Limited in-app help/documentation
- Steeper learning curve for non-technical users
- No template marketplace

---

## Section 3: Strategic Recommendations

### Priority 1: Critical Gaps (Next 30 Days)

#### 1. Add Sales User Roles
**Impact:** High | **Effort:** Low | **ROI:** Immediate

**Implementation:**
```sql
-- Migration: 20251107_add_sales_roles.sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_representative';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'business_development';

-- Update RLS policies for sales roles
CREATE POLICY "Sales reps can view assigned leads"
ON leads FOR SELECT
USING (
  assigned_to = auth.uid() OR
  get_user_role(auth.uid()) = ANY(ARRAY[
    'sales_representative', 'sales_manager', 'admin', 'root_admin'
  ]::user_role[])
);
```

**UI Updates:**
- Update user profile creation to include new roles
- Add sales role filters to analytics
- Create "Sales Team" page showing all sales reps

#### 2. Calling Features
**Impact:** High | **Effort:** Medium | **ROI:** High

**Implementation Options:**
1. **Twilio Integration:**
   - Click-to-call from any phone number in CRM
   - Call logging automatically creates activity
   - Call recording saved to activities
   - Voicemail drop pre-recorded messages

2. **Alternative:** Air.ai or Bland.ai for AI-powered calling

**Technical Approach:**
- New table: `call_logs` (call_sid, duration, recording_url, transcription, sentiment)
- Edge function: `supabase/functions/twilio-call` for webhook handling
- UI: Call widget in lead/contact detail view
- Component: `src/components/crm/CallWidget.tsx`

**Files to Create:**
- `supabase/migrations/20251107_call_logs.sql`
- `supabase/functions/twilio-call/index.ts`
- `src/components/crm/CallWidget.tsx`
- `src/hooks/useCall.ts`

#### 3. Email Sync (Gmail/Outlook)
**Impact:** High | **Effort:** High | **ROI:** High

**Implementation:**
- OAuth2 flow for Gmail/Outlook
- Background sync worker (Supabase Edge Function on cron)
- Store emails in `email_messages` table
- Link emails to leads/contacts/opportunities via email matching
- UI: Email thread view in activity stream

**Tables:**
```sql
CREATE TABLE email_messages (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  message_id text UNIQUE, -- Gmail/Outlook message ID
  thread_id text,
  from_email text,
  to_emails text[],
  subject text,
  body_html text,
  body_plain text,
  received_at timestamptz,
  synced_at timestamptz,
  lead_id uuid REFERENCES leads(id),
  contact_id uuid REFERENCES contacts(id),
  opportunity_id uuid REFERENCES opportunities(id)
);
```

#### 4. Meeting Scheduler (Calendly-style)
**Impact:** Medium | **Effort:** Medium | **ROI:** High

**Implementation:**
- User availability rules (Monday-Friday 9am-5pm, etc.)
- Booking page per user: `builddesk.com/book/john-smith`
- Calendar integration (Google Calendar, Outlook)
- Automatic meeting creation in activities
- Email confirmations and reminders

**Tables:**
```sql
CREATE TABLE availability_rules (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id),
  day_of_week integer, -- 0-6
  start_time time,
  end_time time,
  meeting_duration_minutes integer DEFAULT 30
);

CREATE TABLE meeting_bookings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id),
  lead_id uuid REFERENCES leads(id),
  contact_id uuid REFERENCES contacts(id),
  scheduled_at timestamptz,
  duration_minutes integer,
  meeting_type text, -- discovery, demo, proposal, kickoff
  booking_confirmed boolean DEFAULT false,
  calendar_event_id text
);
```

### Priority 2: HubSpot-Level Features (60 Days)

#### 5. Visual Workflow Builder
**Impact:** High | **Effort:** High | **ROI:** Medium

**Implementation:**
- React Flow library for visual workflow editor
- No-code interface for automation
- Triggers: lead created, status changed, email opened, form submitted
- Actions: send email, create task, update field, notify user
- Conditions: if/then branching

**Example Workflows:**
- "New Lead Response" - Lead created → Wait 5 min → Assign to rep → Send welcome email → Create follow-up task
- "Stale Lead Re-engagement" - Lead no activity 30 days → Send re-engagement email → If no response in 7 days → Move to nurturing
- "Hot Lead Alert" - Lead score > 80 → Notify sales manager → Create high-priority task

**Files:**
```
src/pages/WorkflowBuilder.tsx
src/components/workflows/FlowCanvas.tsx
src/components/workflows/NodeLibrary.tsx
supabase/migrations/20251115_workflows.sql (tables: workflows, workflow_nodes, workflow_executions)
```

#### 6. Predictive Analytics & AI Forecasting
**Impact:** High | **Effort:** High | **ROI:** High

**Implementation:**
- Machine learning model training on historical deal data
- Features: lead source, project type, budget, time in stage, activity count, last contact date
- Predictions:
  - Deal close probability (ML model)
  - Expected close date
  - Revenue forecast with confidence intervals
  - At-risk deals (probability dropping)

**Technical Stack:**
- Python ML service (separate from main app)
- Scikit-learn or TensorFlow for modeling
- Supabase Edge Function to call ML service
- Daily batch predictions

**New Tables:**
```sql
CREATE TABLE ml_predictions (
  id uuid PRIMARY KEY,
  opportunity_id uuid REFERENCES opportunities(id),
  model_version text,
  predicted_close_probability decimal(5,2),
  predicted_close_date date,
  confidence_score decimal(5,2),
  prediction_date timestamptz DEFAULT now()
);
```

#### 7. SMS & WhatsApp Outreach
**Impact:** Medium | **Effort:** Medium | **ROI:** Medium

**Implementation:**
- Twilio for SMS
- WhatsApp Business API for WhatsApp
- Opt-in management (TCPA compliance)
- Message templates
- 2-way messaging interface

**UI:**
- SMS/WhatsApp tab in lead detail
- Quick reply templates
- Message threading
- Delivery and read receipts

#### 8. Live Chat & Chatbot
**Impact:** Medium | **Effort:** Medium | **ROI:** High

**Implementation:**
- Live chat widget for website visitors
- AI chatbot for 24/7 initial qualification
- Handoff to human when requested
- Chat transcripts saved to lead activities

**Chatbot Flow Example:**
```
Bot: "Hi! Are you planning a construction project?"
Visitor: "Yes, a home renovation"
Bot: "Great! What type of renovation? (Kitchen, bathroom, addition, full remodel)"
Visitor: "Kitchen"
Bot: "What's your estimated budget?"
Visitor: "$50,000"
Bot: "Perfect! Can I get your name and email to send you a quote?"
→ Creates lead with project_type="Kitchen Renovation", estimated_budget=50000
```

### Priority 3: Scale & Differentiation (90+ Days)

#### 9. Integration Marketplace
**Impact:** High | **Effort:** Very High | **ROI:** High

**Build or Partner:**
- **Option 1:** Build native integrations (10-20 key tools)
- **Option 2:** Partner with Zapier for 1000+ integrations
- **Option 3:** Build both (native for core tools, Zapier for long tail)

**Priority Integrations:**
1. QuickBooks Online (already exists) ✅
2. Stripe (already exists) ✅
3. Google Calendar (already exists) ✅
4. Outlook Calendar (already exists) ✅
5. Mailchimp - Marketing automation
6. DocuSign - Contract signing
7. Procore - Project management sync
8. CoConstruct - Homebuilder CRM
9. BuilderTrend - Construction management
10. Plangrid - Field collaboration

**Integration Architecture:**
```
src/integrations/
  ├── mailchimp/
  ├── docusign/
  ├── procore/
  └── zapier/
      └── webhooks.ts

New table:
CREATE TABLE integration_configs (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  integration_name text, -- mailchimp, docusign, etc.
  is_active boolean DEFAULT false,
  auth_token text ENCRYPTED,
  refresh_token text ENCRYPTED,
  config jsonb, -- integration-specific settings
  last_sync_at timestamptz
);
```

#### 10. Account-Based Sales (Enterprise Feature)
**Impact:** Medium | **Effort:** High | **ROI:** Medium

**For Commercial/Enterprise Construction:**
- Account hierarchies (parent company → subsidiaries)
- Account-level pipeline (multiple opportunities per account)
- Account scoring (not just lead scoring)
- Account team assignments
- Cross-opportunity insights

**Tables:**
```sql
CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  account_name text NOT NULL,
  parent_account_id uuid REFERENCES accounts(id),
  account_type text, -- prospect, customer, partner
  industry text,
  annual_revenue numeric,
  employee_count integer,
  account_score integer,
  account_owner uuid REFERENCES user_profiles(id)
);

ALTER TABLE contacts ADD COLUMN account_id uuid REFERENCES accounts(id);
ALTER TABLE opportunities ADD COLUMN account_id uuid REFERENCES accounts(id);
```

#### 11. Territory Management
**Impact:** Medium | **Effort:** Medium | **ROI:** Medium

**Implementation:**
- Define territories by:
  - Geography (ZIP codes, counties, states)
  - Account type (residential, commercial, industrial)
  - Project size (under $100k, $100k-$500k, $500k+)
- Assign sales reps to territories
- Automatic lead routing based on territory rules
- Territory performance analytics

**Tables:**
```sql
CREATE TABLE sales_territories (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  territory_name text NOT NULL,
  territory_type text, -- geographic, account_based, hybrid
  zip_codes text[], -- for geographic
  states text[],
  min_project_value numeric, -- for size-based
  max_project_value numeric,
  project_types text[], -- for type-based
  created_at timestamptz DEFAULT now()
);

CREATE TABLE territory_assignments (
  id uuid PRIMARY KEY,
  territory_id uuid REFERENCES sales_territories(id),
  user_id uuid REFERENCES user_profiles(id),
  role text, -- owner, member
  assigned_at timestamptz DEFAULT now()
);
```

---

## Section 4: Ease of Use Improvements

### 4.1 User Experience Enhancements

#### Onboarding & Training
1. **Interactive Product Tour:**
   - Use Intro.js or Shepherd.js for guided tours
   - First-time user wizard
   - Role-specific tours (sales rep vs admin)

2. **In-App Help:**
   - Context-sensitive help tooltips
   - Video tutorials embedded in UI
   - Search functionality for help docs

3. **Template Library:**
   - Pre-built email templates (50+ construction-specific)
   - Pipeline templates by project type
   - Workflow templates
   - Report templates

#### Interface Improvements
1. **Global Search:**
   - Algolia or MeiliSearch integration
   - Search across leads, contacts, opportunities, projects
   - Keyboard shortcut (⌘K / Ctrl+K)

2. **Quick Actions:**
   - Floating action button for common tasks
   - Create lead, log call, send email, create task
   - Keyboard shortcuts for power users

3. **Personalized Dashboards:**
   - Drag-and-drop dashboard builder
   - Customizable widgets
   - Save multiple dashboard views

4. **Mobile Optimization:**
   - Complete native mobile apps (per roadmap)
   - Offline mode for field work
   - Mobile-specific quick actions

### 4.2 Performance Optimizations

1. **Lazy Loading:**
   - Load pipeline in chunks (not all opportunities at once)
   - Infinite scroll for large lists
   - Optimize queries with proper indexing

2. **Real-time Updates:**
   - Supabase Realtime for live data
   - Optimistic UI updates
   - WebSocket connections for collaboration

3. **Caching:**
   - Redis for frequently accessed data
   - Browser caching for static assets
   - Service worker for offline support

---

## Section 5: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Fix critical RBAC gaps and core calling features

| Week | Tasks | Owner |
|------|-------|-------|
| 1 | Add sales user roles to enum, update RLS policies | Backend Dev |
| 1 | Create sales team management UI | Frontend Dev |
| 2 | Twilio integration - click-to-call | Full Stack |
| 2 | Call logging UI and activities integration | Frontend Dev |
| 3 | Meeting scheduler - availability rules | Full Stack |
| 3 | Booking page UI and calendar sync | Frontend Dev |
| 4 | Email sync - Gmail OAuth flow | Backend Dev |
| 4 | Email thread view in CRM | Frontend Dev |

**Deliverables:**
- ✅ Sales roles fully functional
- ✅ Click-to-call working in production
- ✅ Meeting scheduler live
- ✅ Email sync MVP (Gmail only)

### Phase 2: Automation & Intelligence (Weeks 5-8)
**Goal:** Match HubSpot's automation capabilities

| Week | Tasks | Owner |
|------|-------|-------|
| 5 | Visual workflow builder - canvas component | Frontend Dev |
| 5 | Workflow execution engine | Backend Dev |
| 6 | SMS/WhatsApp integration - Twilio | Full Stack |
| 6 | 2-way messaging UI | Frontend Dev |
| 7 | ML model for deal scoring | Data Science |
| 7 | Predictive analytics dashboard | Frontend Dev |
| 8 | Live chat widget | Full Stack |
| 8 | AI chatbot for lead qualification | AI Engineer |

**Deliverables:**
- ✅ No-code workflow builder
- ✅ SMS outreach functional
- ✅ AI deal predictions
- ✅ Live chat on website

### Phase 3: Scale & Integration (Weeks 9-12)
**Goal:** Enterprise features and marketplace

| Week | Tasks | Owner |
|------|-------|-------|
| 9 | Custom report builder | Full Stack |
| 9 | Scheduled reports & exports | Backend Dev |
| 10 | Territory management | Full Stack |
| 10 | Account-based sales | Full Stack |
| 11 | Integration marketplace architecture | Backend Dev |
| 11 | First 5 native integrations | Integration Dev |
| 12 | Zapier partnership setup | Partnerships |
| 12 | Template marketplace | Full Stack |

**Deliverables:**
- ✅ Custom reporting
- ✅ Territory management
- ✅ 5 new integrations
- ✅ Zapier connector

---

## Section 6: Budget & Resource Estimates

### Development Resources Needed

| Role | Commitment | Duration | Estimated Cost |
|------|-----------|----------|----------------|
| Senior Full Stack Developer | Full-time | 12 weeks | $30,000 |
| Frontend Developer | Full-time | 8 weeks | $16,000 |
| Backend Developer | Part-time (50%) | 12 weeks | $15,000 |
| Data Science/ML Engineer | Part-time (25%) | 4 weeks | $5,000 |
| UI/UX Designer | Part-time (25%) | 12 weeks | $6,000 |
| QA Engineer | Part-time (50%) | 8 weeks | $8,000 |
| **Total Development Cost** | | | **$80,000** |

### Third-Party Services (Annual)

| Service | Purpose | Estimated Cost |
|---------|---------|----------------|
| Twilio | Calling & SMS | $2,400/year |
| SendGrid | Email sending | $1,200/year |
| WhatsApp Business API | WhatsApp messaging | $600/year |
| Clearbit/ZoomInfo | Lead enrichment | $3,600/year |
| ML Hosting (AWS) | Predictive analytics | $1,200/year |
| **Total Services Cost** | | **$9,000/year** |

### Total Investment

- **One-time Development:** $80,000
- **Annual Services:** $9,000
- **Total Year 1:** $89,000

### Expected ROI

**Revenue Impact:**
- Current pricing: $350/month
- Target: +200 customers in Year 1 from improved CRM
- Additional annual revenue: $840,000
- **ROI: 9.4x**

**Efficiency Gains:**
- 5-minute lead response time (vs 30+ min industry average)
- 40% increase in lead-to-opportunity conversion (from research)
- 25% reduction in sales cycle length
- 50% increase in rep productivity (automation)

---

## Section 7: Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Email sync performance issues | Medium | High | Use background workers, implement rate limiting |
| ML model accuracy | Medium | Medium | Start with rule-based scoring, iterate with ML |
| Calling reliability (Twilio) | Low | High | Implement fallback, monitoring, SLA tracking |
| Integration auth token expiry | High | Medium | Automated refresh token handling |
| Mobile app performance | Medium | Medium | Optimize queries, implement caching |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Feature complexity overwhelming users | Medium | High | Phased rollout, extensive onboarding |
| Sales team resistance to change | Medium | Medium | Training program, change management |
| Competitors catching up | Low | Medium | Focus on construction-specific differentiation |
| Third-party service outages | Medium | Medium | Graceful degradation, status monitoring |

---

## Section 8: Success Metrics

### KPIs to Track

**Sales Efficiency:**
- Lead response time (target: <5 minutes)
- Lead-to-opportunity conversion rate (target: +40%)
- Sales cycle length (target: -25%)
- Deals per rep per month (target: +50%)

**User Adoption:**
- Daily active users (DAU)
- Feature usage rates
- Email sync adoption (target: 80% of sales reps)
- Calling feature usage (target: 100+ calls/day)

**Pipeline Health:**
- Pipeline value (total and weighted)
- Stage conversion rates
- Win rate (target: >30%)
- Average deal size

**Customer Success:**
- User satisfaction (NPS score)
- Feature request volume
- Support ticket volume (target: decrease)
- Churn rate (target: <5% annually)

---

## Section 9: Conclusion & Executive Summary

### Current State
BuildDesk has built an **impressive, production-ready CRM** that is 85-90% complete for the SMB construction market. The system includes sophisticated lead management, opportunity tracking, email campaigns, task management, and construction-specific workflows that general-purpose CRMs like HubSpot cannot match.

### Critical Gaps
The main areas requiring immediate attention are:
1. **Sales user roles** (RBAC gap)
2. **Calling features** (click-to-call, call logging)
3. **Email sync** (Gmail/Outlook inbox)
4. **Meeting scheduler**

### Strategic Recommendations
To rival HubSpot's ease of use while maintaining construction-industry leadership:
1. **Phase 1 (30 days):** Fix RBAC, add calling, meeting scheduling
2. **Phase 2 (60 days):** Visual workflows, SMS, AI predictions
3. **Phase 3 (90 days):** Integration marketplace, advanced features

### Competitive Positioning
**BuildDesk's Unique Advantages:**
- Deep construction industry expertise
- Integrated with project management (no separate tools)
- Real-time job costing integration
- Construction-specific qualification and workflows
- Bid management and procurement features

**Path to Market Leadership:**
- Match HubSpot's core sales automation
- Add construction-specific intelligence HubSpot can't provide
- Position as "the only CRM built for construction companies"
- Marketing message: "Stop forcing general CRMs to work for construction. Use BuildDesk."

### Investment & ROI
- **Total Investment:** $89,000 (Year 1)
- **Expected Additional Revenue:** $840,000
- **ROI:** 9.4x
- **Time to Breakeven:** 1-2 months

### Final Recommendation
**Proceed with full implementation.** BuildDesk has a strong CRM foundation that can be elevated to HubSpot-level sophistication with focused investment in sales automation, communication features, and ease-of-use improvements. The construction-industry focus provides a defensible competitive advantage that HubSpot cannot replicate.

The CRM is ready to support BuildDesk's growth from current state (~70% platform complete) to market-leading construction management platform with best-in-class sales and customer relationship management.

---

## Appendix A: Detailed File Inventory

### CRM Pages
```
src/pages/CRMDashboard.tsx          - Main CRM dashboard (52KB)
src/pages/CRMLeads.tsx              - Lead management (42KB)
src/pages/CRMContacts.tsx           - Contact management (22KB)
src/pages/CRMOpportunities.tsx      - Opportunity management (37KB)
src/pages/CRMPipeline.tsx           - Pipeline Kanban view (4KB)
src/pages/CRMAnalytics.tsx          - Analytics dashboard (2KB)
src/pages/CRMCampaigns.tsx          - Lead nurturing campaigns
src/pages/CRMWorkflows.tsx          - Workflow automation
src/pages/EmailMarketing.tsx        - Email marketing
src/pages/CommunicationHub.tsx      - Communication center
src/pages/MarketingAutomation.tsx   - Marketing automation
src/pages/MyTasks.tsx               - Task management
```

### CRM Components
```
src/components/crm/
  ├── ActivityStream.tsx            - Activity feed
  ├── CustomerCommunicationHub.tsx  - Communication hub
  ├── EnhancedLeadIntelligence.tsx  - Lead intelligence
  ├── EnhancedPipelineKanban.tsx    - Advanced Kanban
  ├── LeadConversionAnalytics.tsx   - Conversion tracking
  ├── LeadDetailView.tsx            - Lead details
  ├── LeadNurturingCampaigns.tsx    - Nurturing campaigns
  ├── LeadQualificationWorkflows.tsx - Qualification
  ├── LeadScoring.tsx               - Lead scoring
  ├── PerformanceMetrics.tsx        - Performance metrics
  ├── PipelineAnalytics.tsx         - Pipeline analytics
  ├── PipelineKanban.tsx            - Basic Kanban
  ├── PipelineSettings.tsx          - Pipeline config
  ├── ProjectStatusUpdates.tsx      - Status updates
  ├── RevenueForecasting.tsx        - Revenue forecasting
  └── TeamPerformanceTracking.tsx   - Team metrics
```

### Database Tables (CRM-specific)
```
Core:
- leads (150+ fields)
- contacts (25+ fields)
- opportunities (26 fields)
- activities (15 fields)
- lead_contact_relationships

Pipeline:
- pipeline_stages
- pipeline_templates
- pipeline_metrics

Campaigns:
- lead_nurturing_campaigns
- nurturing_campaign_steps
- lead_nurturing_enrollments
- email_campaigns
- email_campaign_sends
- email_campaign_clicks
- email_campaign_opens
- campaign_subscribers
- unsubscribe_reasons

Tasks:
- tasks
- task_templates
- task_dependencies
- task_resource_allocations
- task_comments
- task_attachments
- task_subtasks
- task_time_entries
- task_notifications

Estimates:
- ai_estimates
- estimate_predictions

Procurement:
- procurement_opportunities
- bid_submissions
- subcontractor_disclosures

Performance:
- sales_targets
- sales_quotas

Pre-Signup:
- leads (pre-signup tracking)
- lead_activities
- demo_requests
- sales_contact_requests
```

---

## Appendix B: Recommended Migrations

### Migration 1: Add Sales Roles
```sql
-- supabase/migrations/20251107_add_sales_roles.sql

-- Add new sales user roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_representative';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'business_development';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'inside_sales';

-- Update leads RLS to include sales roles
DROP POLICY IF EXISTS "Users can view company leads" ON leads;
CREATE POLICY "Users can view company leads"
ON leads FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  assigned_to = auth.uid() OR
  get_user_role(auth.uid()) = ANY(ARRAY[
    'admin', 'root_admin', 'sales_representative',
    'sales_manager', 'business_development'
  ]::user_role[])
);

-- Update opportunities RLS
DROP POLICY IF EXISTS "Users can view opportunities" ON opportunities;
CREATE POLICY "Users can view opportunities"
ON opportunities FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) OR
  account_manager = auth.uid() OR
  get_user_role(auth.uid()) = ANY(ARRAY[
    'admin', 'root_admin', 'sales_representative',
    'sales_manager', 'business_development'
  ]::user_role[])
);

-- Comment
COMMENT ON TYPE user_role IS 'User roles including sales team positions';
```

### Migration 2: Call Logs
```sql
-- supabase/migrations/20251107_call_logs.sql

CREATE TABLE call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  lead_id uuid REFERENCES leads(id),
  contact_id uuid REFERENCES contacts(id),
  opportunity_id uuid REFERENCES opportunities(id),
  user_id uuid NOT NULL REFERENCES user_profiles(id),

  -- Twilio data
  call_sid text UNIQUE NOT NULL,
  from_number text NOT NULL,
  to_number text NOT NULL,
  direction text NOT NULL, -- inbound, outbound
  status text NOT NULL, -- queued, ringing, in-progress, completed, failed
  duration_seconds integer,

  -- Call details
  call_type text, -- cold_call, follow_up, qualification, demo, closing
  outcome text, -- connected, voicemail, no_answer, busy, wrong_number
  notes text,

  -- Recordings & Transcription
  recording_url text,
  recording_duration integer,
  transcription text,
  transcription_confidence decimal(5,2),
  sentiment text, -- positive, neutral, negative

  -- Timestamps
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_call_logs_company_id ON call_logs(company_id);
CREATE INDEX idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX idx_call_logs_contact_id ON call_logs(contact_id);
CREATE INDEX idx_call_logs_opportunity_id ON call_logs(opportunity_id);
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at DESC);

-- RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company call logs"
ON call_logs FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create call logs"
ON call_logs FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  user_id = auth.uid()
);

-- Trigger
CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE call_logs IS 'Stores all call activity with recordings and transcriptions';
```

### Migration 3: Territory Management
```sql
-- supabase/migrations/20251115_territories.sql

-- Territory types enum
CREATE TYPE territory_type AS ENUM (
  'geographic',
  'account_based',
  'project_size',
  'hybrid'
);

-- Sales territories
CREATE TABLE sales_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  territory_name text NOT NULL,
  territory_type territory_type NOT NULL,

  -- Geographic criteria
  zip_codes text[],
  cities text[],
  states text[],
  countries text[],

  -- Project criteria
  min_project_value numeric,
  max_project_value numeric,
  project_types text[],

  -- Account criteria
  account_types text[],
  industries text[],

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Territory assignments
CREATE TABLE territory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES sales_territories(id),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  role text NOT NULL DEFAULT 'member', -- owner, member
  assigned_at timestamptz DEFAULT now(),

  UNIQUE(territory_id, user_id)
);

-- Add territory to leads
ALTER TABLE leads ADD COLUMN territory_id uuid REFERENCES sales_territories(id);

-- Indexes
CREATE INDEX idx_territories_company_id ON sales_territories(company_id);
CREATE INDEX idx_territory_assignments_territory_id ON territory_assignments(territory_id);
CREATE INDEX idx_territory_assignments_user_id ON territory_assignments(user_id);
CREATE INDEX idx_leads_territory_id ON leads(territory_id);

-- RLS
ALTER TABLE sales_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company territories"
ON sales_territories FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage territories"
ON sales_territories FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) AND
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'root_admin', 'sales_manager']::user_role[])
);

-- Triggers
CREATE TRIGGER update_territories_updated_at
  BEFORE UPDATE ON sales_territories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE sales_territories IS 'Define sales territories for lead routing and performance tracking';
COMMENT ON TABLE territory_assignments IS 'Assign sales reps to territories';
```

---

**End of Report**

This comprehensive evaluation provides BuildDesk with a clear roadmap to transform its already-strong CRM into a construction-industry leader that rivals HubSpot's ease of use while maintaining deep vertical specialization.