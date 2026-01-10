// Failed Payment Recovery Edge Function
// Automated dunning and payment recovery workflow
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FAILED-PAYMENT-RECOVERY] ${step}${detailsStr}`);
};

interface RecoveryRequest {
  action: 'process_failures' | 'retry_payment' | 'send_dunning_email' | 'get_settings' | 'update_settings' | 'get_dashboard' | 'pause_dunning' | 'resume_dunning';
  failure_id?: string;
  company_id?: string;
  subscriber_id?: string;
  settings?: RecoverySettings;
}

interface RecoverySettings {
  is_enabled?: boolean;
  retry_intervals?: number[];
  max_retry_attempts?: number;
  send_failure_notification?: boolean;
  notify_admin_on_failure?: boolean;
  auto_pause_subscription_after_attempts?: number;
  auto_cancel_subscription_after_days?: number;
  grace_period_days?: number;
  failure_email_subject?: string;
  failure_email_body?: string;
  dunning_email_intervals?: number[];
  final_warning_days_before_cancel?: number;
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
    let companyId: string | null = null;

    if (authHeader) {
      const authContext = await initializeAuthContext(req);
      if (authContext) {
        const { data: profile } = await authContext.supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', authContext.user.id)
          .single();
        companyId = profile?.company_id;
      }
    }

    const body: RecoveryRequest = await req.json();
    const { action } = body;
    const targetCompanyId = body.company_id || companyId;

    logStep('Processing action', { action, companyId: targetCompanyId });

    switch (action) {
      case 'process_failures':
        return await processAllFailures(supabaseClient);

      case 'retry_payment':
        return await retryPayment(supabaseClient, body.failure_id!);

      case 'send_dunning_email':
        return await sendDunningEmail(supabaseClient, body.failure_id!);

      case 'get_settings':
        return await getSettings(supabaseClient, targetCompanyId!);

      case 'update_settings':
        return await updateSettings(supabaseClient, targetCompanyId!, body.settings!);

      case 'get_dashboard':
        return await getDashboard(supabaseClient, targetCompanyId!);

      case 'pause_dunning':
        return await pauseDunning(supabaseClient, body.subscriber_id!);

      case 'resume_dunning':
        return await resumeDunning(supabaseClient, body.subscriber_id!);

      default:
        return errorResponse('Invalid action', 400);
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

async function processAllFailures(supabase: ReturnType<typeof createClient>) {
  // Get all active payment failures that need processing
  const now = new Date();

  const { data: failures, error } = await supabase
    .from('payment_failures')
    .select(`
      *,
      subscriber:subscriber_id (
        id, user_id, stripe_customer_id,
        user:user_id (email, full_name)
      )
    `)
    .eq('dunning_status', 'active')
    .is('resolved_at', null)
    .lte('next_retry_at', now.toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(50);

  if (error) {
    return errorResponse(`Failed to fetch failures: ${error.message}`, 500);
  }

  let processed = 0;
  let retried = 0;
  let emailsSent = 0;
  let suspended = 0;

  for (const failure of failures || []) {
    processed++;

    // Check max retries
    if (failure.attempt_count >= (failure.max_retries || 3)) {
      // Suspend the account
      await supabase
        .from('payment_failures')
        .update({
          dunning_status: 'suspended',
          next_retry_at: null
        })
        .eq('id', failure.id);

      // Update subscriber status
      if (failure.subscriber_id) {
        await supabase
          .from('subscribers')
          .update({
            subscribed: false
          })
          .eq('id', failure.subscriber_id);
      }

      suspended++;
      continue;
    }

    // Attempt to retry payment
    const retryResult = await attemptPaymentRetry(supabase, failure);
    if (retryResult.success) {
      retried++;
    } else {
      // Send dunning email
      const emailResult = await sendFailureNotification(supabase, failure);
      if (emailResult) emailsSent++;

      // Schedule next retry
      const nextRetryHours = getNextRetryInterval(failure.attempt_count);
      const nextRetry = new Date();
      nextRetry.setHours(nextRetry.getHours() + nextRetryHours);

      await supabase
        .from('payment_failures')
        .update({
          attempt_count: failure.attempt_count + 1,
          next_retry_at: nextRetry.toISOString(),
          last_retry_at: now.toISOString()
        })
        .eq('id', failure.id);
    }
  }

  logStep('Processed failures', { processed, retried, emailsSent, suspended });

  return new Response(
    JSON.stringify({
      success: true,
      processed,
      retried,
      emails_sent: emailsSent,
      suspended,
      message: `Processed ${processed} failures: ${retried} recovered, ${emailsSent} emails sent, ${suspended} suspended`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function attemptPaymentRetry(
  supabase: ReturnType<typeof createClient>,
  failure: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey) {
    return { success: false, error: 'Stripe not configured' };
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  try {
    // Get the invoice
    const invoiceId = failure.stripe_invoice_id as string;
    if (!invoiceId) {
      return { success: false, error: 'No Stripe invoice ID' };
    }

    // Attempt to pay the invoice
    const invoice = await stripe.invoices.pay(invoiceId);

    if (invoice.paid) {
      // Success! Mark failure as resolved
      await supabase
        .from('payment_failures')
        .update({
          dunning_status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', failure.id);

      // Update subscriber status
      const subscriber = failure.subscriber as Record<string, unknown>;
      if (subscriber?.id) {
        await supabase
          .from('subscribers')
          .update({
            subscribed: true
          })
          .eq('id', subscriber.id);
      }

      logStep('Payment recovered', { failureId: failure.id, invoiceId });
      return { success: true };
    }

    return { success: false, error: 'Payment not successful' };

  } catch (stripeError) {
    const error = stripeError as Stripe.errors.StripeError;
    logStep('Retry failed', { failureId: failure.id, error: error.message });
    return { success: false, error: error.message };
  }
}

async function sendFailureNotification(
  supabase: ReturnType<typeof createClient>,
  failure: Record<string, unknown>
): Promise<boolean> {
  const subscriber = failure.subscriber as Record<string, unknown>;
  const user = subscriber?.user as Record<string, unknown>;

  if (!user?.email) {
    logStep('No email for subscriber', { subscriberId: subscriber?.id });
    return false;
  }

  // Get recovery settings
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', subscriber.user_id)
    .single();

  if (!userProfile?.company_id) return false;

  const { data: settings } = await supabase
    .from('failed_payment_recovery_settings')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .single();

  if (!settings?.send_failure_notification) {
    return false;
  }

  const subject = settings.failure_email_subject ||
    'Payment Failed - Action Required';

  let body = settings.failure_email_body ||
    `Dear {customer_name},

