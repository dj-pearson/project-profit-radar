# BuildDesk CRM Database Schema Analysis

## Executive Summary
BuildDesk has implemented a comprehensive CRM system with lead tracking, deal pipeline management, contact management, email campaigns, and sales activity tracking. The system is distributed across multiple migration files and is well-structured with Row Level Security (RLS) policies for multi-tenancy.

---

## 1. LEAD MANAGEMENT TABLES

### `leads` Table
**Location**: `20250710175952-5048e02d-8811-4740-93a5-078b45925690.sql`, `20250202000000_lead_tracking_system.sql`
**Purpose**: Pre-signup and post-signup lead tracking

**Key Fields**:
- `id` (UUID): Primary key
- `company_id` (UUID): Company reference (multi-tenant)
- `email` (TEXT): Unique email address
- `first_name`, `last_name` (TEXT)
- `company_name` (TEXT)
- `phone`, `job_title` (TEXT)
- `lead_source` (TEXT): website, referral, social_media, advertising, cold_outreach
- `lead_status` (TEXT): new, contacted, qualified, demo_scheduled, converted, lost
- `priority` (TEXT): low, medium, high, hot
- `lead_score` (INTEGER): Auto-calculated based on activities
- Lead qualification fields:
  - `interest_type` (TEXT): trial, demo, sales_contact, just_browsing
  - `requested_demo` (BOOLEAN)
  - `requested_sales_contact` (BOOLEAN)
  - `downloaded_resource` (BOOLEAN)
  - `viewed_pricing` (BOOLEAN)
  - `started_signup` (BOOLEAN)
- Assignment & Conversion:
  - `assigned_to` (UUID): Sales rep reference
  - `converted_to_user_id` (UUID): Reference to auth.users when converted
  - `conversion_value` (DECIMAL): Deal value
