/**
 * Disposable Email Domain Detection
 *
 * Checks whether an email address belongs to a known disposable /
 * throwaway email service. The blocklist lives in the
 * `disposable_email_domains` table and is maintained by root admins
 * via the admin UI.
 *
 * Usage (inside an edge function):
 *
 *   import { isDisposableEmail } from '../_shared/disposable-email.ts';
 *
 *   if (await isDisposableEmail(supabaseAdmin, email)) {
 *     return errorResponse('Disposable email addresses are not allowed');
 *   }
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/**
 * Extracts the lowercased domain portion from an email address.
 * Returns null if the input is not a well-formed email.
 */
export function extractEmailDomain(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1 || atIndex === email.length - 1) return null;
  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  return domain || null;
}

/**
 * Check whether the given email's domain is in the active disposable
 * email blocklist.
 *
 * Fails open (returns false) on lookup errors so a transient database
 * issue never blocks legitimate sign-ups. Errors are logged.
 *
 * @param supabase - Supabase client (service role recommended)
 * @param email - The email address to check
 * @returns true if the domain is on the active blocklist
 */
export async function isDisposableEmail(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const domain = extractEmailDomain(email);
  if (!domain) return false;

  try {
    const { data, error } = await supabase
      .from('disposable_email_domains')
      .select('id')
      .eq('domain', domain)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[DisposableEmail] Lookup error:', error.message);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[DisposableEmail] Unexpected error:', err);
    return false;
  }
}
