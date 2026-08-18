/**
 * Brikly's own contact details, as published to customers and regulators.
 *
 * Why this file exists
 * --------------------
 * The postal address "123 Construction Way, Suite 100, Builder City, BC 12345"
 * was placeholder text that shipped to production in nine places: the site
 * footer, the footer of every outbound email, the Privacy Policy, Terms of
 * Service, Refund Policy, Do Not Sell page, the DMCA policy's designated-agent
 * block, and the invoice and estimate PDF generators.
 *
 * A fabricated address is not a cosmetic problem:
 *   - CAN-SPAM (15 U.S.C. 7704(a)(5)) requires a *valid* physical postal
 *     address in commercial email. A fake one is a violation, not compliance
 *     with the requirement the old footer comment claimed it satisfied.
 *   - The DMCA safe harbor (17 U.S.C. 512(c)(2)) depends on a real designated
 *     agent that can actually receive notices.
 *   - CCPA/CPRA and GDPR expect a working channel for rights requests.
 *
 * So the placeholder was removed rather than left in place, and every surface
 * now reads from here. Set POSTAL_ADDRESS to Brikly Inc.'s real registered
 * address and all of those surfaces start rendering it again at once.
 *
 * Until then, surfaces that require a postal address by law are the blocker:
 * commercial email in particular should not go out without one.
 */

export interface PostalAddress {
  line1: string;
  line2?: string;
  cityRegionPostal: string;
  country: string;
}

/**
 * Brikly's registered postal address.
 *
 * `null` means "not yet supplied" - do NOT substitute a placeholder. Callers
 * must handle null by omitting the address block entirely.
 */
export const POSTAL_ADDRESS: PostalAddress | null = null;

/** Monitored contact channels. These are real and safe to publish. */
export const CONTACT = {
  legalName: 'Brikly Inc.',
  privacyEmail: 'privacy@brikly.net',
  supportEmail: 'support@brikly.net',
  billingEmail: 'billing@brikly.net',
  dmcaEmail: 'dmca@brikly.net',
  website: 'brikly.net',
} as const;

/** True when a real postal address has been configured. */
export function hasPostalAddress(): boolean {
  return POSTAL_ADDRESS !== null;
}

/** Address as plain lines, or an empty array when none is configured. */
export function postalAddressLines(): string[] {
  if (!POSTAL_ADDRESS) return [];
  return [
    POSTAL_ADDRESS.line1,
    ...(POSTAL_ADDRESS.line2 ? [POSTAL_ADDRESS.line2] : []),
    POSTAL_ADDRESS.cityRegionPostal,
    POSTAL_ADDRESS.country,
  ];
}

/** Single-line form, or an empty string when none is configured. */
export function postalAddressInline(): string {
  return postalAddressLines().join(', ');
}