- Campaign tracking:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` (TEXT)
  - `landing_page`, `referrer` (TEXT)
- Metadata:
  - `notes` (TEXT)
  - `tags` (TEXT[])
  - `first_seen_at`, `last_activity_at`, `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_leads_email`
- `idx_leads_status`
- `idx_leads_score` (DESC)
- `idx_leads_created_at` (DESC)
- `idx_leads_assigned_to`
- `idx_leads_priority`

**Relationships**:
- References: `auth.users` (assigned_to, converted_to_user_id)
- Referenced by: `lead_activities`, `demo_requests`, `sales_contact_requests`, `deals`, `opportunities`

---

### `lead_activities` Table
**Location**: `20250202000000_lead_tracking_system.sql`
**Purpose**: Track all lead interactions and behavioral signals for scoring

**Key Fields**:
- `id` (UUID): Primary key
- `lead_id` (UUID): Foreign key to leads
- `activity_type` (TEXT): page_view, form_submit, email_open, email_click, demo_request, pricing_viewed, signup_started, resource_downloaded
- `activity_data` (JSONB): Flexible activity metadata
- `page_url` (TEXT): URL of activity
- Context fields:
  - `ip_address` (INET)
  - `user_agent` (TEXT)
  - `country`, `city` (TEXT)
- `created_at` (TIMESTAMPTZ)

**Lead Scoring Function**: `update_lead_score()` trigger
- Demo request: +50 points
- Pricing viewed: +20 points
- Signup started: +30 points
- Resource downloaded: +15 points
- Email opened: +5 points
- Email clicked: +10 points
- Page view: +1 point

**Indexes**:
- `idx_lead_activities_lead_id`
- `idx_lead_activities_type`
- `idx_lead_activities_created_at`

---

### `demo_requests` Table
**Location**: `20250202000000_lead_tracking_system.sql`
**Purpose**: Track demo request lifecycle

**Key Fields**:
- `id` (UUID): Primary key
- `lead_id` (UUID): Foreign key (optional)
- Contact info (denormalized):
  - `email`, `first_name`, `last_name`, `company_name`, `phone` (TEXT)
- Request details:
  - `demo_type` (TEXT): quick_15min, standard_30min, full_60min
  - `preferred_date` (DATE)
  - `preferred_time` (TEXT)
  - `timezone` (TEXT)
  - `message` (TEXT)
- Scheduling:
  - `scheduled_at` (TIMESTAMPTZ)
  - `calendar_event_id` (TEXT): Calendly/Cal.com integration
  - `meeting_url` (TEXT)
- Status tracking:
  - `status` (TEXT): requested, scheduled, completed, cancelled, no_show
  - `completed_at`, `cancelled_at` (TIMESTAMPTZ)
  - `cancellation_reason` (TEXT)
- Follow-up & Conversion:
  - `follow_up_sent` (BOOLEAN)
  - `follow_up_sent_at` (TIMESTAMPTZ)
  - `converted_to_paid` (BOOLEAN)
  - `converted_at` (TIMESTAMPTZ)
- `assigned_sales_rep` (UUID): Reference to auth.users

**Indexes**:
- `idx_demo_requests_lead_id`
- `idx_demo_requests_email`
- `idx_demo_requests_status`
- `idx_demo_requests_scheduled_at`
- `idx_demo_requests_created_at`

---

### `sales_contact_requests` Table
**Location**: `20250202000000_lead_tracking_system.sql`
**Purpose**: Track sales inquiry requests from leads

**Key Fields**:
- `id` (UUID): Primary key
- `lead_id` (UUID): Foreign key (optional)
- Contact info (denormalized):
  - `email`, `first_name`, `last_name`, `company_name`, `phone` (TEXT)
- Request details:
  - `inquiry_type` (TEXT): pricing, enterprise, partnership, general
  - `message` (TEXT)
  - `estimated_budget` (TEXT)
  - `timeline` (TEXT): immediate, 1-3_months, 3-6_months, 6-12_months, planning
- Status & Assignment:
  - `status` (TEXT): new, contacted, in_progress, qualified, converted, closed
  - `contacted_at` (TIMESTAMPTZ)
  - `assigned_to` (UUID): Reference to auth.users
  - `assigned_at` (TIMESTAMPTZ)
- Follow-up:
  - `notes` (TEXT)

**Indexes**:
- `idx_sales_contacts_lead_id`
- `idx_sales_contacts_email`
- `idx_sales_contacts_status`
- `idx_sales_contacts_assigned_to`
- `idx_sales_contacts_created_at`

---

## 2. CONTACT & ACCOUNT MANAGEMENT

### `contacts` Table
**Location**: `20250710175952-5048e02d-8811-4740-93a5-078b45925690.sql`
**Purpose**: Central contact directory (prospects, customers, decision makers)

**Key Fields**:
- `id` (UUID): Primary key
- `company_id` (UUID): Company reference
- Personal info:
  - `first_name`, `last_name` (TEXT, NOT NULL)
  - `email`, `phone`, `mobile_phone` (TEXT)
  - `job_title`, `department` (TEXT)
- Company info:
  - `company_name` (TEXT)
  - `address`, `city`, `state`, `zip_code`, `country` (TEXT)
  - `website`, `linkedin_profile` (TEXT)
- Contact classification:
  - `contact_type` (TEXT): prospect, customer, vendor, partner, decision_maker, influencer
  - `relationship_status` (TEXT): active, inactive, lost, won
  - `preferred_contact_method` (TEXT): email, phone, meeting
- Temporal:
  - `time_zone` (TEXT)
  - `birthday`, `anniversary` (DATE)
- Engagement:
  - `lead_source` (TEXT)
  - `last_contact_date`, `next_contact_date` (DATE)
- Assignment & Metadata:
  - `assigned_to` (UUID): Sales rep reference
  - `notes` (TEXT)
  - `tags` (TEXT[])
  - `custom_fields` (JSONB)
- Audit:
  - `created_by` (UUID)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_contacts_company_id`
- `idx_contacts_contact_type`
- `idx_contacts_assigned_to`
- `idx_contacts_created_at`

**Relationships**:
- References: `companies`, `user_profiles` (assigned_to, created_by)
- Referenced by: `deals`, `opportunities`, `deal_activities`, `crm_activities`

---

## 3. DEAL & OPPORTUNITY MANAGEMENT

### `opportunities` Table
**Location**: `20250710175952-5048e02d-8811-4740-93a5-078b45925690.sql`
**Purpose**: Sales opportunities (projects, bids)

**Key Fields**:
- `id` (UUID): Primary key
- `company_id` (UUID): Company reference
- Basic info:
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `project_type` (TEXT)
- Relationships:
  - `lead_id` (UUID): Source lead
  - `contact_id` (UUID): Primary contact
  - `project_id` (UUID): Associated project (if converted to project)
- Financial:
  - `estimated_value` (NUMERIC, NOT NULL)
  - `actual_value` (NUMERIC)
  - `probability_percent` (INTEGER): 0-100 weighted value
