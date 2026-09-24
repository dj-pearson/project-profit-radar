/**
 * The one way an edge function sends email (US-253).
 *
 * PROVIDER: Amazon SES, on the brikly.net sending identity. Resend was the
 * second provider (nine functions, several sending from resend.dev, brikly.app
 * or brikly.dev, which SPF/DKIM for brikly.net do not cover); those were moved
 * here. The decision and the owner steps are in docs/EMAIL_DELIVERY.md.
 *
 * sendEmail() keeps the signature and return shape it always had, so callers
 * only add the optional fields they need (idempotencyKey, companyId, category,
 * template, source). Behind it, _shared/email-delivery.ts does the work that
 * vitest can see: idempotency, bounded retry with backoff, the
 * email_deliveries ledger row, the consent gate and the Sentry report.
 *
 * Two SES transports, chosen per call:
 *
 *   - ses-api:  SES v2 SendEmail over HTTPS, signed with SigV4. Returns the SES
 *               MessageId, which is what bounce and complaint events carry, and
 *               an HTTP status the retry policy can read. Used when
 *               AWS_SES_ACCESS_KEY_ID and AWS_SES_SECRET_ACCESS_KEY are set.
 *   - ses-smtp: SES over SMTP (denomailer), the path that shipped before. No
 *               MessageId comes back through denomailer, so the ledger row
 *               carries the idempotency key but no provider id. Used until the
 *               API keys are set.
 *
 * Environment:
 *   AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY  - enable ses-api
 *   AWS_SES_REGION             - defaults to the SMTP endpoint's region, else us-east-1
 *   AWS_SES_CONFIGURATION_SET  - optional; routes bounce/complaint events
 *   AMAZON_SMTP_USER_NAME, AMAZON_SMTP_PASSWORD, AMAZON_SMTP_ENDPOINT - ses-smtp
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { createServiceClient } from './service-client.ts';
import { canSendEmail } from './email-consent.ts';
import { captureException } from './observability.ts';
import { signRequest } from './aws-sigv4.ts';
import {
  type DeliveryStore,
  type EmailCategory,
  type EmailTransport,
  type OutboundMessage,
  type TransportOutcome,
  classifyHttpFailure,
  classifySmtpError,
  normalizeRecipients,
  randomIdempotencyKey,
  sendWithLedger,
} from './email-delivery.ts';

export { emailIdempotencyKey } from './email-delivery.ts';
export type { EmailCategory } from './email-delivery.ts';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  /**
   * Arbitrary RFC-5322 headers. Primarily used for List-Unsubscribe
   * (RFC 8058) so Gmail / Yahoo bulk-sender rules and CAN-SPAM 5(a)(5)
   * "functional unsubscribe" are honored.
   */
  headers?: Record<string, string>;
  /**
   * Same key, same email, at most once. Build one with emailIdempotencyKey()
   * from the occasion (invoice + reminder type + day). Omit it for a one-off;
   * a random key still stops our own retries from sending twice.
   */
  idempotencyKey?: string;
  /** Company the email is sent on behalf of; scopes the ledger row. */
  companyId?: string | null;
  /** Defaults to 'transactional'. Anything else is checked against email_preferences. */
  category?: EmailCategory;
  /** Short name of the email, e.g. 'payment_reminder'. Stored on the ledger row. */
  template?: string;
  /** Edge function name, for the ledger and the Sentry report. */
  source?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** email_deliveries.id, when the ledger recorded the send. */
  deliveryId?: string;
  deduplicated?: boolean;
  suppressed?: boolean;
}

export interface SiteEmailConfig {
  siteName: string;
  fromEmail: string;
  fromName: string;
  supportEmail: string;
  logoUrl: string;
  primaryColor: string;
  domain: string;
}

// Default Brikly configuration
const DEFAULT_SITE_CONFIG: SiteEmailConfig = {
  siteName: 'Brikly',
  fromEmail: 'noreply@brikly.net',
  fromName: 'Brikly',
  supportEmail: 'support@brikly.net',
  logoUrl: 'https://brikly.net/logo.png',
  primaryColor: '#F97316',
  domain: 'brikly.net',
};

