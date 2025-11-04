# Phase 5: Email Service Integration for Payment Reminders

This document explains how to integrate email services for automated payment reminders and report delivery.

## Email Service Options

### Option 1: Resend (Recommended)

**Pros:**
- Modern API, excellent developer experience
- Free tier: 100 emails/day, 3,000 emails/month
- Built-in email templates
- Good deliverability

**Setup:**

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Get API key
4. Add to Supabase secrets:

```bash
npx supabase secrets set RESEND_API_KEY=re_...
```

### Option 2: SendGrid

**Pros:**
- Established service with great deliverability
- Free tier: 100 emails/day
- Advanced analytics

**Setup:**

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. Add to Supabase secrets:

```bash
npx supabase secrets set SENDGRID_API_KEY=SG...
```

### Option 3: AWS SES

**Pros:**
- Very cheap ($0.10 per 1,000 emails)
- Scalable
- Part of AWS ecosystem

**Setup:**

1. Set up AWS SES
2. Verify email/domain
3. Add credentials to Supabase secrets:

```bash
npx supabase secrets set AWS_SES_ACCESS_KEY_ID=...
npx supabase secrets set AWS_SES_SECRET_ACCESS_KEY=...
npx supabase secrets set AWS_SES_REGION=us-east-1
```

## Implementation

### Update Payment Reminders Edge Function

Edit `supabase/functions/payment-reminders/index.ts`:

```typescript
// Add at the top
import { Resend } from 'https://esm.sh/resend@3.2.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// Replace the sendReminder function's email sending section
async function sendReminder(supabase: any, tenant_id: string, invoice_id: string) {
  // ... existing code ...

  // Send email using Resend
  try {
    const { data, error } = await resend.emails.send({
      from: 'BuildDesk <noreply@builddesk.com>',
      to: [reminder.projects?.client_email],
      subject: emailSubject,
      html: `
        <h2>${emailSubject}</h2>
        <p>${emailBody.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>This is an automated message from BuildDesk</small></p>
      `
    })

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('Email sent successfully:', data.id)

    // Update reminder status
    await supabase
      .from('payment_reminders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', reminder.id)

    return new Response(
      JSON.stringify({
        success: true,
        reminder_sent: true,
        email_id: data.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error sending email:', error)

    // Mark as failed
    await supabase
      .from('payment_reminders')
      .update({
        status: 'failed'
      })
      .eq('id', reminder.id)

    throw error
  }
}
```

### Update Scheduled Reports Function

Edit `supabase/functions/schedule-custom-reports/index.ts`:

```typescript
// Add at the top
import { Resend } from 'https://esm.sh/resend@3.2.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// Add email sending after report generation
async function sendReportEmail(report: any, csvContent: string, recipients: string[]) {
  try {
    // Convert CSV to base64 for attachment
    const base64Content = btoa(csvContent)

    const { data, error } = await resend.emails.send({
      from: 'BuildDesk Reports <reports@builddesk.com>',
      to: recipients,
      subject: `Scheduled Report: ${report.report_name}`,
      html: `
        <h2>Your scheduled report is ready</h2>
        <p>Report: <strong>${report.report_name}</strong></p>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>The report is attached as a CSV file.</p>
        <hr>
        <p><small>This is an automated report from BuildDesk</small></p>
      `,
      attachments: [
        {
          filename: `${report.report_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
          content: base64Content
        }
      ]
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    console.log('Report email sent:', data.id)
    return { success: true, email_id: data.id }

  } catch (error) {
    console.error('Error in sendReportEmail:', error)
    return { success: false, error: error.message }
  }
}
```

## Email Templates

### Payment Reminder Templates

Create in `supabase/functions/_shared/email-templates.ts`:

```typescript
export interface ReminderEmailData {
  clientName: string
  projectName: string
  invoiceNumber: string
  amountDue: string
  dueDate: string
  daysOverdue?: number
}

