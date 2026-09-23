/**
 * Body-text parsing for validateBody (US-241).
 *
 * Kept free of imports on purpose: validate-body.ts pulls zod from a
 * deno.land URL that a Node test runner cannot resolve, so the one rule that
 * decides whether a request is malformed lives here where vitest can reach it.
 *
 * A missing body is only acceptable when the caller opts in. data-subject-delete
 * is the case that needed it: the iOS app invokes it with no body at all, and
 * the web app sends {}. Both mean "no options", so with allowEmpty an empty or
 * whitespace-only body parses as {} and goes through the schema like any other.
 * Anything that is present but is not JSON is still rejected, opt-in or not.
 */

export type ParsedJsonBody =
  | { ok: true; value: unknown; empty: boolean }
  | { ok: false };

export function parseJsonBodyText(
  text: string,
  options: { allowEmpty?: boolean } = {},
): ParsedJsonBody {
  if (text.trim() === '') {
    return options.allowEmpty ? { ok: true, value: {}, empty: true } : { ok: false };
  }
  try {
    return { ok: true, value: JSON.parse(text), empty: false };
  } catch {
    return { ok: false };
  }
}