// ---------------------------------------------------------------------------
// Transports
// ---------------------------------------------------------------------------

function smtpEndpoint(): string {
  return Deno.env.get('AMAZON_SMTP_ENDPOINT') || 'email-smtp.us-east-1.amazonaws.com';
}

function sesRegion(): string {
  const explicit = Deno.env.get('AWS_SES_REGION');
  if (explicit) return explicit;
  const m = /email-smtp\.([a-z0-9-]+)\.amazonaws\.com/.exec(smtpEndpoint());
  return m ? m[1] : 'us-east-1';
}

/** Header names SES v2 accepts on a Simple message; the rest it sets itself. */
const RESERVED_HEADERS = /^(from|to|cc|bcc|subject|reply-to|content-type|content-transfer-encoding|mime-version|message-id|date|return-path)$/i;
/** SES tag values: letters, digits, _ - . @ only. */
const TAG_SAFE = /^[A-Za-z0-9_.@-]{1,256}$/;

function sesApiTransport(accessKeyId: string, secretAccessKey: string): EmailTransport {
  const region = sesRegion();
  const url = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;
  const configurationSet = Deno.env.get('AWS_SES_CONFIGURATION_SET') || undefined;

  return {
    name: 'ses-api',
    async send(message: OutboundMessage, ctx): Promise<TransportOutcome> {
      const headers = Object.entries(message.headers ?? {})
        .filter(([k, v]) => v && !RESERVED_HEADERS.test(k))
        .map(([Name, Value]) => ({ Name, Value }));
      const tagValue = ctx.idempotencyKey.replace(/:/g, '.');
      const body = JSON.stringify({
        FromEmailAddress: message.from,
        Destination: { ToAddresses: message.to },
        ...(message.replyTo ? { ReplyToAddresses: [message.replyTo] } : {}),
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: message.html, Charset: 'UTF-8' },
              ...(message.text ? { Text: { Data: message.text, Charset: 'UTF-8' } } : {}),
            },
            ...(headers.length ? { Headers: headers } : {}),
          },
        },
        // Bounce and complaint events carry these tags, which is how an event
        // finds its email_deliveries row even without the MessageId.
        ...(TAG_SAFE.test(tagValue) ? { EmailTags: [{ Name: 'idempotency_key', Value: tagValue }] } : {}),
        ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
      });

      const signed = await signRequest(
        { method: 'POST', url, headers: { 'content-type': 'application/json' }, body },
        { accessKeyId, secretAccessKey },
        region,
        'ses',
      );
      // host is set by fetch itself and may not be passed.
      const { host: _host, ...sendHeaders } = signed;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(url, { method: 'POST', headers: sendHeaders, body, signal: controller.signal });
        const text = await res.text();
        if (!res.ok) return classifyHttpFailure(res.status, text, res.headers.get('retry-after'));
        let messageId: string | null = null;
        try {
          messageId = (JSON.parse(text) as { MessageId?: string }).MessageId ?? null;
        } catch {
          messageId = null;
        }
        return { ok: true, messageId };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function sesSmtpTransport(username: string, password: string): EmailTransport {
  return {
    name: 'ses-smtp',
    async send(message: OutboundMessage): Promise<TransportOutcome> {
      const client = new SMTPClient({
        connection: {
          hostname: smtpEndpoint(),
          port: 465,
          tls: true,
          auth: { username, password },
        },
      });
      try {
        await client.send({
          from: message.from,
          to: message.to,
          subject: message.subject,
          content: message.text || '',
          html: message.html,
          replyTo: message.replyTo,
          // denomailer accepts a headers record; List-Unsubscribe is the usual case.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headers: (message.headers ?? {}) as any,
        });
        return { ok: true, messageId: null };
      } catch (err) {
        return classifySmtpError(err);
      } finally {
        try {
          await client.close();
        } catch {
          // A close after a failed send has nothing left to tell us.
        }
      }
    },
  };
}

function unconfiguredTransport(): EmailTransport {
  return {
    name: 'none',
    send: async () => ({ ok: false, retryable: false, statusCode: null, error: 'Amazon SES credentials not configured' }),
  };
}

