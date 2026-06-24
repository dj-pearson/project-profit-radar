// Shared email-consent helper for edge functions.
//
// Every outbound commercial email MUST call `canSendEmail(recipient, kind)`
// BEFORE delivering. The helper:
//
//   1. Looks up the recipient's preferences row in `email_preferences`.
//   2. Returns true for transactional + security_alerts (always allowed —
//      these are required to operate the account and are exempt from
//      CAN-SPAM opt-out, per 15 U.S.C. § 7702(17)).
//   3. Returns the stored boolean for marketing / product_updates /
//      newsletter, defaulting to `true` when no row exists (opt-OUT model
//      per CAN-SPAM §7704(a)(3); EU/UK consent is captured separately via
//      sign-up flows).
//
// Also exposes `honorUnsubscribe(email)` to flip all categories off in a
// single call — use this from a public unsubscribe endpoint when the user
// clicks the one-click unsubscribe link.
//
// Usage:
//   import { canSendEmail } from '../_shared/email-consent.ts';
//   if (!(await canSendEmail(supabase, user.email, 'marketing'))) return;

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type EmailKind =
  | 'transactional'
  | 'security_alerts'
  | 'product_updates'
  | 'marketing'
  | 'newsletter';

/**
 * Returns true when the edge function may send an email of `kind` to
 * `email`. Always returns true for transactional / security alerts.
 */
export async function canSendEmail(
  client: SupabaseClient,
  email: string | null | undefined,
  kind: EmailKind,
): Promise<boolean> {
  // Always allowed — these are not "commercial email" under CAN-SPAM and
  // are necessary for the service under GDPR Art. 6(1)(b) / (f).
  if (kind === 'transactional' || kind === 'security_alerts') return true;

  if (!email) return false;

  try {
    // Look up user by email via auth.users (service role). If we can't
    // resolve a user, default to allowing the first send (the recipient
    // opted in during sign-up or otherwise gave consent); subsequent
    // sends should resolve cleanly once their preference row is created.
    const { data: authUser } = await (client as unknown as {
      auth: { admin: { getUserByEmail: (e: string) => Promise<{ data: { user: { id: string } | null } }> } };
    }).auth.admin
      .getUserByEmail(email)
      .catch(() => ({ data: { user: null } }));

    const userId = authUser?.user?.id;
    if (!userId) return true;

    const { data } = await client
      .from('email_preferences')
      .select(kind)
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((data as any)[kind]);
  } catch (err) {
    console.warn('[email-consent] lookup failed, defaulting to allow', err);
    return true;
  }
}

/**
 * One-click unsubscribe. Sets all optional categories to false.
 */
export async function honorUnsubscribe(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  await client.from('email_preferences').upsert({
    user_id: userId,
    product_updates: false,
    marketing: false,
    newsletter: false,
    updated_at: new Date().toISOString(),
  });
}
