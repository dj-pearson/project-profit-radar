/**
 * DEPRECATED shim. Import from './secure-cors.ts' instead.
 *
 * This module used to hardcode `Access-Control-Allow-Origin: '*'`, which let any
 * site drive an authenticated browser session against our functions. It now
 * re-exports the allowlist-based headers so any straggler still importing it
 * gets the safe behaviour. New code must call `getCorsHeaders(req)` so the
 * response echoes the caller's origin and sets `Vary: Origin`.
 */
export { corsHeaders, getCorsHeaders, handleCorsPreflightRequest, isOriginAllowed } from './secure-cors.ts';