function selectTransport(): EmailTransport {
  const keyId = Deno.env.get('AWS_SES_ACCESS_KEY_ID');
  const secret = Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
  if (keyId && secret) return sesApiTransport(keyId, secret);
  const user = Deno.env.get('AMAZON_SMTP_USER_NAME');
  const pass = Deno.env.get('AMAZON_SMTP_PASSWORD');
  if (user && pass) return sesSmtpTransport(user, pass);
  return unconfiguredTransport();
}

// ---------------------------------------------------------------------------
// The ledger, against public.email_deliveries (service role only)
// ---------------------------------------------------------------------------

function deliveryStore(client: SupabaseClient): DeliveryStore {
  const table = () => client.from('email_deliveries');
  return {
    async insert(row) {
      const { data, error } = await table().insert(row).select('id').single();
      if (error) return error.code === '23505' ? { conflict: true } : { error: error.message };
      return { id: (data as { id: string }).id };
    },
    async findByKey(key) {
      const { data, error } = await table()
        .select('id, status, provider_message_id, updated_at, attempts')
        .eq('idempotency_key', key)
        .maybeSingle();
      if (error) return { error: error.message };
      // deno-lint-ignore no-explicit-any
      return { row: (data as any) ?? null };
    },
    async reclaim(id, expected) {
      const { data, error } = await table()
        .update({ status: 'sending', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', expected.status)
        .eq('updated_at', expected.updated_at)
        .select('id');
      if (error) return { error: error.message };
      return { ok: Array.isArray(data) && data.length === 1 };
    },
    async update(id, patch) {
      const { error } = await table()
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { error: error.message };
      return { ok: true };
    },
  };
}

function serviceClientOrNull(): SupabaseClient | null {
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return null;
  return createServiceClient();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send an email through SES. Never throws. `success` is true only when SES
 * accepted the message (or the same idempotency key already had).
 */
export async function sendEmail(
  options: EmailOptions,
  siteConfig: SiteEmailConfig = DEFAULT_SITE_CONFIG,
): Promise<SendEmailResult> {
  try {
    const fromEmail = options.from || siteConfig.fromEmail;
    const fromName = options.fromName || siteConfig.fromName;
    const { valid } = normalizeRecipients(options.to);
    const category = options.category ?? 'transactional';
    const source = options.source ?? null;
    const client = serviceClientOrNull();

    const outcome = await sendWithLedger(
      {
        transport: selectTransport(),
        store: client ? deliveryStore(client) : null,
        consent: client ? (recipient, kind) => canSendEmail(client, recipient, kind) : undefined,
        report: async (f) => {
          console.error(`[email] ${f.status} ${f.template ?? ''} ${f.idempotencyKey}: ${f.message}`);
          await captureException(new Error(f.message), {
            fn: f.source ?? 'email',
            companyId: f.companyId,
            extra: {
              email_status: f.status,
              template: f.template,
              idempotency_key: f.idempotencyKey,
              transport: f.transport,
              attempts: f.attempts,
              status_code: f.statusCode,
            },
          });
        },
      },
      {
        message: {
          from: `${fromName} <${fromEmail}>`,
          to: valid,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
          headers: options.headers,
        },
        idempotencyKey: options.idempotencyKey ?? randomIdempotencyKey(options.template ?? 'email'),
        category,
        companyId: options.companyId ?? null,
        template: options.template ?? null,
        source,
        provider: 'ses',
      },
    );

    return {
      success: outcome.success,
      messageId: outcome.messageId,
      error: outcome.error,
      deliveryId: outcome.deliveryId,
      deduplicated: outcome.deduplicated,
      suppressed: outcome.suppressed,
    };
  } catch (error) {
    // sendWithLedger does not throw; this is for a bug in the wiring above.
    await captureException(error, { fn: options.source ?? 'email', companyId: options.companyId ?? null });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get site email configuration
 * Always returns default Brikly configuration
 */
export async function getSiteEmailConfig(): Promise<SiteEmailConfig> {
  return DEFAULT_SITE_CONFIG;
}

export { DEFAULT_SITE_CONFIG };
