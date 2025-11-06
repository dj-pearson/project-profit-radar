# BuildDesk CRM - Quick Reference Guide

## Complete CRM Table List (30 Tables)

### Core CRM Tables (8)
| Table | Purpose | Key Fields | Status |
|-------|---------|-----------|--------|
| `leads` | Pre/post-signup lead tracking | email, status, score, source, assigned_to | ✅ Active |
| `lead_activities` | Lead behavior tracking | activity_type, page_url, ip_address | ✅ Active |
| `demo_requests` | Demo booking & scheduling | status, scheduled_at, assigned_sales_rep | ✅ Active |
| `sales_contact_requests` | Sales inquiry tracking | inquiry_type, budget, timeline, status | ✅ Active |
| `contacts` | Contact directory | email, phone, type, assigned_to, tags | ✅ Active |
| `opportunities` | Sales opportunities | estimated_value, stage, close_date | ✅ Active |
| `deals` | Deal pipeline tracking | current_stage_id, weighted_value, status | ✅ Active |
| `crm_activities` | General CRM interactions | activity_type, lead_id, opportunity_id | ✅ Active |

### Deal Pipeline Tables (6)
| Table | Purpose | Key Fields | Status |
|-------|---------|-----------|--------|
| `pipeline_templates` | Pipeline definitions | name, deal_type, is_default | ✅ Active |
| `pipeline_stages` | Stage configuration | stage_order, probability_weight, conversion_rate | ✅ Active |
| `deal_stage_history` | Deal progression tracking | from_stage_id, to_stage_id, moved_at | ✅ Active |
| `deal_activities` | Deal interactions | activity_type, deal_id, completed_at | ✅ Active |
| `pipeline_metrics` | Sales analytics | deals_won, win_rate, avg_cycle_time | ✅ Active |
| `sales_quotas` | Sales targets | revenue_target, deals_target, period | ✅ Active |

### Email Campaign Tables (6)
| Table | Purpose | Key Fields | Status |
|-------|---------|-----------|--------|
| `email_campaigns` | Campaign definitions | campaign_type, trigger_type, is_active | ✅ Active |
| `email_sends` | Individual sends | status, opened_at, clicked_at | ✅ Active |
| `email_queue` | Send scheduling | scheduled_for, priority, status | ✅ Active |
| `email_clicks` | Click tracking | url, clicked_at, device_type | ✅ Active |
| `email_unsubscribes` | Unsubscribe management | unsubscribe_type, reason, is_active | ✅ Active |
| `email_preferences` | User preferences | marketing_emails, digest_enabled | ✅ Active |

### Supporting Tables (3)
| Table | Purpose | Key Fields | Status |
|-------|---------|-----------|--------|
| `lead_routing_rules` | Auto-assignment rules | conditions, assign_to_user_id, use_round_robin | ✅ Active |
| `ai_lead_scores` | AI lead scoring | overall_score, conversion_probability | ✅ Active |
| `estimates` | Quotes/proposals | opportunity_id, total_amount | ✅ Active |

---

## Critical Relationships

```
LEAD GENERATION
leads ←→ lead_activities (many-to-one)
leads → demo_requests (one-to-many)
leads → sales_contact_requests (one-to-many)
leads → contacts (conversion)

SALES PIPELINE
contacts → opportunities (one-to-many)
opportunities → deals (one-to-one conversion)
deals → current_stage_id → pipeline_stages
deals → deal_stage_history (progression history)
deals → deal_activities (interactions)

EMAIL ENGAGEMENT
email_campaigns → email_queue → email_sends
email_sends → email_clicks (engagement)
email_sends → email_unsubscribes (opt-out)

SALES MANAGEMENT
leads → lead_routing_rules (auto-assignment)
sales_rep → sales_quotas (targets)
pipeline_stages → pipeline_templates (configuration)
```

---

## Most Important Relationships for CRM

### 1. Lead Scoring Pipeline
- `leads.lead_score` auto-updated by `lead_activities` table
- Scoring function in trigger: `update_lead_score()`
- Points awarded for: demo_request(+50), signup_started(+30), pricing_viewed(+20), etc.

### 2. Lead to Deal Conversion
- Lead → Demo Request/Sales Contact → Contact → Opportunity → Deal
- `leads.converted_to_user_id` tracks conversion
- `opportunities.lead_id` links back to source lead
- `deals.lead_id` maintains original source

### 3. Sales Pipeline Stage Management
- `deals.current_stage_id` points to active `pipeline_stages`
- `deal_stage_history` records all transitions
- `pipeline_stages.probability_weight` used to calculate `deals.weighted_value`
- `pipeline_templates` define different pipeline types

### 4. Sales Team Assignment
- `leads.assigned_to` → user_profiles (sales rep)
- `contacts.assigned_to` → user_profiles (account manager)
- `deals.sales_rep_id`, `account_manager_id` → user_profiles
- `lead_routing_rules` automates assignment based on conditions

### 5. Email Campaign Targeting
- `email_campaigns` → `email_queue` (scheduling)
- `email_queue` → `email_sends` (actual delivery)
- `email_sends` tracks engagement: opened_at, clicked_at, bounced_at
- `email_unsubscribes` & `email_preferences` manage consent

---

## Data Access Control (RLS Policies)

