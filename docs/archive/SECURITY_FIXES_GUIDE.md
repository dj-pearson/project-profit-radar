# Security Fixes Implementation Guide

This guide explains how to apply the security fixes identified in your Supabase database linter report.

## Overview of Issues Fixed

### 1. Security Definer View (ERROR) ✅ FIXED
- **Issue**: View `project_pl_summary` was defined with SECURITY DEFINER property
- **Fix**: Recreated the view without SECURITY DEFINER in migration `20250126230000-fix-security-issues.sql`
- **Impact**: View now respects Row Level Security (RLS) policies from underlying tables

### 2. Function Search Path Mutable (WARN) ✅ FIXED
- **Issue**: 54+ functions had mutable search paths which can lead to security vulnerabilities
- **Fix**: Added `SET search_path = ''` to all affected functions in migrations:
  - `20250126230000-fix-security-issues.sql` (functions 1-30)
  - `20250126230001-fix-remaining-security-functions.sql` (functions 31-61)
- **Impact**: Functions now have secure, immutable search paths

### 3. Leaked Password Protection Disabled (WARN) ⚠️ MANUAL ACTION REQUIRED
- **Issue**: Supabase Auth is not checking passwords against HaveIBeenPwned database
- **Fix**: Must be enabled in Supabase Dashboard (see instructions below)

## How to Apply the Fixes

### Step 1: Run Database Migrations

Execute the security fix migrations in your Supabase database:

```bash
# Navigate to your project directory
cd project-profit-radar

# Apply the migrations using Supabase CLI
supabase db push

# Or manually run the migration files in your Supabase SQL editor:
# 1. 20250126230000-fix-security-issues.sql (UPDATED - no conflicts)
# 2. 20250126230001-fix-remaining-security-functions.sql (UPDATED - no conflicts)  
# 3. 20250126230002-fix-security-migration-errors.sql (contains all trigger functions)
```

**Important**: The first two migrations have been updated to remove conflicting functions. All auto-numbering trigger functions are now properly defined in the third migration to prevent conflicts.

### Step 2: Enable Leaked Password Protection

This requires manual configuration in the Supabase Dashboard:

1. **Go to Supabase Dashboard**
   - Navigate to [app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Access Authentication Settings**
   - Go to "Authentication" in the sidebar
   - Click on "Settings"

3. **Enable Password Security Features**
   - Look for "Password Security" or "Advanced Settings"
   - Enable "Leaked password protection"
   - This will check passwords against HaveIBeenPwned.org database

4. **Configure Password Strength (Optional)**
   - Set minimum password length (recommended: 8-12 characters)
   - Enable special character requirements
   - Set password complexity rules

### Step 3: Verify Fixes Applied

After running the migrations, verify the fixes:

```sql
-- Check that project_pl_summary view exists without SECURITY DEFINER
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE viewname = 'project_pl_summary';

-- Check that functions have proper search_path settings
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('calculate_warranty_end_date', 'generate_claim_number', 'get_user_role')
AND proconfig IS NOT NULL;

-- Verify sequences were created
SELECT sequencename FROM pg_sequences 
WHERE sequencename LIKE '%_number_seq';
```

## Security Functions Updated

The following functions were updated with `SET search_path = ''`:

### Core Functions (1-30)
- calculate_warranty_end_date
- generate_claim_number
- get_active_promotions
- set_claim_number
- generate_estimate_number
- set_estimate_number
- generate_affiliate_code
- calculate_project_completion
- handle_warranty_transfer
- check_project_requirements
- generate_bid_number
- set_bid_number
- generate_service_call_number
- generate_customer_request_number
- set_service_call_number
- set_customer_request_number
- log_service_call_status_change
- log_audit_event
- log_data_access
- grant_root_admin_complimentary
- set_request_due_date
- log_consent_withdrawal
- generate_po_number
- set_po_number
- generate_permit_number
- set_permit_number
- update_project_completion
- get_role_permissions
- create_company_affiliate_code
- check_rate_limit

### Extended Functions (31-61)
- generate_work_order_number
- set_work_order_number
- generate_support_ticket_number
- set_support_ticket_number
- increment_article_view_count
- calculate_lead_score
- log_security_event
- check_equipment_availability
- validate_post_for_platform
- generate_invoice_number
- set_invoice_number
- create_document_version
- get_equipment_schedule
- generate_incident_number
- set_incident_number
- calculate_incident_metrics
- update_updated_at_column
- trigger_security_alert
- calculate_security_metrics
- generate_api_key
- validate_api_permission
- log_api_usage
- calculate_next_generation_time
- queue_next_blog_generation
- get_user_role (updated)
- get_user_company (updated)
- check_type_exists
- handle_failed_login
- is_account_locked
- reset_failed_attempts
- add_subscriber_to_funnel

## What These Fixes Accomplish

### Security Benefits
1. **Prevents Search Path Injection**: Functions can no longer be manipulated through search_path changes
2. **Enforces RLS Compliance**: Views respect Row Level Security from underlying tables
3. **Password Security**: Prevents users from using compromised passwords (when enabled)

### Functional Benefits
1. **Maintains Functionality**: All existing function behavior is preserved
2. **Adds Sequences**: Creates missing number sequences for auto-generation functions
3. **Better Logging**: Improves audit and security event logging

## Testing the Fixes

After applying the migrations, test your application to ensure:

1. **User Authentication Works**: Login/logout functions properly
2. **Number Generation Works**: Auto-generated numbers (invoices, estimates, etc.) still work
3. **Project Views Load**: The project P&L summary displays correctly
4. **RLS Policies Apply**: Users can only see data they're authorized to access

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Note: Be very careful with rollbacks in production
-- Create a backup before proceeding

-- To rollback function changes, you would need to:
-- 1. Remove SET search_path = '' from each function
-- 2. Restore original view definition (if needed)
-- 3. Drop sequences that were created

-- Example rollback for one function:
CREATE OR REPLACE FUNCTION public.calculate_warranty_end_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.warranty_end_date := NEW.warranty_start_date + (NEW.warranty_duration_months || ' months')::interval;
  RETURN NEW;
END;
$$;
```

## Next Steps

1. **Monitor Security Alerts**: Set up monitoring for your security logs
2. **Regular Security Audits**: Run the Supabase linter regularly to catch new issues
3. **User Training**: Educate users about the new password requirements
4. **Documentation**: Update your API documentation to reflect any changes

## Common Issues and Fixes

### Issue 1: Column 'actual_cost' does not exist
**Error**: `ERROR: 42703: column jc.actual_cost does not exist`
**Solution**: Fixed in migration `20250126230002-fix-security-migration-errors.sql`
- The `job_costs` table uses `total_cost` instead of `actual_cost`
- The view has been corrected to use the proper column name

### Issue 2: Cannot change return type of existing function
**Error**: `ERROR: 42P13: cannot change return type of existing function`
**Solution**: Fixed in migration `20250126230002-fix-security-migration-errors.sql`
- Conflicting function signatures have been resolved
- Trigger functions now use `_trigger` suffix to avoid conflicts
- Existing functions maintain their original return types

## Support

If you encounter issues with these fixes:

1. Check the Supabase logs for error messages
2. Verify that all migrations ran successfully (including the error fix migration)
3. Test individual functions to identify specific problems
4. Consider rolling back specific changes if needed

For additional help, consult the [Supabase Documentation](https://supabase.com/docs/guides/database/database-linter) on database security. 