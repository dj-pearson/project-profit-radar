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

import { SMTPClient } from 'denomailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
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

// Default BuildDesk configuration
const DEFAULT_SITE_CONFIG: SiteEmailConfig = {
  siteName: 'BuildDesk',
  fromEmail: 'noreply@build-desk.com',
  fromName: 'BuildDesk',
  supportEmail: 'support@build-desk.com',
  logoUrl: 'https://build-desk.com/logo.png',
  primaryColor: '#F97316',
  domain: 'build-desk.com',
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

    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject: options.subject,
      content: options.text || '',
      html: options.html,
      replyTo: options.replyTo,
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
 * Always returns default BuildDesk configuration
 */
export async function getSiteEmailConfig(): Promise<SiteEmailConfig> {
  console.log('[SES] Using default BuildDesk configuration');
  return DEFAULT_SITE_CONFIG;
}

export { DEFAULT_SITE_CONFIG };