- Pipeline:
  - `stage` (TEXT): prospecting, qualified, proposal, negotiation, won, lost
  - `pipeline_position` (INTEGER)
  - `expected_close_date` (DATE)
- Bidding:
  - `bid_required` (BOOLEAN)
  - `bid_due_date` (DATE)
  - `proposal_sent_date` (DATE)
  - `contract_signed_date` (DATE)
- Competitive Analysis:
  - `competitor_names` (TEXT[])
  - `our_competitive_advantage` (TEXT)
  - `key_decision_factors` (TEXT[])
- Risk Assessment:
  - `risk_level` (TEXT): low, medium, high
  - `risk_factors` (TEXT[])
  - `mitigation_strategies` (TEXT)
- Assignment:
  - `account_manager` (UUID)
  - `estimator` (UUID)
  - `project_manager` (UUID)
- Outcome:
  - `close_date` (DATE)
  - `close_reason` (TEXT)
- Metadata:
  - `notes` (TEXT)
  - `tags` (TEXT[])

**Indexes**:
- `idx_opportunities_company_id`
- `idx_opportunities_stage`
- `idx_opportunities_account_manager`
- `idx_opportunities_created_at`

---

### `deals` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Enhanced deal/opportunity tracking with pipeline stages

**Key Fields**:
- `id` (UUID): Primary key
- `company_id` (UUID): Company reference
- `lead_id` (UUID): Associated lead (optional)
- `contact_id` (UUID): Associated contact
- `pipeline_template_id` (UUID): Sales pipeline template
- `current_stage_id` (UUID): Current pipeline stage
- Basic info:
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `deal_type` (TEXT): standard, large_project, residential, commercial
- Financial:
  - `estimated_value` (DECIMAL 15,2)
  - `actual_value` (DECIMAL 15,2)
  - `weighted_value` (GENERATED): estimated_value * (stage probability / 100)
  - `days_in_pipeline` (GENERATED): Auto-calculated
- Timeline:
  - `expected_close_date` (DATE)
  - `actual_close_date` (DATE)
- Contacts:
  - `primary_contact_id` (UUID)
  - `account_manager_id` (UUID)
  - `sales_rep_id` (UUID)
- Competition & Strategy:
  - `competitors` (JSONB): List of competitors
  - `competitive_advantage` (TEXT)
  - `key_success_factors` (JSONB)
- Risk:
  - `risk_level` (TEXT): low, medium, high, critical
  - `risk_factors` (JSONB)
  - `mitigation_strategies` (TEXT)
- Status:
  - `status` (TEXT): active, won, lost, on_hold
  - `priority` (TEXT): low, medium, high, urgent
  - `source` (TEXT): Lead source
- Closing:
  - `won_reason`, `lost_reason`, `lost_to_competitor` (TEXT)
- Metadata:
  - `custom_fields` (JSONB)
  - `tags` (TEXT[])

**Indexes**:
- `idx_deals_company_stage`
- `idx_deals_sales_rep`
- `idx_deals_close_date` (WHERE status = 'active')

---

### `deal_stage_history` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Track deal progression through pipeline stages

**Key Fields**:
- `id` (UUID): Primary key
- `deal_id` (UUID): Reference to deal
- `from_stage_id` (UUID): Previous stage
- `to_stage_id` (UUID): New stage
- `moved_by` (UUID): User who moved the deal
- `moved_at` (TIMESTAMPTZ)
- `notes` (TEXT)
- `days_in_previous_stage` (INTEGER)
- `auto_moved` (BOOLEAN): Whether automation moved the deal
- Value tracking:
  - `value_before`, `value_after` (DECIMAL 15,2)
  - `probability_before`, `probability_after` (INTEGER)

---

### `deal_activities` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Track interactions and activities on deals

**Key Fields**:
- `id` (UUID): Primary key
- `deal_id` (UUID): Reference to deal
- `activity_type` (TEXT): call, email, meeting, note, task, proposal_sent, contract_signed
- `subject` (TEXT)
- `description` (TEXT)
- `outcome` (TEXT)
- `next_action` (TEXT)
- Scheduling:
  - `due_date` (TIMESTAMPTZ)
  - `completed_at` (TIMESTAMPTZ)
  - `duration_minutes` (INTEGER)
- Assignment:
  - `assigned_to` (UUID)
  - `created_by` (UUID)
  - `contact_id` (UUID)
