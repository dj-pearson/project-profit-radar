/**
 * Web mirror of supabase/functions/_shared/saml-availability.ts (US-340).
 * SAML sign-in stays off until the callback verifies XML signatures; the
 * server refuses to enable a SAML connection and both SAML endpoints answer
 * 503. This only keeps the admin UI honest about that. Flip both together.
 */
export const SAML_AVAILABLE = false;

export const SAML_UNAVAILABLE_NOTICE =
  'SAML sign-in is unavailable until signature verification ships. You can save a SAML configuration, but it cannot be enabled yet.';
