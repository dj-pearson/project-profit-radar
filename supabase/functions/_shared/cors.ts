/**
 * DEPRECATED (US-240). This module used to export a wildcard
 * `Access-Control-Allow-Origin: '*'` header set, which let any origin invoke an
 * edge function from a browser.
 *
 * Import `getCorsHeaders(req)` from `./secure-cors.ts` instead — it echoes the
 * request origin only when it is on the allowlist, and sets `Vary: Origin` so
 * the response is cached per origin.
 *
 * The re-export below keeps any straggler importing `corsHeaders` compiling,
 * but it is origin-independent and therefore always pins the first allowlisted
 * origin. That is safe, not correct: a browser on any other allowlisted origin
 * will fail the CORS check. Move to `getCorsHeaders(req)`.
 */
export { corsHeaders } from './secure-cors.ts';
