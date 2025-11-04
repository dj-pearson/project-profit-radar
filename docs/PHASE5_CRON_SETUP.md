# Phase 5: Scheduled Reports Cron Job Setup

This document explains how to set up automated report generation using Supabase Edge Functions and pg_cron.

## Prerequisites

- Supabase project with Phase 5 tables deployed
- `schedule-custom-reports` edge function deployed
- Database migrations applied (including sample data)

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Enable pg_cron Extension

1. Go to Supabase Dashboard > Database > Extensions
2. Search for `pg_cron`
3. Enable the extension

### Step 2: Create Cron Job

1. Go to SQL Editor
2. Run the following SQL:

```sql
-- Create cron job to run daily at 9 AM UTC
SELECT cron.schedule(
  'generate-scheduled-reports',  -- Job name
  '0 9 * * *',                    -- Cron expression (9 AM daily)
  $$
  SELECT net.http_post(
    url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/schedule-custom-reports',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### Step 3: Verify Cron Job

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details
WHERE jobname = 'generate-scheduled-reports'
ORDER BY start_time DESC
LIMIT 10;
```

### Step 4: Update Schedule (Optional)

Common cron expressions:
- `0 9 * * *` - Daily at 9 AM
- `0 9 * * 1` - Every Monday at 9 AM
- `0 9 1 * *` - First day of month at 9 AM
- `0 */6 * * *` - Every 6 hours
- `0 0,12 * * *` - Twice daily (midnight and noon)

```sql
-- Update existing job schedule
UPDATE cron.job
SET schedule = '0 9 * * 1'  -- Change to weekly on Monday
WHERE jobname = 'generate-scheduled-reports';
```

### Step 5: Disable/Enable Job

```sql
-- Disable job
UPDATE cron.job
SET active = false
WHERE jobname = 'generate-scheduled-reports';

-- Enable job
UPDATE cron.job
SET active = true
WHERE jobname = 'generate-scheduled-reports';
```

### Step 6: Delete Job

```sql
-- Remove cron job
SELECT cron.unschedule('generate-scheduled-reports');
```

## Option 2: Using Supabase CLI

### Deploy Edge Function

```bash
# Deploy the schedule-custom-reports function
cd project-profit-radar
npx supabase functions deploy schedule-custom-reports
```

### Create Cron Job via CLI

```bash
# Create a cron job using Supabase CLI
npx supabase db execute --file - <<SQL
SELECT cron.schedule(
  'generate-scheduled-reports',
  '0 9 * * *',
  \$\$
  SELECT net.http_post(
    url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/schedule-custom-reports',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  \$\$
);
SQL
```

## Option 3: Manual Testing

You can manually invoke the function to test before setting up cron:

```bash
# Using curl
curl -X POST \
  'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/schedule-custom-reports' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Or using the Supabase JavaScript client:

```typescript
import { supabase } from '@/integrations/supabase/client'

const { data, error } = await supabase.functions.invoke('schedule-custom-reports', {
  body: {}
})

console.log('Reports generated:', data)
```

## Monitoring

### Check Last Run Time

```sql
SELECT
  jobname,
  schedule,
  last_run_time,
  active
FROM cron.job
WHERE jobname = 'generate-scheduled-reports';
```

### View Run History

```sql
SELECT
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'generate-scheduled-reports'
ORDER BY start_time DESC
LIMIT 20;
```

### Check for Errors

```sql
SELECT
  start_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'generate-scheduled-reports'
  AND status = 'failed'
ORDER BY start_time DESC;
```

## Troubleshooting

### Issue: Cron job not running

1. **Check if pg_cron is enabled**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Verify job is active**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'generate-scheduled-reports';
   ```

3. **Check Edge Function is deployed**:
   - Go to Supabase Dashboard > Edge Functions
   - Verify `schedule-custom-reports` is listed and deployed

### Issue: Reports not being generated

1. **Check function logs**:
   - Go to Supabase Dashboard > Edge Functions > schedule-custom-reports > Logs

2. **Verify report schedules exist**:
   ```sql
   SELECT
     cr.report_name,
     rs.schedule_day_of_week,
     rs.schedule_day_of_month,
     rs.schedule_time,
     rs.is_active
   FROM report_schedules rs
   JOIN custom_reports cr ON cr.id = rs.custom_report_id
   WHERE rs.is_active = true;
   ```

3. **Test function manually** (see Option 3 above)

### Issue: Function times out

- Increase timeout in Edge Function settings (max 300 seconds)
- Reduce number of reports processed per run
- Optimize report queries

## Email Delivery Integration

To actually send reports via email, you'll need to integrate an email service. See `PHASE5_EMAIL_INTEGRATION.md` for details.

## Production Recommendations

1. **Use proper authentication**: Store service role key securely
2. **Monitor execution**: Set up alerts for failed runs
3. **Rate limiting**: Consider limiting number of reports per execution
4. **Error handling**: Implement retry logic for failed deliveries
5. **Logging**: Enable detailed logging for troubleshooting

## Related Files

- Edge Function: `supabase/functions/schedule-custom-reports/index.ts`
- Report Generation: `supabase/functions/generate-custom-report/index.ts`
- Database Schema: `supabase/migrations/20250202000027_phase5_tables_only.sql`
- Sample Data: `supabase/migrations/20250202000029_phase5_sample_data.sql`
