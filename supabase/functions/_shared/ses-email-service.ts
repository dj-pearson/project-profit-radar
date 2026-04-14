/**
 * Amazon SES SMTP Email Service
 *
 * Sends emails via Amazon SES SMTP using the configured credentials.
 * Supports multi-tenant branding via site configuration.
 *
 * Environment Variables Required:
 * - AMAZON_SMTP_USER_NAME
 * - AMAZON_SMTP_PASSWORD
 * - AMAZON_SMTP_ENDPOINT (e.g., email-smtp.us-east-1.amazonaws.com)
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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
   * (RFC 8058) so Gmail / Yahoo bulk-sender rules and CAN-SPAM §5(a)(5)
   * "functional unsubscribe" are honored.
   */
  headers?: Record<string, string>;
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

/**
 * Get SMTP configuration from environment variables
 */
function getSMTPConfig() {
  const username = Deno.env.get('AMAZON_SMTP_USER_NAME');
  const password = Deno.env.get('AMAZON_SMTP_PASSWORD');
  const endpoint = Deno.env.get('AMAZON_SMTP_ENDPOINT') || 'email-smtp.us-east-1.amazonaws.com';

  if (!username || !password) {
    throw new Error('Amazon SES SMTP credentials not configured');
  }

  return {
    hostname: endpoint,
    port: 465,
    username,
    password,
    tls: true,
  };
}

/**
 * Send an email via Amazon SES SMTP
 */
export async function sendEmail(
  options: EmailOptions,
  siteConfig: SiteEmailConfig = DEFAULT_SITE_CONFIG
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const smtpConfig = getSMTPConfig();

    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.hostname,
        port: smtpConfig.port,
        tls: smtpConfig.tls,
        auth: {
          username: smtpConfig.username,
          password: smtpConfig.password,
        },
      },
    });

    const fromEmail = options.from || siteConfig.fromEmail;
    const fromName = options.fromName || siteConfig.fromName;

    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // denomailer accepts a `headers` Record in its SendConfig type. We pass
    // through anything the caller provides — List-Unsubscribe is the common
    // case. Keys are canonicalized so SES accepts them consistently.
    const extraHeaders: Record<string, string> = {};
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        if (typeof v === 'string' && v.length > 0) extraHeaders[k] = v;
      }
    }

    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject: options.subject,
      content: options.text || '',
      html: options.html,
      replyTo: options.replyTo,
      // denomailer supports custom headers via the `headers` field.
      // When empty, the field is still harmless.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headers: extraHeaders as any,
    });

    await client.close();

    console.log(`[SES] Email sent successfully to: ${recipients.join(', ')}`);
    return { success: true };
  } catch (error) {
    console.error('[SES] Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get site email configuration
 * Always returns default Brikly configuration
 */
export async function getSiteEmailConfig(): Promise<SiteEmailConfig> {
  console.log('[SES] Using default Brikly configuration');
  return DEFAULT_SITE_CONFIG;
}

export { DEFAULT_SITE_CONFIG };