- Metadata:
  - `document_id` (UUID)
  - `metadata` (JSONB)
  - `is_completed` (BOOLEAN)
  - `is_automated` (BOOLEAN)

---

### `pipeline_templates` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Define different sales pipelines

**Key Fields**:
- `id` (UUID): Primary key
- `company_id` (UUID)
- `name` (TEXT): e.g., "Standard Sales", "Enterprise Deal"
- `description` (TEXT)
- `deal_type` (TEXT): standard, large_project, residential, commercial
- `is_default` (BOOLEAN)
- `is_active` (BOOLEAN)

---

### `pipeline_stages` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Define stages within a sales pipeline

**Key Fields**:
- `id` (UUID): Primary key
- `template_id` (UUID): Parent pipeline template
- `company_id` (UUID)
- `name` (TEXT): e.g., "Prospecting", "Proposal"
- `description` (TEXT)
- `stage_order` (INTEGER): Position in pipeline
- `color_code` (TEXT): UI display color
- `probability_weight` (INTEGER): 0-100 for forecasting
- `is_final_stage` (BOOLEAN)
- `is_won_stage` (BOOLEAN)
- `is_lost_stage` (BOOLEAN)
- `auto_tasks` (JSONB): Automated tasks on stage entry
- `required_fields` (JSONB): Required fields to advance
- `expected_duration_days` (INTEGER)
- `conversion_rate` (DECIMAL 5,2): Historical conversion %

---

### `crm_activities` Table
**Location**: `20251104012605_e76c7a5b-4bf4-4053-b374-16e51f4cfc1f.sql`
**Purpose**: General CRM activities for leads and opportunities (separate from deal_activities)

**Key Fields**:
- `id` (UUID): Primary key
- `activity_type` (TEXT)
- `activity_date` (TIMESTAMPTZ)
- `description` (TEXT)
- `outcome` (TEXT)
- `duration_minutes` (INTEGER)
- `lead_id` (UUID): Reference to lead
- `opportunity_id` (UUID): Reference to opportunity
- `created_by` (UUID)
- `company_id` (UUID)

**Indexes**:
- `idx_crm_activities_lead_id`
- `idx_crm_activities_opportunity_id`
- `idx_crm_activities_created_by`
- `idx_crm_activities_company_id`

---

## 4. EMAIL CAMPAIGN & COMMUNICATION TABLES

### `email_campaigns` Table
**Location**: `20250202000001_email_campaigns_system.sql`
**Purpose**: Email marketing campaign definitions and management

**Key Fields**:
- `id` (UUID): Primary key
- Campaign identification:
  - `campaign_name` (TEXT, UNIQUE)
  - `campaign_description` (TEXT)
  - `campaign_type` (TEXT): onboarding, trial_nurture, promotional, transactional, reengagement
- Trigger configuration:
  - `trigger_type` (TEXT): manual, scheduled, behavioral, lifecycle
  - `trigger_conditions` (JSONB)
  - `trigger_event` (TEXT)
- Email content:
  - `subject_line`, `preview_text` (TEXT)
  - `from_name`, `from_email`, `reply_to` (TEXT)
  - `html_content`, `text_content` (TEXT)
  - `template_id` (TEXT): External template ID
  - `template_variables` (JSONB)
- Scheduling:
  - `send_delay_minutes` (INTEGER)
  - `send_at_time` (TIME): Specific time of day
  - `send_on_days` (INTEGER[]): Days of week
- Sequence:
  - `sequence_name` (TEXT)
  - `sequence_order` (INTEGER)
- A/B Testing:
  - `ab_test_enabled` (BOOLEAN)
  - `ab_test_variant` (TEXT): A, B, C, etc.
  - `ab_test_traffic_percentage` (INTEGER)
- Status & Metrics:
  - `is_active` (BOOLEAN)
  - `total_sent`, `total_delivered` (INTEGER)
  - `total_opened`, `total_clicked` (INTEGER)
  - `total_unsubscribed`, `total_bounced`, `total_complained` (INTEGER)
- Metadata:
  - `created_by` (UUID)
  - `last_sent_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_email_campaigns_name`
- `idx_email_campaigns_type`
- `idx_email_campaigns_sequence`
- `idx_email_campaigns_active`

---

### `email_sends` Table
**Location**: `20250202000001_email_campaigns_system.sql`
**Purpose**: Individual email send tracking and engagement