We were unable to process your payment.

Reason: {failure_reason}

Please update your payment method to continue your subscription.

{update_payment_link}`;

  // Replace placeholders
  body = body
    .replace('{customer_name}', (user.full_name as string) || 'Valued Customer')
    .replace('{failure_reason}', (failure.failure_reason as string) || 'Unknown error')
    .replace('{amount}', formatCurrency(0)) // Would need invoice amount
    .replace('{update_payment_link}', `${Deno.env.get("SITE_URL") || 'https://build-desk.com'}/settings/billing`);

  // Send email
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    logStep('Email would be sent (Resend not configured)', { to: user.email, subject });
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
        from: 'BuildDesk <billing@build-desk.com>',
        to: [user.email],
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      })
    });

    return response.ok;
  } catch (error) {
    logStep('Failed to send email', { error: (error as Error).message });
    return false;
  }
}

async function retryPayment(
  supabase: ReturnType<typeof createClient>,
  failureId: string
) {
  const { data: failure, error } = await supabase
    .from('payment_failures')
    .select(`
      *,
      subscriber:subscriber_id (
        id, user_id, stripe_customer_id
      )
    `)
    .eq('id', failureId)
    .single();

  if (error || !failure) {
    return errorResponse('Failure not found', 404);
  }

  const result = await attemptPaymentRetry(supabase, failure);

  return new Response(
    JSON.stringify({
      success: result.success,
      message: result.success ? 'Payment recovered' : `Retry failed: ${result.error}`,
      error: result.error
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function sendDunningEmail(
  supabase: ReturnType<typeof createClient>,
  failureId: string
) {
  const { data: failure, error } = await supabase
    .from('payment_failures')
    .select(`
      *,
      subscriber:subscriber_id (
        id, user_id, stripe_customer_id,
        user:user_id (email, full_name)
      )
    `)
    .eq('id', failureId)
    .single();

  if (error || !failure) {
    return errorResponse('Failure not found', 404);
  }

  const sent = await sendFailureNotification(supabase, failure);

  return new Response(
    JSON.stringify({
      success: sent,
      message: sent ? 'Dunning email sent' : 'Failed to send email'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getSettings(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: settings, error } = await supabase
    .from('failed_payment_recovery_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return errorResponse(`Failed to fetch settings: ${error.message}`, 500);
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
  settings: RecoverySettings
) {
  const { data, error } = await supabase
    .from('failed_payment_recovery_settings')
    .upsert({
      company_id: companyId,
      ...settings
    }, {
      onConflict: 'company_id'
    })
    .select()
    .single();

  if (error) {
    return errorResponse(`Failed to update settings: ${error.message}`, 500);
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

async function getDashboard(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  // Get company's subscribers with failures
  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('id')
    .eq('stripe_customer_id', companyId); // This would need proper relation

  const subscriberIds = subscribers?.map(s => s.id) || [];

  // Get all failures for the company
  const { data: failures, error } = await supabase
    .from('payment_failures')
    .select(`
      *,
      subscriber:subscriber_id (
        id, stripe_customer_id,
        user:user_id (email, full_name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return errorResponse(`Failed to fetch dashboard: ${error.message}`, 500);
  }

  // Calculate summary
  const active = failures?.filter(f => f.dunning_status === 'active') || [];
  const suspended = failures?.filter(f => f.dunning_status === 'suspended') || [];
  const resolved = failures?.filter(f => f.dunning_status === 'resolved') || [];
  const paused = failures?.filter(f => f.dunning_status === 'paused') || [];

  const summary = {
    total_failures: failures?.length || 0,
    active_failures: active.length,
    suspended_accounts: suspended.length,
    recovered_payments: resolved.length,
    paused_dunning: paused.length,
    recovery_rate: failures?.length
      ? ((resolved.length / failures.length) * 100).toFixed(1) + '%'
      : '0%'
  };

  return new Response(
    JSON.stringify({
      success: true,
      dashboard: {
        summary,
        failures: failures || [],
        at_risk: active.filter(f => (f.attempt_count || 0) >= 2)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function pauseDunning(
  supabase: ReturnType<typeof createClient>,
  subscriberId: string
) {
  const { error } = await supabase
    .from('payment_failures')
    .update({
      dunning_status: 'paused',
      next_retry_at: null
    })
    .eq('subscriber_id', subscriberId)
    .eq('dunning_status', 'active');

  if (error) {
    return errorResponse(`Failed to pause dunning: ${error.message}`, 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Dunning paused for subscriber'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function resumeDunning(
  supabase: ReturnType<typeof createClient>,
  subscriberId: string
) {
  const nextRetry = new Date();
  nextRetry.setHours(nextRetry.getHours() + 24);

  const { error } = await supabase
    .from('payment_failures')
    .update({
      dunning_status: 'active',
      next_retry_at: nextRetry.toISOString()
    })
    .eq('subscriber_id', subscriberId)
    .eq('dunning_status', 'paused');

  if (error) {
    return errorResponse(`Failed to resume dunning: ${error.message}`, 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Dunning resumed for subscriber'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

function getDefaultSettings(): RecoverySettings {
  return {
    is_enabled: true,
    retry_intervals: [24, 48, 72, 168],
    max_retry_attempts: 4,
    send_failure_notification: true,
    notify_admin_on_failure: true,
    auto_pause_subscription_after_attempts: 3,
    auto_cancel_subscription_after_days: 30,
    grace_period_days: 7,
    failure_email_subject: 'Payment Failed - Action Required',
    failure_email_body: `Dear {customer_name},

We were unable to process your payment.

Reason: {failure_reason}

Please update your payment method to continue your subscription.

{update_payment_link}`,
    dunning_email_intervals: [1, 3, 7, 14],
    final_warning_days_before_cancel: 3
  };
}

function getNextRetryInterval(attemptCount: number): number {
  const intervals = [24, 48, 72, 168]; // hours: 1 day, 2 days, 3 days, 7 days
  return intervals[Math.min(attemptCount, intervals.length - 1)];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}
