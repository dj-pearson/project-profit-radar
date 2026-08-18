// Storage bucket registry.
//
// One place that says which buckets exist and what kind of content each holds,
// so DSAR erasure (US-290) and the bucket-privacy work (US-289) do not each
// carry their own drifting copy of the list.
//
// Classification drives erasure scope. See dsar_is_last_company_user in
// supabase/migrations/20260818000000_dsar_storage_erasure.sql for why company
// content is treated differently from personal content.

/** Content belonging to the individual. Always erased on a fulfilled DSAR. */
export const PERSONAL_BUCKETS = [
  "avatars",
] as const;

/**
 * Customer Content: uploaded on behalf of an employer, for which Brikly is a
 * processor rather than a controller (Privacy Policy sections 1 and 6). Erased
 * only when the data subject is the last user of their company.
 */
export const COMPANY_BUCKETS = [
  "project-documents",
  "company-documents",
  "project-communications",
  "project-files",
  "documents",
  "templates",
  "signatures",
  "call-recordings",
  "email-attachments",
  "expense-receipts",
  "receipts",
] as const;

/**
 * Deliberately world-readable marketing and branding assets. Never contain
 * personal data and are not touched by erasure.
 */
export const PUBLIC_ASSET_BUCKETS = [
  "site-assets",
  "blog-images",
] as const;

/** Every bucket that can hold personal data, in erasure order. */
export const ERASABLE_BUCKETS = [
  ...PERSONAL_BUCKETS,
  ...COMPANY_BUCKETS,
] as const;

export type PersonalBucket = (typeof PERSONAL_BUCKETS)[number];
export type CompanyBucket = (typeof COMPANY_BUCKETS)[number];
export type ErasableBucket = (typeof ERASABLE_BUCKETS)[number];

const PERSONAL = new Set<string>(PERSONAL_BUCKETS);
const COMPANY = new Set<string>(COMPANY_BUCKETS);

export function isPersonalBucket(bucket: string): boolean {
  return PERSONAL.has(bucket);
}

export function isCompanyBucket(bucket: string): boolean {
  return COMPANY.has(bucket);
}

/**
 * Whether an object in `bucket` is in scope for this subject's erasure.
 *
 * Personal content always is. Company content is only when nobody else is left
 * at the company, so a departing employee's request cannot destroy records the
 * rest of their employer still relies on and may be required to retain.
 */
export function isInErasureScope(bucket: string, isLastCompanyUser: boolean): boolean {
  if (isPersonalBucket(bucket)) return true;
  if (isCompanyBucket(bucket)) return isLastCompanyUser;
  // Unknown bucket: out of scope, and the caller reports it rather than
  // silently skipping, so a newly added bucket cannot quietly go unerased.
  return false;
}