**Key Fields**:
- `id` (UUID): Primary key
- `campaign_id` (UUID): Reference to campaign
- Recipient:
  - `user_id` (UUID)
  - `recipient_email`, `recipient_name` (TEXT)
- Email details:
  - `subject`, `from_email` (TEXT)
- Provider:
  - `email_provider` (TEXT): sendgrid, postmark, resend
  - `email_provider_id` (TEXT): Provider message ID
  - `email_provider_data` (JSONB)
- Status tracking:
  - `status` (TEXT): pending, queued, sent, delivered, bounced, failed, dropped
  - `sent_at`, `delivered_at` (TIMESTAMPTZ)
- Engagement:
  - `opened_at`, `first_opened_at`, `last_opened_at` (TIMESTAMPTZ)
  - `open_count` (INTEGER)
  - `clicked_at`, `first_clicked_at`, `last_clicked_at` (TIMESTAMPTZ)
  - `click_count` (INTEGER)
  - `links_clicked` (TEXT[])
- Negative events:
  - `unsubscribed_at` (TIMESTAMPTZ)
  - `bounced_at`, `bounce_type`, `bounce_reason` (TEXT)
  - `complained_at` (TIMESTAMPTZ)
- Error handling:
  - `error_message`, `error_code` (TEXT)
  - `retry_count`, `max_retries` (INTEGER)
  - `next_retry_at` (TIMESTAMPTZ)
- Metadata:
  - `send_metadata` (JSONB)

**Indexes**:
- `idx_email_sends_campaign`
- `idx_email_sends_user`
- `idx_email_sends_email`
- `idx_email_sends_status`
- `idx_email_sends_sent_at`
- `idx_email_sends_provider_id`

---

### `email_queue` Table
**Location**: `20250202000001_email_campaigns_system.sql`
**Purpose**: Queue for scheduled email sending

**Key Fields**:
- `id` (UUID): Primary key
- `campaign_id` (UUID)
- Recipient:
  - `user_id` (UUID)
  - `recipient_email` (TEXT)
- Scheduling:
  - `scheduled_for` (TIMESTAMPTZ)
  - `priority` (INTEGER): 1 (highest) to 10 (lowest)
- Status:
  - `status` (TEXT): pending, processing, sent, failed, cancelled
  - `attempts`, `last_attempt_at` (INTEGER, TIMESTAMPTZ)
  - `email_send_id` (UUID): Reference to send record
- Metadata:
  - `queue_metadata` (JSONB)

**Indexes**:
- `idx_email_queue_scheduled` (WHERE status = 'pending')
- `idx_email_queue_status`
- `idx_email_queue_user`
- `idx_email_queue_priority`

---

### `email_clicks` Table
**Location**: `20250202000001_email_campaigns_system.sql`
**Purpose**: Track individual email link clicks

**Key Fields**:
- `id` (UUID): Primary key
- `email_send_id` (UUID): Reference to sent email
- `url` (TEXT): Clicked URL
- `link_text` (TEXT)
- `clicked_at` (TIMESTAMPTZ)
- Context:
  - `ip_address` (INET)
  - `user_agent` (TEXT)
  - `country`, `city`, `device_type` (TEXT)
- Tracking:
  - `utm_source`, `utm_medium`, `utm_campaign` (TEXT)

**Indexes**:
- `idx_email_clicks_send`
- `idx_email_clicks_url`
- `idx_email_clicks_clicked_at`

---

### `email_unsubscribes` Table
**Location**: `20250202000001_email_campaigns_system.sql`
**Purpose**: Track email unsubscribe requests

**Key Fields**:
- `id` (UUID): Primary key
- `user_id` (UUID)
- `email` (TEXT)
- `unsubscribe_type` (TEXT): all, promotional, newsletter, transactional_optional
- `reason` (TEXT): too_frequent, not_relevant, never_signed_up, other
- `reason_detail` (TEXT)
- Source:
  - `unsubscribed_from_email_id` (UUID)
  - `unsubscribed_via` (TEXT): link, preference_center, complaint
- `is_active` (BOOLEAN): Can be re-subscribed
- `resubscribed_at` (TIMESTAMPTZ)
- `unsubscribed_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_email_unsubscribes_email`
- `idx_email_unsubscribes_user`
- `idx_email_unsubscribes_active`

---

### `email_preferences` Table
**Location**: `20250202000001_email_campaigns_system.sql`
**Purpose**: User email preferences and settings

