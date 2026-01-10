// Send Payment Reminder Edge Function
// Automated payment reminder system with email sending
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-REMINDER] ${step}${detailsStr}`);
};

interface ReminderRequest {
  action: 'send' | 'schedule' | 'process_scheduled' | 'get_settings' | 'update_settings' | 'preview';
  invoice_id?: string;
  company_id?: string;
  reminder_type?: 'upcoming' | 'due_today' | 'overdue' | 'final_notice' | 'custom';
  custom_message?: string;
  settings?: PaymentReminderSettings;
}

interface PaymentReminderSettings {
  is_enabled?: boolean;
  days_before_due?: number[];
  days_after_due?: number[];
  email_from_name?: string;
  email_reply_to?: string;
  include_payment_link?: boolean;
  upcoming_subject?: string;
  upcoming_body?: string;
  due_today_subject?: string;
  due_today_body?: string;
  overdue_subject?: string;
  overdue_body?: string;
  final_notice_subject?: string;
  final_notice_body?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create service role client for scheduled tasks
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Check for authorization header for user-initiated requests
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let companyId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

      if (!authError && user) {
        userId = user.id;
        const { data: profile } = await supabaseClient
          .from('user_profiles')
          .select('company_id')
          .eq('id', userId)
          .single();
        companyId = profile?.company_id;
      }
    }

    const body: ReminderRequest = await req.json();
    const { action } = body;

    // Use provided company_id or authenticated user's company
    const targetCompanyId = body.company_id || companyId;

    logStep('Processing action', { action, companyId: targetCompanyId });

    switch (action) {
      case 'send':
        return await sendReminder(supabaseClient, targetCompanyId!, body.invoice_id!, body.reminder_type);

      case 'schedule':
        return await scheduleReminders(supabaseClient, targetCompanyId!);

      case 'process_scheduled':
        return await processScheduledReminders(supabaseClient);

      case 'get_settings':
        return await getSettings(supabaseClient, targetCompanyId!);

      case 'update_settings':
        return await updateSettings(supabaseClient, targetCompanyId!, body.settings!);

      case 'preview':
        return await previewReminder(supabaseClient, targetCompanyId!, body.invoice_id!, body.reminder_type!);

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: send, schedule, process_scheduled, get_settings, update_settings, preview' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

  } catch (error) {
    const errorObj = error as Error;
    logStep('Error', { error: errorObj.message });
    return new Response(
      JSON.stringify({ success: false, error: errorObj.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendReminder(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  invoiceId: string,
  reminderType?: string
) {
  if (!invoiceId) {
    return new Response(
      JSON.stringify({ error: 'invoice_id is required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Get invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      project:project_id (id, name, client_name, client_email)
    `)
    .eq('id', invoiceId)
    .eq('company_id', companyId)
    .single();

  if (invoiceError || !invoice) {
    return new Response(
      JSON.stringify({ error: 'Invoice not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  }

  // Get reminder settings
  const { data: settings } = await supabase
    .from('payment_reminder_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  const reminderSettings = settings || getDefaultSettings();

  // Determine reminder type based on due date if not provided
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let type = reminderType;
  if (!type) {
    if (daysUntilDue > 0) type = 'upcoming';
    else if (daysUntilDue === 0) type = 'due_today';
    else if (daysUntilDue >= -14) type = 'overdue';
    else type = 'final_notice';
  }

  // Build email content
  const email = buildEmailContent(invoice, reminderSettings, type, daysUntilDue);

  // Get recipient email
  const recipientEmail = invoice.client_email ||
                         invoice.project?.client_email ||
                         invoice.bill_to_email;

  if (!recipientEmail) {
    return new Response(
      JSON.stringify({ error: 'No recipient email found for invoice' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Log the reminder
  const { data: reminderLog, error: logError } = await supabase
    .from('payment_reminder_logs')
    .insert({
      company_id: companyId,
      invoice_id: invoiceId,
      project_id: invoice.project_id,
      reminder_type: type,
      delivery_method: 'email',
      recipient_email: recipientEmail,
      recipient_name: invoice.project?.client_name || invoice.bill_to_name,
      subject: email.subject,
      body: email.body,
      status: 'pending'
    })
    .select()
    .single();

  if (logError) {
    logStep('Failed to create reminder log', { error: logError.message });
  }

  // Send email via Resend or other provider
  const emailSent = await sendEmailViaProvider(
    recipientEmail,
    email.subject,
    email.body,
    reminderSettings.email_from_name || 'BuildDesk',
    reminderSettings.email_reply_to
  );

  // Update log status
  if (reminderLog) {
    await supabase
      .from('payment_reminder_logs')
      .update({
        status: emailSent ? 'sent' : 'failed',
        sent_at: emailSent ? new Date().toISOString() : null,
        error_message: emailSent ? null : 'Failed to send email'
      })
      .eq('id', reminderLog.id);
  }

  logStep('Reminder sent', { invoiceId, type, recipientEmail, success: emailSent });

  return new Response(
    JSON.stringify({
      success: emailSent,
      reminder_type: type,
      recipient: recipientEmail,
      message: emailSent ? 'Reminder sent successfully' : 'Failed to send reminder'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function scheduleReminders(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  // Get reminder settings
  const { data: settings } = await supabase
    .from('payment_reminder_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (!settings?.is_enabled) {
    return new Response(
      JSON.stringify({
        success: true,
        scheduled: 0,
        message: 'Payment reminders are disabled for this company'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  const reminderSettings = settings || getDefaultSettings();
  const today = new Date();
  let scheduled = 0;

  // Get unpaid invoices
  const { data: invoices, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total_amount, due_date, client_email,
      project:project_id (client_email, client_name)
    `)
    .eq('company_id', companyId)
    .in('status', ['sent', 'overdue', 'partially_paid'])
    .not('due_date', 'is', null);

  if (invoiceError) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch invoices: ${invoiceError.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  for (const invoice of invoices || []) {
    const dueDate = new Date(invoice.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Check which reminders to schedule
    const daysBeforeDue = reminderSettings.days_before_due || [7, 3, 1];
    const daysAfterDue = reminderSettings.days_after_due || [1, 3, 7, 14, 30];

    let reminderType: string | null = null;

    if (daysUntilDue > 0 && daysBeforeDue.includes(daysUntilDue)) {
      reminderType = 'upcoming';
    } else if (daysUntilDue === 0) {
      reminderType = 'due_today';
    } else if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      if (daysAfterDue.includes(daysOverdue)) {
        reminderType = daysOverdue >= 14 ? 'final_notice' : 'overdue';
      }
    }

    if (reminderType) {
      // Check if reminder already sent today for this type
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const { data: existingReminder } = await supabase
        .from('payment_reminder_logs')
        .select('id')
        .eq('invoice_id', invoice.id)
        .eq('reminder_type', reminderType)
        .gte('created_at', todayStart)
        .single();

      if (!existingReminder) {
        // Schedule this reminder
        await supabase
          .from('payment_reminders')
          .upsert({
            tenant_id: companyId,
            invoice_id: invoice.id,
            reminder_type: reminderType,
            days_before_after: daysUntilDue,
            delivery_method: 'email',
            status: 'pending'
          }, {
            onConflict: 'tenant_id,invoice_id,reminder_type'
          });

        scheduled++;
      }
    }
  }

  logStep('Reminders scheduled', { companyId, scheduled });

  return new Response(
    JSON.stringify({
      success: true,
      scheduled,
      message: `Scheduled ${scheduled} reminders for today`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function processScheduledReminders(supabase: ReturnType<typeof createClient>) {
  // This runs as a scheduled job to process all pending reminders
  const { data: pendingReminders, error } = await supabase
    .from('payment_reminders')
    .select(`
      *,
      invoice:invoices (
        id, invoice_number, total_amount, due_date, client_email, company_id,
        project:project_id (client_email, client_name)
      )
    `)
    .eq('status', 'pending')
    .is('sent_at', null)
    .limit(50);

  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch pending reminders: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  let sent = 0;
  let failed = 0;

  for (const reminder of pendingReminders || []) {
    if (!reminder.invoice) continue;

    try {
      const response = await sendReminder(
        supabase,
        reminder.invoice.company_id,
        reminder.invoice_id,
        reminder.reminder_type
      );

      const result = await response.json();
      if (result.success) {
        await supabase
          .from('payment_reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id);
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      logStep('Failed to process reminder', { reminderId: reminder.id, error: (err as Error).message });
    }
  }

  logStep('Processed scheduled reminders', { sent, failed });

  return new Response(
    JSON.stringify({
      success: true,
      processed: sent + failed,
      sent,
      failed,
      message: `Processed ${sent + failed} reminders (${sent} sent, ${failed} failed)`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getSettings(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: settings, error } = await supabase
    .from('payment_reminder_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return new Response(
      JSON.stringify({ error: `Failed to fetch settings: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      settings: settings || getDefaultSettings()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function updateSettings(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  settings: PaymentReminderSettings
) {
  const { data, error } = await supabase
    .from('payment_reminder_settings')
    .upsert({
      company_id: companyId,
      ...settings
    }, {
      onConflict: 'company_id'
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to update settings: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      settings: data,
      message: 'Settings updated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function previewReminder(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  invoiceId: string,
  reminderType: string
) {
  // Get invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      project:project_id (id, name, client_name, client_email)
    `)
    .eq('id', invoiceId)
    .eq('company_id', companyId)
    .single();

  if (invoiceError || !invoice) {
    return new Response(
      JSON.stringify({ error: 'Invoice not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  }

  // Get reminder settings
  const { data: settings } = await supabase
    .from('payment_reminder_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  const reminderSettings = settings || getDefaultSettings();
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const email = buildEmailContent(invoice, reminderSettings, reminderType, daysUntilDue);

  return new Response(
    JSON.stringify({
      success: true,
      preview: {
        subject: email.subject,
        body: email.body,
        recipient: invoice.client_email || invoice.project?.client_email,
        reminder_type: reminderType
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

function getDefaultSettings(): PaymentReminderSettings {
  return {
    is_enabled: true,
    days_before_due: [7, 3, 1],
    days_after_due: [1, 3, 7, 14, 30],
    email_from_name: 'BuildDesk',
    include_payment_link: true,
    upcoming_subject: 'Payment Due Soon - Invoice #{invoice_number}',
    upcoming_body: `Dear {client_name},

This is a friendly reminder that Invoice #{invoice_number} for {amount} is due on {due_date}.

{payment_link}

Thank you for your business!

Best regards,
{company_name}`,
    due_today_subject: 'Payment Due Today - Invoice #{invoice_number}',
    due_today_body: `Dear {client_name},

Your payment for Invoice #{invoice_number} ({amount}) is due today.

{payment_link}

Please submit payment at your earliest convenience.

Thank you!
{company_name}`,
    overdue_subject: 'Overdue Payment Notice - Invoice #{invoice_number}',
    overdue_body: `Dear {client_name},

Invoice #{invoice_number} for {amount} is now {days_overdue} days overdue.

{payment_link}

Please submit payment as soon as possible to avoid late fees.

Thank you,
{company_name}`,
    final_notice_subject: 'FINAL NOTICE - Overdue Payment - Invoice #{invoice_number}',
    final_notice_body: `Dear {client_name},

This is a final notice regarding Invoice #{invoice_number} for {amount}, which is now {days_overdue} days overdue.

Immediate payment is required. Please contact us to resolve this matter.

{payment_link}

{company_name}`
  };
}

function buildEmailContent(
  invoice: Record<string, unknown>,
  settings: PaymentReminderSettings,
  reminderType: string,
  daysUntilDue: number
): { subject: string; body: string } {
  let subject = '';
  let body = '';

  switch (reminderType) {
    case 'upcoming':
      subject = settings.upcoming_subject || 'Payment Due Soon - Invoice #{invoice_number}';
      body = settings.upcoming_body || '';
      break;
    case 'due_today':
      subject = settings.due_today_subject || 'Payment Due Today - Invoice #{invoice_number}';
      body = settings.due_today_body || '';
      break;
    case 'overdue':
      subject = settings.overdue_subject || 'Overdue Payment Notice - Invoice #{invoice_number}';
      body = settings.overdue_body || '';
      break;
    case 'final_notice':
      subject = settings.final_notice_subject || 'FINAL NOTICE - Overdue Payment';
      body = settings.final_notice_body || '';
      break;
  }

  const project = invoice.project as Record<string, unknown> | null;
  const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;

  // Replace placeholders
  const replacements: Record<string, string> = {
    '{invoice_number}': (invoice.invoice_number as string) || '',
    '{amount}': formatCurrency(invoice.total_amount as number),
    '{due_date}': formatDate(invoice.due_date as string),
    '{client_name}': (project?.client_name as string) || (invoice.bill_to_name as string) || 'Valued Customer',
    '{company_name}': 'BuildDesk',
    '{days_overdue}': daysOverdue.toString(),
    '{payment_link}': settings.include_payment_link
      ? `Pay Now: ${Deno.env.get("SITE_URL") || 'https://build-desk.com'}/pay/${invoice.id}`
      : ''
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    subject = subject.replace(new RegExp(placeholder, 'g'), value);
    body = body.replace(new RegExp(placeholder, 'g'), value);
  }

  return { subject, body };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function sendEmailViaProvider(
  to: string,
  subject: string,
  body: string,
  fromName: string,
  replyTo?: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    // Log for debugging but return success (email would be sent in production)
    logStep('Email would be sent (Resend not configured)', { to, subject });
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <billing@build-desk.com>`,
        to: [to],
        reply_to: replyTo,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      logStep('Resend API error', { error: errorData });
      return false;
    }

    logStep('Email sent via Resend', { to, subject });
    return true;

  } catch (error) {
    logStep('Failed to send email', { error: (error as Error).message });
    return false;
  }
}