export function getPaymentReminderHTML(type: string, data: ReminderEmailData): string {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
      .content { background: #f9fafb; padding: 30px; }
      .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }
      .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
  `

  switch (type) {
    case 'upcoming':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>Payment Due Soon</h1>
          </div>
          <div class="content">
            <p>Dear ${data.clientName},</p>
            <p>This is a friendly reminder that your payment for <strong>${data.projectName}</strong> will be due on <strong>${data.dueDate}</strong>.</p>
            <p><strong>Invoice:</strong> ${data.invoiceNumber}<br>
            <strong>Amount Due:</strong> ${data.amountDue}</p>
            <p style="text-align: center; margin-top: 30px;">
              <a href="https://build-desk.com/portal/invoice/${data.invoiceNumber}" class="button">View Invoice</a>
            </p>
            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>BuildDesk Construction Management<br>
            <a href="https://build-desk.com">build-desk.com</a></p>
          </div>
        </div>
      `

    case 'overdue':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header" style="background: #dc2626;">
            <h1>Overdue Payment Notice</h1>
          </div>
          <div class="content">
            <p>Dear ${data.clientName},</p>
            <p>Our records indicate that payment for <strong>${data.projectName}</strong> is now <strong>${data.daysOverdue} days overdue</strong>.</p>
            <p><strong>Invoice:</strong> ${data.invoiceNumber}<br>
            <strong>Amount Due:</strong> ${data.amountDue}<br>
            <strong>Original Due Date:</strong> ${data.dueDate}</p>
            <p style="color: #dc2626;"><strong>Please submit payment as soon as possible to avoid late fees.</strong></p>
            <p style="text-align: center; margin-top: 30px;">
              <a href="https://build-desk.com/portal/invoice/${data.invoiceNumber}" class="button">Pay Now</a>
            </p>
            <p>If you have any questions, please contact us immediately.</p>
          </div>
          <div class="footer">
            <p>BuildDesk Construction Management<br>
            <a href="https://build-desk.com">build-desk.com</a></p>
          </div>
        </div>
      `

    default:
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>Payment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${data.clientName},</p>
            <p>This is a reminder about your payment for <strong>${data.projectName}</strong>.</p>
            <p><strong>Invoice:</strong> ${data.invoiceNumber}<br>
            <strong>Amount Due:</strong> ${data.amountDue}</p>
            <p style="text-align: center; margin-top: 30px;">
              <a href="https://build-desk.com/portal/invoice/${data.invoiceNumber}" class="button">View Invoice</a>
            </p>
          </div>
          <div class="footer">
            <p>BuildDesk Construction Management<br>
            <a href="https://build-desk.com">build-desk.com</a></p>
          </div>
        </div>
      `
  }
}
```

## Testing

### Test Payment Reminder Email

```bash
curl -X POST \
  'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/payment-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "tenant_id": "YOUR_TENANT_ID",
    "invoice_id": "INV-2025-001",
    "action": "send_reminder"
  }'
```

### Test Scheduled Report Email

```bash
curl -X POST \
  'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/schedule-custom-reports' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## SMS Integration (Optional)

For SMS reminders, integrate Twilio:

### Setup Twilio

1. Sign up at [twilio.com](https://twilio.com)
2. Get phone number
3. Add credentials:

```bash
npx supabase secrets set TWILIO_ACCOUNT_SID=AC...
npx supabase secrets set TWILIO_AUTH_TOKEN=...
npx supabase secrets set TWILIO_PHONE_NUMBER=+1...
```

### Implementation

```typescript
async function sendSMS(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  const auth = btoa(`${accountSid}:${authToken}`)

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: message
      })
    }
  )

  return await response.json()
}
```

## Monitoring & Analytics

### Track Email Delivery

```sql
-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  email_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
```

### Query Email Stats

```sql
-- Email delivery rate by type
SELECT
  email_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'delivered') / COUNT(*), 2) as delivery_rate
FROM email_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY email_type;
```

## Production Checklist

- [ ] Email service API keys configured in Supabase secrets
- [ ] Domain verified and SPF/DKIM records configured
- [ ] Email templates tested and reviewed
- [ ] Unsubscribe links added (if required by law)
- [ ] Rate limiting implemented
- [ ] Email logging and monitoring set up
- [ ] Bounce and complaint handling configured
- [ ] Test emails sent to team members
- [ ] Privacy policy updated to mention automated emails

## Related Files

- Payment Reminders: `supabase/functions/payment-reminders/index.ts`
- Report Scheduler: `supabase/functions/schedule-custom-reports/index.ts`
- Cron Setup: `docs/PHASE5_CRON_SETUP.md`
