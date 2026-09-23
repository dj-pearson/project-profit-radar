/**
 * SAML sign-in is switched off until the callback verifies XML signatures (US-340).
 *
 * sso-saml-callback's validateSignature() checked that the XML contained the
 * right element names and returned true whether or not a Signature was
 * present. The connection was then picked by the Issuer inside that same
 * unsigned document, the user looked up by email across every tenant, and a
 * magic link minted. So anyone could write an assertion for any email in an
 * enabled connection's allowed_domains and sign in as that person.
 *
 * The owner confirmed on 2026-09-09 that no SAML connection is enabled in
 * production, so the hole is latent. This keeps it that way: both SAML
 * endpoints answer 503, and sso-manage refuses to enable a SAML connection.
 * Flip SAML_AVAILABLE only in the change that ships a real XML-DSig check
 * against config.certificate plus InResponseTo, time-window, Audience and
 * Destination validation, with tests for unsigned and wrongly-signed input.
 *
 * Pure on purpose, so vitest can load it.
 */

export const SAML_AVAILABLE = false;

export const SAML_UNAVAILABLE_MESSAGE =
  'SAML sign-in is not available yet. Use your email and password, or an OAuth provider, to sign in.';

export function samlUnavailableResponse(corsHeaders: Record<string, string>): Response | null {
  if (SAML_AVAILABLE) return null;
  return new Response(
    JSON.stringify({ success: false, error: SAML_UNAVAILABLE_MESSAGE, timestamp: new Date().toISOString() }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '86400' } },
  );
}

/** True when a write would leave a SAML connection enabled while SAML is off. */
export function wouldEnableSaml(provider: string | null | undefined, isEnabled: boolean | undefined): boolean {
  return !SAML_AVAILABLE && provider === 'saml' && isEnabled === true;
}