### By User Role
| Role | Lead Access | Contact Access | Deal Access | Campaign Access |
|------|------------|--------------|-----------|-----------------|
| root_admin | All | All | All | All |
| admin | All | All | All | Manage |
| office_staff | All | All | All | View |
| project_manager | View own | View own | View | View |
| field_supervisor | ❌ | ❌ | ❌ | ❌ |
| client_portal | ❌ | ❌ | ❌ | ❌ |

### By Data Sensitivity
- **Company-wide**: All CRM data scoped to `company_id`
- **User-specific**: Leads assigned to user visible to that user
- **Public**: Anyone can create pre-signup leads (RLS allows anon)
- **Admin-controlled**: Campaigns, quotas, routing rules

---

## Performance Optimization

### Key Indexes
```
leads:              email, status, score DESC, assigned_to, created_at DESC
opportunities:      company_id, stage, account_manager, created_at
deals:              company_id+stage, sales_rep+status, close_date (WHERE active)
deal_activities:    deal_id, created_at
email_campaigns:    name, type, sequence
email_sends:        campaign_id, status, sent_at, provider_id
```

### Generated Columns (Auto-Calculated)
- `deals.weighted_value`: estimated_value × (stage probability weight / 100)
- `deals.days_in_pipeline`: Auto-calculated from dates

---

## CRM Automation Features

### 1. Lead Scoring (Automatic)
- Trigger on `lead_activities` INSERT
- Updates `leads.lead_score` based on activity type
- Updates `leads.last_activity_at` automatically

### 2. Lead Routing (On-Demand)
- Function: `auto_assign_lead(lead_id)`
- Matches conditions against `lead_routing_rules`
- Supports round-robin assignment
- Updates `leads.assigned_to`, priority, tags

### 3. Deal Velocity Calculation
- Function: `calculate_deal_velocity(company_id, start_date, end_date)`
- Returns: stage_name, avg_days, deals_count, conversion_rate
- Based on `deal_stage_history` data

### 4. Campaign Statistics
- Trigger: `trigger_update_campaign_stats`
- Auto-updates email_campaigns metrics on email_sends changes
- Tracks: sent, delivered, opened, clicked, unsubscribed

---

## Missing CRM Capabilities (Gaps)

### High Priority
- [ ] Calls tracking (in CRM activities but no dedicated table)
- [ ] Meetings table (tracked in activities only)
- [ ] Real-time pipeline forecast (metrics are snapshots)
- [ ] Follow-up reminders system (tasks exist but not CRM-linked)

### Medium Priority
- [ ] SMS/WhatsApp tracking
- [ ] Account-based sales structure
- [ ] Territory management
- [ ] Custom segmentation/lists
- [ ] Integration sync logs (Salesforce, HubSpot, etc.)

### Low Priority
- [ ] Win/loss analysis reports
- [ ] Contact quality scoring
- [ ] Proposal success rates
- [ ] Competitive win/loss tracking

---

## API Functions Available

### Lead Management
- `auto_assign_lead(p_lead_id UUID)` → Assigns lead based on rules
- `update_lead_score()` → Trigger function (automatic)

### Deal Management
- `calculate_deal_velocity(company_id, start_date, end_date)` → Analytics
- Deal stage transitions auto-logged

### Email System
- `is_user_unsubscribed(p_email, p_type)` → Check unsubscribe status
- `update_campaign_stats()` → Aggregates metrics (automatic)

---

## Database Statistics

- **Total CRM Tables**: 30
- **Lead Records**: Unlimited (pre-signup capable)
- **Email Templates**: Via template_id references
- **Pipeline Configurations**: Multiple per company
- **Automation Rules**: Per company, no limit specified

---

## Recommended Indexes for Performance

```sql
-- Additional recommended indexes (not yet created)
CREATE INDEX idx_leads_company_status ON leads(company_id, status);
CREATE INDEX idx_deals_company_sales_rep ON deals(company_id, sales_rep_id);
CREATE INDEX idx_opportunities_company_stage ON opportunities(company_id, stage);
CREATE INDEX idx_email_sends_user_created ON email_sends(user_id, created_at DESC);
CREATE INDEX idx_contacts_company_type ON contacts(company_id, contact_type);
```

---

## Integration Points with Other Systems

- **Stripe**: Via subscription records
- **Google Calendar/Outlook**: Demo scheduling integration
- **Email Providers**: SendGrid, Postmark, Resend
- **QuickBooks**: Financial sync (separate system)
- **Projects**: Via project_id in opportunities/deals

---

## Migration Timeline

```
Core CRM:           2025-02-02 (leads, activities, demos)
Email Campaigns:    2025-02-01 (full email system)
Deal Pipeline:      2025-07-24 (enhanced pipeline, templates, quotas)
CRM Activities:     2025-11-04 (crm_activities, refinements)
Lead Routing:       2025-07-24 (auto-assignment rules)
Basic CRM:          2025-07-10 (leads, contacts, opportunities legacy)
```

---

## Key Metrics You Can Calculate

- **Sales Metrics**: Win rate, average deal size, time-to-close, pipeline velocity
- **Lead Metrics**: Lead score distribution, source effectiveness, qualification rate
- **Email Metrics**: Open rate, click rate, unsubscribe rate, bounce rate
- **Rep Metrics**: Quota vs actual, activity count, deal count

---

**Last Updated**: 2025-11-06
**Database Version**: PostgreSQL 12.3+
**Supabase Version**: Latest
**File Location**: `/home/user/project-profit-radar/CRM_TABLES_QUICK_REFERENCE.md`

