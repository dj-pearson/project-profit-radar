/**
 * Tenant scope for a user-initiated edge function call (US-341).
 *
 * A service-role client bypasses RLS, so the function itself is the only thing
 * standing between a caller and every other company's rows. The company it acts
 * on therefore has to come from the caller's verified profile, never from the
 * request body. Three functions got this wrong the same way:
 *
 *   send-payment-reminder       targetCompanyId = body.company_id || companyId
 *   generate-cash-flow-forecast read and upserted for body.company_id
 *   data-subject-delete         filed the erasure ticket under body.company_id
 *
 * Older clients still send company_id in the body, so rejecting the field
 * outright would 400 them. The body value is accepted when it agrees with the
 * profile and refused with 403 when it does not.
 *
 * Pure on purpose: no Supabase import, so vitest can load it.
 */

export type CompanyScope =
  | { ok: true; companyId: string }
  | { ok: false; status: 403; error: string };

export function resolveCompanyScope(
  profileCompanyId: string | null | undefined,
  bodyCompanyId: unknown,
): CompanyScope {
  if (!profileCompanyId) {
    return { ok: false, status: 403, error: 'Your account is not attached to a company' };
  }
  if (bodyCompanyId !== undefined && bodyCompanyId !== null && bodyCompanyId !== '' &&
      bodyCompanyId !== profileCompanyId) {
    return { ok: false, status: 403, error: 'company_id does not match your company' };
  }
  return { ok: true, companyId: profileCompanyId };
}

/**
 * May this caller make a service-role function act on `target` (US-241)?
 *
 * The body-names-a-user variant of the company_id problem above. A function
 * that takes a userId out of the body and writes or notifies on the service
 * role has to check that the user is the caller, or is in the caller's own
 * company. root_admin is platform-wide and may act on anyone.
 *
 * Fails closed: an unknown target company, or a caller with no company, only
 * passes for the caller acting on themselves.
 */
export function canActOnUser(
  caller: { id: string; role?: string | null; companyId?: string | null },
  target: { id: string; companyId?: string | null },
): boolean {
  if (!caller.id || !target.id) return false;
  if (caller.id === target.id) return true;
  if (caller.role === 'root_admin') return true;
  return !!caller.companyId && !!target.companyId && caller.companyId === target.companyId;
}
