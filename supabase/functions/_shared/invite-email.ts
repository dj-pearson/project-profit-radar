/**
 * The one invite-delivery path (US-320, US-319).
 *
 * Two functions need to tell someone "an account exists for you, choose a
 * password": invite-team-member for staff and invite-client for a customer
 * being given portal access. They differ only in wording, so the link
 * generation, the escaping and the send live here and each caller passes its
 * own copy. A second implementation is how one of them quietly stops sending.
 *
 * A set-password link rather than a mailed credential: a password in an inbox
 * is a password in an inbox forever, and the alternative this replaced -
 * minting one and telling nobody - is why invites never worked at all.
 *
 * type: 'recovery' rather than 'invite' because src/pages/ResetPassword.tsx
 * already handles that link end to end (type=recovery with tokens in the hash,
 * setSession, then updateUser). Reusing a proven path beats adding one.
 */
import { sendEmail, getSiteEmailConfig } from './ses-email-service.ts';

const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://brikly.net';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface InviteEmailCopy {
  subject: string;
  /** Rendered above the button. Already-escaped HTML. */
  headline: string;
  bodyHtml: string;
  bodyText: string;
  buttonLabel: string;
}

export interface InviteDelivery {
  sent: boolean;
  error?: string;
}

/**
 * Generates the set-password link for `email` and mails `copy` around it.
 *
 * Returns whether it was delivered rather than throwing, because in both
 * callers the account already exists by this point: a failed send is an invite
 * the recipient cannot act on yet, not a failed invite, and the caller needs to
 * say so rather than report success a second time.
 */
export async function sendInviteWithSetPasswordLink(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  email: string,
  copy: InviteEmailCopy,
  redirectPath = '/reset-password',
): Promise<InviteDelivery> {
  const { data: link, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${FRONTEND_URL}${redirectPath}` },
  });

  const actionLink = link?.properties?.action_link;
  if (linkError || !actionLink) {
    return { sent: false, error: linkError?.message || 'Could not generate the invite link' };
  }

  const siteConfig = await getSiteEmailConfig();

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2933;">
      <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">${copy.headline}</h1>
      ${copy.bodyHtml}
      <p style="margin:24px 0;">
        <a href="${actionLink}"
           style="display:inline-block;background:${siteConfig.primaryColor};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">
          ${copy.buttonLabel}
        </a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#52606d;margin:0 0 8px;">
        This link expires in 24 hours. If it has, ask for another to be sent.
      </p>
      <p style="font-size:13px;line-height:1.6;color:#52606d;margin:0;">
        Not expecting this? You can ignore this email, or tell us at ${escapeHtml(siteConfig.supportEmail)}.
      </p>
    </div>`;

  const text = [
    copy.bodyText,
    '',
    `${copy.buttonLabel}:`,
    actionLink,
    '',
    'This link expires in 24 hours.',
    `Not expecting this? Ignore this email or contact ${siteConfig.supportEmail}.`,
  ].join('\n');

  const result = await sendEmail(
    { to: email, subject: copy.subject, html, text },
    siteConfig,
  );

  return { sent: result.success, error: result.error };
}
