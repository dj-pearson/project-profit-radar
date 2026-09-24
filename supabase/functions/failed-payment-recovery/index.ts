// Failed Payment Recovery Edge Function
// Automated dunning and payment recovery workflow
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { requireInternalCaller } from '../_shared/internal-only.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { pickAllowed, WRITABLE_RECOVERY_SETTINGS_COLUMNS } from '../_shared/writable-columns.ts';
import { siteUrl } from '../_shared/app-urls.ts';
import { suspendCompanyOfSubscriber } from '../_shared/entitlements.ts';
import { captureException } from '../_shared/observability.ts';
import { sendEmail, emailIdempotencyKey } from '../_shared/ses-email-service.ts';
import { escapeHtml } from '../_shared/html-escape.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// Every settings field is nullable: the web client round-trips the row that
// get_settings returned, and a cleared number input posts parseInt('') = NaN,
// which JSON serialises as null.
const nonNegInt = (max: number) => z.number().int().min(0).max(max).nullable().optional();
const RecoverySettingsSchema = z.object({
  is_enabled: z.boolean().nullable().optional(),
  retry_intervals: z.array(z.number().int().min(0).max(8760)).max(50).nullable().optional(),
  max_retry_attempts: nonNegInt(100),
  send_failure_notification: z.boolean().nullable().optional(),
  notify_admin_on_failure: z.boolean().nullable().optional(),
  auto_pause_subscription_after_attempts: nonNegInt(100),
  auto_cancel_subscription_after_days: nonNegInt(3650),
  grace_period_days: nonNegInt(3650),
  failure_email_subject: z.string().max(500).nullable().optional(),
  failure_email_body: z.string().max(20_000).nullable().optional(),
  dunning_email_intervals: z.array(z.number().int().min(0).max(3650)).max(50).nullable().optional(),
  final_warning_days_before_cancel: nonNegInt(3650),
}).passthrough();