**Key Fields**:
- `user_id` (UUID PRIMARY KEY)
- Subscription preferences:
  - `marketing_emails`, `product_updates` (BOOLEAN)
  - `newsletter`, `trial_nurture` (BOOLEAN)
  - `billing_notifications` (BOOLEAN)
- Frequency:
  - `email_frequency` (TEXT): high, normal, low
  - `digest_enabled` (BOOLEAN)
  - `digest_frequency` (TEXT): daily, weekly, monthly
- Quiet hours:
  - `quiet_hours_enabled` (BOOLEAN)
  - `quiet_hours_start`, `quiet_hours_end` (TIME)
  - `timezone` (TEXT)

---

## 5. SALES MANAGEMENT TABLES

### `sales_quotas` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Sales targets and quotas tracking

**Key Fields**:
- `id` (UUID): Primary key
- `company_id`, `user_id` (UUID)
- Period:
  - `quota_period` (TEXT): monthly, quarterly, yearly
  - `start_date`, `end_date` (DATE)
- Targets:
  - `revenue_target` (DECIMAL 15,2)
  - `deals_target`, `calls_target`, `meetings_target` (INTEGER)
- Focus:
  - `territory` (TEXT)
  - `deal_types` (TEXT[])
- `is_active` (BOOLEAN)

---

### `lead_routing_rules` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Automatic lead assignment based on criteria

**Key Fields**:
- `id` (UUID): Primary key
- `company_id` (UUID)
- `name`, `description` (TEXT)
- `priority` (INTEGER): Higher = higher priority
- `is_active` (BOOLEAN)
- `conditions` (JSONB): Rules engine conditions
- Actions:
  - `assign_to_user_id` (UUID)
  - `assign_to_team` (TEXT)
  - `set_priority` (TEXT)
  - `add_tags` (TEXT[])
  - `auto_create_tasks` (JSONB)
- Round Robin:
  - `use_round_robin` (BOOLEAN)
  - `round_robin_users` (UUID[])
  - `last_assigned_user_id` (UUID)

---

### `pipeline_metrics` Table
**Location**: `20250724014628-f46a1e34-e526-4773-9204-97ade4e68f84.sql`
**Purpose**: Sales pipeline analytics and performance metrics

**Key Fields**:
- `id` (UUID): Primary key
- `company_id`, `template_id` (UUID)
- Period:
  - `metric_date` (DATE)
  - `period_type` (TEXT): daily, weekly, monthly, quarterly
- Deal counts:
  - `deals_created`, `deals_won`, `deals_lost`, `deals_active` (INTEGER)
- Value metrics:
  - `total_pipeline_value`, `weighted_pipeline_value` (DECIMAL 15,2)
  - `won_value`, `lost_value` (DECIMAL 15,2)
- Performance:
  - `average_deal_size` (DECIMAL 15,2)
  - `average_cycle_time` (DECIMAL 8,2)
  - `win_rate`, `conversion_rate` (DECIMAL 5,2)
- Velocity:
  - `deals_moved_forward`, `deals_moved_backward` (INTEGER)
  - `stages_velocity` (JSONB)

---

## 6. RELATED TABLES (WITH CRM INTEGRATION)

### `estimates` Table
**Location**: `20250712210005-7fe9f9cf-5597-4811-be52-8191b4c77145.sql`
**Purpose**: Cost estimates and quotes for opportunities

**Key Fields**:
- `id` (UUID): Primary key
- `opportunity_id` (UUID): Reference to opportunity
- `company_id` (UUID)
- Estimate info:
  - Estimate number, total amount, status
  - Created by, created at, updated at

### `tasks` Table
**Location**: Multiple migrations
**Purpose**: Project and CRM tasks

**Key Fields**:
- Task for CRM follow-ups and reminders
- Can be linked to deals, opportunities, contacts
- Status tracking (open, in_progress, completed)
- Due date, assignment, priority

---

## 7. USER ROLES FOR SALES

Based on analysis, the following user roles have CRM access:

**Roles**:
1. **root_admin**: Platform-level admin with full access
2. **admin**: Company admin with full CRM access
3. **office_staff**: Can view and manage leads, contacts, deals
4. **project_manager**: Can view and manage opportunities

**NOT included in typical CRM role access**:
- field_supervisor
- client_portal
- accounting

