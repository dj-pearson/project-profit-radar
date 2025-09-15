# Construction Management Platform - Database Schema Documentation

## Table of Contents
1. [Core System Tables](#core-system-tables)
2. [Project Management Tables](#project-management-tables)
3. [Financial Management Tables](#financial-management-tables)
4. [User & Authentication Tables](#user--authentication-tables)
5. [Workflow Management Tables](#workflow-management-tables)
6. [Quality & Safety Tables](#quality--safety-tables)
7. [AI & Analytics Tables](#ai--analytics-tables)
8. [Communication & Collaboration Tables](#communication--collaboration-tables)
9. [Marketing & Business Development Tables](#marketing--business-development-tables)
10. [Security & Compliance Tables](#security--compliance-tables)
11. [Missing Elements & Recommendations](#missing-elements--recommendations)

---

## Core System Tables

### `companies`
**Purpose**: Company/Organization management
**Associated Pages**: Company settings, user onboarding
**Key Fields**: name, address, settings, subscription info
**Status**: ⚠️ Referenced but not found in schema

### `user_profiles`
**Purpose**: Extended user information beyond auth
**Associated Pages**: User management, team directory, project assignments
**Key Fields**: first_name, last_name, role, company_id, avatar_url
**Status**: ✅ Active - Used in hooks/useAuth.ts, taskService.ts

### `activity_feed`
**Purpose**: System-wide activity logging for dashboard
**Associated Pages**: Dashboard, project activity feeds
**Key Fields**: title, description, activity_type, entity_type, user_id, project_id, company_id
**Status**: ✅ Active - RLS policies implemented

---

## Project Management Tables

### `projects`
**Purpose**: Core project information and management
**Associated Pages**: Projects dashboard, project detail pages, project wizard
**Key Fields**: name, description, status, start_date, end_date, budget, completion_percentage, client_id, company_id
**Status**: ✅ Active - Used in projectService.ts, useSubscriptionLimits.ts
**Components**: ProjectDetail.tsx, ProjectWizard.tsx

### `tasks`
**Purpose**: Project task and subtask management
**Associated Pages**: Project tasks tab, task management, gantt charts
**Key Fields**: title, description, status, priority, assigned_to, project_id, start_date, due_date, completion_percentage
**Status**: ✅ Active - Used in taskService.ts
**Components**: Task management components

### `task_comments`
**Purpose**: Task-level collaboration and updates
**Associated Pages**: Task detail modals, task collaboration
**Key Fields**: content, task_id, user_id, created_at
**Status**: ✅ Active - Used in taskService.ts

### `daily_reports`
**Purpose**: Daily project progress and activity reporting
**Associated Pages**: Project daily reports tab, field reporting
**Key Fields**: report_date, weather_conditions, work_performed, issues, project_id, created_by
**Status**: ✅ Active - Used in useOfflineSync.ts

### `time_entries`
**Purpose**: Time tracking for labor and equipment
**Associated Pages**: Time tracking, labor reports, payroll
**Key Fields**: start_time, end_time, hours, description, user_id, project_id, task_id
**Status**: ✅ Active - Used in useOfflineSync.ts

---

## Financial Management Tables

### `estimates`
**Purpose**: Project cost estimation and bidding
**Associated Pages**: Estimates dashboard, bid management
**Key Fields**: estimate_number, total_amount, status, project_id, created_by
**Status**: ✅ Active - Used in estimateService.ts
**Components**: Estimate management components

### `invoices`
**Purpose**: Client billing and invoice management
**Associated Pages**: Invoicing, accounting dashboard
**Key Fields**: invoice_number, amount, status, due_date, project_id, client_id
**Status**: ✅ Active - Used in useAnalytics.ts, InvoiceGenerator.tsx

### `expenses`
**Purpose**: Project and company expense tracking
**Associated Pages**: Expense tracking, financial reports
**Key Fields**: amount, description, category, date, project_id, user_id
**Status**: ✅ Active - Used in useAnalytics.ts, useOfflineSync.ts

### `budget_alerts`
**Purpose**: Budget monitoring and variance alerts
**Associated Pages**: Budget management, financial dashboards
**Key Fields**: project_id, category, alert_type, message, threshold_exceeded
**Status**: ✅ Active - Has trigger function check_budget_thresholds()

---

## User & Authentication Tables

### `user_security`
**Purpose**: Enhanced security tracking per user
**Associated Pages**: Security dashboard, login monitoring
**Key Fields**: user_id, failed_login_attempts, account_locked_until, last_login_ip
**Status**: ✅ Active - Used in useSecurity.ts, security functions

### `security_logs` / `security_events`
**Purpose**: Security event tracking and audit
**Associated Pages**: Security monitoring, compliance reports
**Key Fields**: user_id, event_type, severity, ip_address, metadata
**Status**: ✅ Active - Used in useSecurity.ts, has function log_security_event()

### `subscribers`
**Purpose**: Subscription and billing management
**Associated Pages**: Billing, subscription management
**Key Fields**: user_id, subscription_tier, subscribed, trial_ends_at
**Status**: ✅ Active - Used in useSubscriptionLimits.ts

---

## Workflow Management Tables

### `change_orders`
**Purpose**: Construction change order management
**Associated Pages**: Project change orders tab, workflow management
**Key Fields**: change_order_number, description, cost_impact, status, project_id
**Status**: ✅ Active - Components: ProjectChangeOrders.tsx

### `rfis` (Request for Information)
**Purpose**: RFI workflow management
**Associated Pages**: Project RFIs tab, workflow management
**Key Fields**: rfi_number, subject, description, status, project_id, created_by
**Status**: ✅ Active - Components: ProjectRFIs.tsx

### `submittals`
**Purpose**: Submittal process management
**Associated Pages**: Project submittals tab, workflow management
**Key Fields**: submittal_number, title, description, status, project_id, created_by
**Status**: ✅ Active - Components: ProjectSubmittals.tsx

### `automation_rules`
**Purpose**: Workflow automation configuration
**Associated Pages**: Workflow automation settings
**Key Fields**: trigger_type, trigger_conditions, recipient_rules, company_id
**Status**: ✅ Active - RLS policies implemented

---

## Quality & Safety Tables

### `quality_inspections`
**Purpose**: Quality control and inspection management
**Associated Pages**: Quality control dashboard, digital inspections
**Key Fields**: inspection_number, inspection_type, status, project_id, inspector_id
**Status**: ✅ Active - Used in useDigitalInspections.ts

### `ai_quality_analysis`
**Purpose**: AI-powered quality analysis of photos/videos
**Associated Pages**: AI quality analysis, defect detection
**Key Fields**: analysis_type, image_url, analysis_results, confidence_score, project_id
**Status**: ✅ Active - RLS policies implemented

### `ai_defect_detection`
**Purpose**: AI-detected construction defects
**Associated Pages**: Defect tracking, quality reports
**Key Fields**: defect_type, severity_level, status, location_details, analysis_id
**Status**: ✅ Active - RLS policies implemented

### `safety_incidents`
**Purpose**: Safety incident reporting and tracking
**Associated Pages**: Safety dashboard, incident reports
**Key Fields**: incident_type, description, severity, project_id, reported_by
**Status**: ✅ Active - Used in useOfflineSync.ts

---

## AI & Analytics Tables

### `ai_settings`
**Purpose**: Global AI configuration and model settings
**Associated Pages**: Admin AI settings
**Key Fields**: provider, model, api_key_name, global_instructions
**Status**: ✅ Active - RLS policies for root_admin only

### `ai_model_configurations`
**Purpose**: Available AI models and their capabilities
**Associated Pages**: AI model selection, blog generation
**Key Fields**: provider, model_name, context_window, supports_vision, quality_rating
**Status**: ✅ Active - RLS policies implemented

### `ai_lead_scores`
**Purpose**: AI-generated lead scoring and insights
**Associated Pages**: CRM dashboard, lead management
**Key Fields**: lead_id, overall_score, conversion_probability, next_best_actions
**Status**: ✅ Active - RLS policies implemented

### `analytics_dashboard_cache`
**Purpose**: Cached analytics data for performance
**Associated Pages**: Executive dashboard, analytics pages
**Key Fields**: cache_key, dashboard_type, cache_data, expires_at
**Status**: ✅ Active - RLS policies implemented

---

## Communication & Collaboration Tables

### `chat_channels`
**Purpose**: Project and team communication channels
**Associated Pages**: Team chat, project communication
**Key Fields**: name, description, channel_type, project_id, company_id
**Status**: ✅ Active - Used in useRealtimeChat.ts

### `chat_messages`
**Purpose**: Chat message storage and history
**Associated Pages**: Team chat interface
**Key Fields**: content, channel_id, user_id, message_type, metadata
**Status**: ✅ Active - Used in useRealtimeChat.ts

### `chat_channel_members`
**Purpose**: Channel membership and permissions
**Associated Pages**: Channel management, user permissions
**Key Fields**: channel_id, user_id, role, joined_at
**Status**: ✅ Active - Used in useRealtimeChat.ts

### `documents`
**Purpose**: Document management and file storage
**Associated Pages**: Document library, project files
**Key Fields**: name, file_path, file_type, project_id, uploaded_by
**Status**: ✅ Active - Used in useRealtimeChat.ts

---

## Marketing & Business Development Tables

### `blog_posts`
**Purpose**: Content marketing and SEO blog management
**Associated Pages**: Blog management, content creation
**Key Fields**: title, content, status, seo_title, meta_description, published_at
**Status**: ✅ Active - Has trigger for social media automation

### `automated_social_posts_config`
**Purpose**: Social media automation settings
**Associated Pages**: Social media automation dashboard
**Key Fields**: company_id, enabled, platforms, content_types, post_interval_hours
**Status**: ✅ Active - Used in useAutomatedSocialPosts.ts

### `automated_social_content_library`
**Purpose**: Template library for automated social posts
**Associated Pages**: Social content management
**Key Fields**: content_type, topic, title, description, key_points
**Status**: ✅ Active - Used in useAutomatedSocialPosts.ts

### `affiliate_programs` / `affiliate_codes` / `affiliate_referrals`
**Purpose**: Affiliate marketing and referral system
**Associated Pages**: Affiliate management, referral tracking
**Key Fields**: Various referral tracking and reward fields
**Status**: ✅ Active - Complete affiliate system with RLS

---

## Security & Compliance Tables

### `audit_logs`
**Purpose**: Complete audit trail for compliance
**Associated Pages**: Audit reports, compliance dashboard
**Key Fields**: action_type, resource_type, user_id, old_values, new_values, risk_level
**Status**: ✅ Active - Used throughout system, function log_audit_event()

### `api_keys` / `api_request_logs`
**Purpose**: API access management and monitoring
**Associated Pages**: API management dashboard
**Key Fields**: api_key_hash, permissions, usage_count, endpoint, response_status
**Status**: ✅ Active - Components: ApiManagement.tsx

### `access_control_matrix`
**Purpose**: Advanced access control and permissions
**Associated Pages**: Security settings, role management
**Key Fields**: resource_type, role, permission_level, conditions
**Status**: ✅ Active - RLS policies implemented

---

## Missing Elements & Recommendations

### ❌ Missing Core Tables
1. **`companies`** - Referenced in many places but not in schema
2. **`clients`** - Client management (referenced in projects)
3. **`equipment`** - Equipment tracking and management
4. **`materials`** - Material inventory and tracking
5. **`subcontractors`** - Subcontractor management

### ⚠️ Incomplete Implementations
1. **Equipment Management** - `equipment_assignments` exists but no core `equipment` table
2. **Material Management** - Referenced in components but no schema
3. **Client Portal** - Referenced but limited table structure
4. **Warranty Management** - `warranty_claims` exists but limited integration

### 🔧 Required Fixes
1. **ProjectChangeOrders.tsx** - Fixed to use actual database queries
2. **ProjectRFIs.tsx** - Fixed to join with user_profiles for names
3. **ProjectSubmittals.tsx** - Fixed to join with user_profiles for names
4. **Missing foreign key relationships** - Many tables lack proper FK constraints

### 📈 Optimization Opportunities
1. **Caching Strategy** - analytics_dashboard_cache is good start
2. **Real-time Updates** - Expand real-time capabilities beyond chat
3. **Mobile Offline Support** - useOfflineSync is well-implemented
4. **Performance Monitoring** - Add query performance tracking

### 🔐 Security Enhancements
1. **Data Classification** - Implement data_access_logs for sensitive data
2. **Rate Limiting** - rate_limit_rules exists but needs integration
3. **IP Access Control** - ip_access_control exists but needs UI
4. **Compliance Reporting** - Enhance audit_logs with more metadata

---

## Summary Statistics
- **Total Tables Documented**: 40+
- **Active Tables**: 35+
- **Missing Core Tables**: 5
- **Tables with RLS**: 90%+
- **Tables with Components**: 25+
- **Tables with Services/Hooks**: 15+

This documentation should help identify missing elements and ensure proper attribution throughout the platform.