const RecoverySchema = z.object({
  action: z.enum([
    'process_failures', 'retry_payment', 'send_dunning_email', 'get_settings',
    'update_settings', 'get_dashboard', 'pause_dunning', 'resume_dunning',
  ]),
  failure_id: z.string().uuid().optional(),
  subscriber_id: z.string().uuid().optional(),
  settings: RecoverySettingsSchema.optional(),
}).passthrough();

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
  const corsHeaders = getCorsHeaders(req);
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

    const parsed = await validateBody(req, RecoverySchema, { name: 'failed-payment-recovery' });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as RecoveryRequest;
    const { action } = body;

    // `const targetCompanyId = body.company_id || companyId` used to be here,
    // and it is why every action below was cross-tenant: a company_id in the
    // BODY took precedence over the one resolved from the caller's own profile.
    // Authentication is optional in this handler (`if (authHeader)`), the client
    // is service-role, and the function is absent from supabase/config.toml so
    // verify_jwt only proves a project JWT - which the publishable anon key is.
    // So the tenant was whichever one the caller named. The body's company_id is
    // now ignored entirely; scope comes from the caller.
    logStep('Processing action', { action, companyId });

    // The cron path. It walks every tenant's failures and cannot be scoped, so
    // it takes the same treatment as webhook-trigger and billing-automation.
    if (action === 'process_failures') {
      const denied = requireInternalCaller(req);
      if (denied) return denied;
      return await processAllFailures(corsHeaders, supabaseClient);
    }

    // Everything else is user-initiated and must have a caller.
    if (!companyId) return errorResponse('Unauthorized', 401);

    switch (action) {
      case 'retry_payment': {
        const owned = await failureBelongsTo(supabaseClient, body.failure_id!, companyId);
        if (!owned) return errorResponse('Payment failure not found', 404);
        return await retryPayment(corsHeaders, supabaseClient, body.failure_id!);
      }

      case 'send_dunning_email': {
        const owned = await failureBelongsTo(supabaseClient, body.failure_id!, companyId);
        if (!owned) return errorResponse('Payment failure not found', 404);
        return await sendDunningEmail(corsHeaders, supabaseClient, body.failure_id!);
      }

      case 'get_settings':
        return await getSettings(corsHeaders, supabaseClient, companyId);

      case 'update_settings':
        return await updateSettings(corsHeaders, supabaseClient, companyId, body.settings!);

      case 'get_dashboard':
        return await getDashboard(corsHeaders, supabaseClient, companyId);

      case 'pause_dunning': {
        const owned = await subscriberBelongsTo(supabaseClient, body.subscriber_id!, companyId);
        if (!owned) return errorResponse('Subscriber not found', 404);
        return await pauseDunning(corsHeaders, supabaseClient, body.subscriber_id!);
      }

      case 'resume_dunning': {
        const owned = await subscriberBelongsTo(supabaseClient, body.subscriber_id!, companyId);
        if (!owned) return errorResponse('Subscriber not found', 404);
        return await resumeDunning(corsHeaders, supabaseClient, body.subscriber_id!);
      }

      default:
        return errorResponse('Invalid action', 400);
    }

  } catch (error) {
    await captureException(error, { fn: 'failed-payment-recovery', req });
    const errorObj = error as Error;
    logStep('Error', { error: errorObj.message });
    return new Response(
      JSON.stringify({ timestamp: new Date().toISOString(), success: false, error: errorObj.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function processAllFailures(corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>) {
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
      // Suspend the account. The error was discarded, so a failure left the
      // account unsuspended and still in dunning, and the run reported a
      // suspension that never happened (US-300).
      const { error: suspendError } = await supabase
        .from('payment_failures')
        .update({
          dunning_status: 'suspended',
          next_retry_at: null
        })
        .eq('id', failure.id);

      if (suspendError) {
        throw new Error(`Account not suspended after max retries: ${suspendError.message}`);
      }

      // Update subscriber status
      if (failure.subscriber_id) {
        const { error: updateSubscribersError } = await supabase
          .from('subscribers')
          .update({
            subscribed: false
          })
          .eq('id', failure.subscriber_id);
        if (updateSubscribersError) {
          console.error(`[subscribers] update failed`, updateSubscribersError);
        }

        // US-335: and the company, the same state every other suspension
        // path writes (_shared/entitlements.ts).
        const companySuspend = await suspendCompanyOfSubscriber(supabase, failure.subscriber_id);
        if (companySuspend.error) {
          console.error(`[companies] suspend failed`, companySuspend.error);
        }
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

      // Advancing the attempt counter is what makes the dunning schedule move.
      // The error was discarded, so a failure left the counter where it was and
      // the same retry - and the same email - repeated on every run (US-300).
      const { error: advanceError } = await supabase
        .from('payment_failures')
        .update({
          attempt_count: failure.attempt_count + 1,
          next_retry_at: nextRetry.toISOString(),
          last_retry_at: now.toISOString()
        })
        .eq('id', failure.id);

      if (advanceError) {
        throw new Error(`Dunning attempt not advanced, this retry will repeat: ${advanceError.message}`);
      }
    }
  }

  logStep('Processed failures', { processed, retried, emailsSent, suspended });

  return new Response(
    JSON.stringify({
      timestamp: new Date().toISOString(),
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
      // Success! Mark failure as resolved. The error was discarded, so a
      // customer who had just paid could stay in dunning, keep receiving dunning
      // email, and eventually be suspended (US-300).
      const { error: resolveError } = await supabase
        .from('payment_failures')
        .update({
          dunning_status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', failure.id);

      if (resolveError) {
        throw new Error(
          `Invoice ${invoiceId} was paid but the failure is still open in dunning: ${resolveError.message}`,
        );
      }

      // Update subscriber status
      const subscriber = failure.subscriber as Record<string, unknown>;
      if (subscriber?.id) {
        const { error: updateSubscribersError } = await supabase
          .from('subscribers')
          .update({
            subscribed: true
          })
          .eq('id', subscriber.id);
        if (updateSubscribersError) {
          console.error(`[subscribers] update failed`, updateSubscribersError);
        }
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
  failure: Record<string, unknown>,
  once: 'per_attempt' | 'always' = 'per_attempt',
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
    .replace('{update_payment_link}', `${siteUrl()}/settings/billing`);

  // Send email (US-253: SES through the shared sender, retried and logged).
  // The body is the company's own template text; the customer name and the
  // Stripe failure reason are substituted into it, so the HTML copy is
  // escaped rather than trusted.
  const result = await sendEmail({
    to: user.email as string,
    from: 'billing@brikly.net',
    fromName: 'Brikly',
    subject,
    text: body,
    html: escapeHtml(body).replace(/\n/g, '<br>'),
    companyId: userProfile.company_id,
    template: 'payment_failed',
    source: 'failed-payment-recovery',
    // Scheduled runs send one notice per failure per attempt, so a rerun of
    // the dunning job does not mail the customer again. A dunning email an
    // admin sends by hand is deliberate and always goes.
    idempotencyKey: once === 'per_attempt' ? await emailIdempotencyKey('payment_failed', failure.id as string, (failure.attempt_count as number | undefined) ?? 0) : undefined,
  });

  if (!result.success) {
    logStep('Failed to send email', { error: result.error });
  }
  return result.success;
}

async function retryPayment(
  corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>,
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
      timestamp: new Date().toISOString(),
      success: result.success,
      message: result.success ? 'Payment recovered' : `Retry failed: ${result.error}`,
      error: result.error
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function sendDunningEmail(
  corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>,
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

  const sent = await sendFailureNotification(supabase, failure, 'always');

  return new Response(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      success: sent,
      message: sent ? 'Dunning email sent' : 'Failed to send email'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

/**
 * Ownership, the long way round, because the schema does not offer a short one.
 * payment_failures has no company_id - only subscriber_id - and subscribers has
 * no company_id either, only user_id. So the chain is
 *
 *   payment_failures.subscriber_id -> subscribers.user_id -> user_profiles.company_id
 *
 * Both helpers return false on any missing link rather than throwing, and every
 * caller answers 404 rather than 403: a distinct "forbidden" would confirm that
 * the id exists, which is the thing an attacker is probing for.
 */
async function subscriberBelongsTo(
  supabase: ReturnType<typeof createClient>,
  subscriberId: string,
  companyId: string,
): Promise<boolean> {
  if (!subscriberId) return false;

  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('user_id')
    .eq('id', subscriberId)
    .maybeSingle();
  if (!subscriber?.user_id) return false;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', subscriber.user_id)
    .maybeSingle();

  return profile?.company_id === companyId;
}

async function failureBelongsTo(
  supabase: ReturnType<typeof createClient>,
  failureId: string,
  companyId: string,
): Promise<boolean> {
  if (!failureId) return false;

  const { data: failure } = await supabase
    .from('payment_failures')
    .select('subscriber_id')
    .eq('id', failureId)
    .maybeSingle();
  if (!failure?.subscriber_id) return false;

  return await subscriberBelongsTo(supabase, failure.subscriber_id, companyId);
}

async function getSettings(
  corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>,
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
      timestamp: new Date().toISOString(),
      success: true,
      settings: settings || getDefaultSettings()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function updateSettings(
  corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>,
  companyId: string,
  settings: RecoverySettings
) {
  const { data, error } = await supabase
    .from('failed_payment_recovery_settings')
    .upsert({
      // Allowlisted, and company_id AFTER the spread. It used to come first,
      // with the raw settings spread after it, on a service-role client - so a
      // settings.company_id in the body won and rewrote another tenant's
      // dunning settings (onConflict: company_id). The web client round-trips
      // the whole row, company_id included, so that was one edited request
      // away.
      ...pickAllowed((settings ?? {}) as Record<string, unknown>, WRITABLE_RECOVERY_SETTINGS_COLUMNS),
      company_id: companyId,
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
      timestamp: new Date().toISOString(),
      success: true,
      settings: data,
      message: 'Settings updated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getDashboard(
  corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>,
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
      timestamp: new Date().toISOString(),
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
  corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>,
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
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Dunning paused for subscriber'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function resumeDunning(
  corsHeaders: Record<string, string>, supabase: ReturnType<typeof createClient>,
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
      timestamp: new Date().toISOString(),
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
