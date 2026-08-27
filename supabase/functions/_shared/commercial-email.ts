// Shared commercial-email sender.
//
// Every non-transactional email MUST flow through this helper. It:
//
//   1. Looks up the recipient's opt-in state via canSendEmail() and
//      short-circuits if the category has been disabled.
//   2. Generates a time-limited, HMAC-signed unsubscribe token so the
//      email's unsubscribe URL works without a session (same algorithm as
//      the email-unsubscribe edge function — keep in sync).
//   3. Sets the RFC-8058 one-click List-Unsubscribe and
//      List-Unsubscribe-Post headers so Gmail/Yahoo bulk-sender rules are
//      satisfied and the "Unsubscribe" button appears in the inbox UI.
//   4. Injects a CAN-SPAM-compliant footer (physical address, sender
//      identification, unsubscribe link, email preferences link, privacy
//      link) into the HTML body if the caller hasn't already.
//
// Edge functions that send transactional or security-alert email should
// continue using sendEmail() directly — those are CAN-SPAM exempt and
// must not carry a List-Unsubscribe header that could break
// account-critical delivery.
//
// Usage:
//   import { sendCommercialEmail } from '../_shared/commercial-email.ts';
//   await sendCommercialEmail(supabase, {
//     to: user.email,
//     userId: user.id,
//     kind: 'marketing',
//     subject: '...',
//     html: '<p>...</p>',
//   });

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import {
  sendEmail,
  getSiteEmailConfig,
  DEFAULT_SITE_CONFIG,
  type SiteEmailConfig,
} from './ses-email-service.ts';
import { canSendEmail, type EmailKind } from './email-consent.ts';

export interface CommercialEmailOptions {
  to: string;
  /** Required — used to generate the unsubscribe token and opt-out check. */
  userId: string;
  /** Determines which opt-out preference gates delivery. */
  kind: Exclude<EmailKind, 'transactional' | 'security_alerts'>;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  /**
   * Skip footer injection if the caller has already produced a
   * fully-formed commercial footer. Must still include a physical
   * address and functional unsubscribe link.
   */
  skipFooterInjection?: boolean;
}

export interface CommercialEmailResult {
  success: boolean;
  skipped?: 'opted_out' | 'no_recipient' | 'no_secret';
  error?: string;
  messageId?: string;
}

// Registered Brikly business address. Kept in sync with:
//   - src/components/Footer.tsx
//   - src/pages/PrivacyPolicy.tsx, TermsOfService.tsx, DMCAPolicy.tsx
//   - src/templates/emails/baseEmailTemplate.ts
//   - supabase/functions/_shared/auth-email-templates.ts
// When this moves, update all of the above.
const BRIKLY_POSTAL_ADDRESS = `Brikly Inc.
123 Construction Way, Suite 100
Builder City, BC 12345, USA`;

const FUNCTIONS_BASE =
  Deno.env.get('PUBLIC_FUNCTIONS_BASE_URL') ??
  // Fallback: derive from SUPABASE_URL. If neither is set we disable
  // List-Unsubscribe rather than emit a broken link.
  (Deno.env.get('SUPABASE_URL')
    ? `${Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '')}/functions/v1`
    : '');

/**
 * Generate an HMAC-SHA256 signed unsubscribe token. Same format the
 * email-unsubscribe edge function consumes: base64url(user_id).timestamp.sig
 */
const signUnsubscribeToken = async (
  userId: string,
  secret: string,
): Promise<string> => {
  const ts = Date.now().toString();
  const b64 = (s: string) =>
    btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      keyMaterial,
      new TextEncoder().encode(`${userId}.${ts}`),
    ),
  );
  const sigB64 = b64(String.fromCharCode(...sig));
  return `${b64(userId)}.${b64(ts)}.${sigB64}`;
};

const buildUnsubscribeUrl = async (
  userId: string,
  kind: CommercialEmailOptions['kind'],
): Promise<string | null> => {
  const secret = Deno.env.get('EMAIL_UNSUBSCRIBE_SECRET');
  if (!secret || !FUNCTIONS_BASE) return null;
  const token = await signUnsubscribeToken(userId, secret);
  return `${FUNCTIONS_BASE}/email-unsubscribe?token=${encodeURIComponent(token)}&category=${kind}`;
};

const appendComplianceFooter = (
  html: string,
  siteConfig: SiteEmailConfig,
  unsubscribeUrl: string | null,
): string => {
  const footer = `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:32px; border-top:1px solid #E5E7EB;">
    <tr>
      <td style="padding:24px 16px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#6B7280; font-size:12px; line-height:1.6;">
        <p style="margin:0 0 8px;"><strong>${siteConfig.siteName}, Inc.</strong></p>
        <p style="margin:0 0 8px; white-space:pre-line;">${BRIKLY_POSTAL_ADDRESS.split('\n').slice(1).join('\n')}</p>
        <p style="margin:8px 0 0;">
          ${
            unsubscribeUrl
              ? `<a href="${unsubscribeUrl}" style="color:#6B7280; text-decoration:underline;">Unsubscribe</a> &middot; `
              : ''
          }
          <a href="https://${siteConfig.domain}/email-preferences" style="color:#6B7280; text-decoration:underline;">Email Preferences</a> &middot;
          <a href="https://${siteConfig.domain}/privacy-policy" style="color:#6B7280; text-decoration:underline;">Privacy</a> &middot;
          <a href="https://${siteConfig.domain}/terms-of-service" style="color:#6B7280; text-decoration:underline;">Terms</a>
        </p>
        <p style="margin:8px 0 0; color:#9CA3AF;">You received this email because of your account or marketing preferences at ${siteConfig.siteName}. If you did not expect it, please unsubscribe above.</p>
      </td>
    </tr>
  </table>
`;
  // Inject before </body> when possible; otherwise append.
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footer}</body>`);
  }
  return `${html}${footer}`;
};

/**
 * Send a commercial (non-transactional) email with full CAN-SPAM / CASL /
 * ePrivacy compliance. Returns success=false with a reason when delivery
 * was intentionally skipped (e.g., opt-out).
 */
export async function sendCommercialEmail(
  supabase: SupabaseClient,
  options: CommercialEmailOptions,
): Promise<CommercialEmailResult> {
  if (!options.to) return { success: false, skipped: 'no_recipient' };

  // 1. Honor opt-out.
  const permitted = await canSendEmail(supabase, options.to, options.kind);
  if (!permitted) {
    console.log(
      `[commercial-email] skipped send to ${options.to} — user opted out of ${options.kind}`,
    );
    return { success: false, skipped: 'opted_out' };
  }

  const siteConfig = await getSiteEmailConfig().catch(() => DEFAULT_SITE_CONFIG);

  // 2. Build signed unsubscribe URL + RFC 8058 headers.
  const unsubscribeUrl = await buildUnsubscribeUrl(options.userId, options.kind);
  const headers: Record<string, string> = {};
  const mailtoUnsub = `mailto:unsubscribe@${siteConfig.domain}?subject=unsubscribe`;
  if (unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>, <${mailtoUnsub}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  } else {
    // Still include a mailto so basic unsubscribe works even when the
    // signing secret is not yet configured.
    headers['List-Unsubscribe'] = `<${mailtoUnsub}>`;
  }

  // 3. Inject footer.
  const html = options.skipFooterInjection
    ? options.html
    : appendComplianceFooter(options.html, siteConfig, unsubscribeUrl);

  return sendEmail(
    {
      to: options.to,
      subject: options.subject,
      html,
      text: options.text,
      from: options.from,
      fromName: options.fromName,
      replyTo: options.replyTo,
      headers,
    },
    siteConfig,
  );
}