**Sales Rep Role**: Not explicitly defined as a role type; sales reps are assigned via foreign key references in leads, deals, contacts tables

---

## 8. KEY RELATIONSHIPS & WORKFLOWS

### Lead to Customer Journey
```
leads (pre-signup) → 
lead_activities (behavioral tracking) → 
demo_requests / sales_contact_requests (qualification) → 
contacts (customer record) → 
opportunities (sales opportunity) → 
deals (pipeline tracking) → 
projects (conversion to actual project)
```

### Email Campaign Workflow
```
email_campaigns (campaign definition) → 
email_queue (scheduled sends) → 
email_sends (actual sends) → 
email_clicks (engagement tracking) → 
email_unsubscribes (preference management)
```

### Deal Pipeline Workflow
```
leads/contacts → 
opportunities → 
deals → 
deal_stage_history (pipeline progression) → 
deal_activities (customer interactions)
```

---

## 9. GAPS & MISSING FUNCTIONALITY

### Critical Gaps:
1. **No explicit "company" or "accounts" table for enterprise customers**
   - Opportunity table has company_id but no dedicated account management
   - No territory or account-based sales structure

2. **Limited communication tracking**
   - No dedicated "calls" table (only in crm_activities)
   - No "meetings" table (tracked in deal_activities)
   - No SMS/WhatsApp communication tracking

3. **No forecast/pipeline value rollup**
   - pipeline_metrics exists but appears to be static snapshots
   - No real-time weighted pipeline calculations shown

4. **Limited task management for CRM**
   - Tasks exist but relationship to CRM entities (leads, contacts, deals) not explicitly defined
   - No native follow-up reminders linked to leads/contacts

5. **No explicit activity feed for CRM**
   - `activity_feed` table exists but seems focused on projects
   - CRM activities tracked separately in multiple tables

6. **No integration records table**
   - No tracking of CRM integrations with Salesforce, Pipedrive, HubSpot
   - Calendar integration exists but no CRM sync records

7. **No lost deal analysis**
   - `deals.lost_reason`, `lost_to_competitor` exist
   - But no dedicated "lost_deals_analysis" or win/loss reporting

8. **No prospect list/campaign management**
   - No "lists" or "segments" table for targeting
   - Email campaigns exist but no segmentation for CRM

---

## 10. DATA SECURITY & ACCESS CONTROL

### Row Level Security (RLS)
All CRM tables have RLS policies:

**Lead Access**:
- Admin and office_staff can view all leads
- Users can only view leads assigned to them
- Anyone can create leads (pre-signup forms)

**Contact Access**:
- Staff can manage company contacts
- Users view only their company's contacts

**Deal/Opportunity Access**:
- Filtered by company_id
- Role-based access (admin, project_manager, office_staff)

**Email Campaign Access**:
- Admins can manage campaigns
- Users see their own email sends
- Service role manages system sends

---

## 11. ANALYTICS & REPORTING

### Available Metrics:
- `ai_lead_scores`: AI-powered lead scoring and insights
- `pipeline_metrics`: Sales pipeline analytics
- Lead score calculation via triggers
- Email campaign metrics aggregation
- Deal progression tracking via stage history

### Missing Analytics:
- Sales rep performance dashboards
- Contact quality metrics
- Proposal-to-close rates
- Demo-to-deal conversion rates
- Time-to-close analytics by stage
- Contact source effectiveness metrics

---

## 12. SUMMARY TABLE

| Component | Tables | Status | Priority |
|-----------|--------|--------|----------|
| Lead Management | leads, lead_activities, demo_requests, sales_contact_requests | ✅ Complete | High |
| Contacts | contacts | ✅ Complete | High |
| Opportunities | opportunities, crm_activities | ✅ Complete | High |
| Deal Pipeline | deals, pipeline_templates, pipeline_stages, deal_stage_history, deal_activities | ✅ Complete | High |
| Email Campaigns | email_campaigns, email_sends, email_queue, email_clicks, email_preferences, email_unsubscribes | ✅ Complete | Medium |
| Sales Management | sales_quotas, lead_routing_rules, pipeline_metrics | ✅ Complete | Medium |
| Communication | email only | ⚠️ Partial | High |
| Task Management | tasks (linked to CRM) | ⚠️ Partial | Medium |
| Integration Tracking | None | ❌ Missing | Low |
| Segmentation | None | ❌ Missing | Low |
| Account Management | None | ❌ Missing | Low |

---

