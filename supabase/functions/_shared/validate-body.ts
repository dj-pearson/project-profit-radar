/**
 * Request-body validation for edge functions (US-241).
 *
 * CLAUDE.md's Security rule 2 says validate every input with Zod. Its
 * Backward Compatibility section says tightening an input schema is a
 * never-in-one-release change, because a client at MIN_SUPPORTED_IOS_VERSION
 * that sends a shape the new schema rejects starts getting 400s with no way to
 * update. Adding validation where there was none is exactly that tightening.
 *
 * So validation lands in two stages, switched by the INPUT_VALIDATION_MODE
 * secret on the Supabase project:
 *
 *   report  (default) — parse, and on failure log a structured line and hand
 *                       the handler the RAW body. Behaviour is unchanged; the
 *                       logs tell you which schemas real traffic trips.
 *   enforce           — parse, and on failure return 400 with the standard
 *                       { success:false, error, timestamp } envelope.
 *
 * Rollout: ship schemas in report mode, watch `[input-validation]` lines for a
 * full release cycle, fix the schemas that legitimate clients trip, then set
 * INPUT_VALIDATION_MODE=enforce. Flipping it needs no code change.
 *
 * Usage:
 *
 *   const parsed = await validateBody(req, MySchema);
 *   if (!parsed.ok) return parsed.response;
 *   const { project_id } = parsed.data;
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { errorResponse } from "./auth-helpers.ts";
import { parseJsonBodyText } from "./parse-json-body.ts";

export type ValidationMode = "report" | "enforce";

export function getValidationMode(): ValidationMode {
  return Deno.env.get("INPUT_VALIDATION_MODE") === "enforce" ? "enforce" : "report";
}

export type ValidatedBody<T> =
  | { ok: true; data: T; valid: boolean }
  | { ok: false; response: Response };

/** Compact, non-sensitive summary of what failed — field paths and codes only. */
function describe(error: z.ZodError): string {
  return error.errors
    .map((e) => `${e.path.join(".") || "<root>"}: ${e.message}`)
    .join("; ");
}

/**
 * Read and validate a JSON request body.
 *
 * A body that is not JSON at all is rejected in both modes — that is a
 * malformed request, not a schema tightening, and the handler could not have
 * done anything with it either.
 *
 * `allowEmpty: true` treats a missing (empty or whitespace-only) body as {}
 * and runs it through the schema. Opt in only where a live caller sends no
 * body at all; the iOS app calls data-subject-delete that way. It does not
 * relax anything else: a body that is present but not JSON is still a 400.
 */
export async function validateBody<T>(
  req: Request,
  schema: z.ZodType<T>,
  options: { name?: string; allowEmpty?: boolean } = {},
): Promise<ValidatedBody<T>> {
  const label = options.name ?? new URL(req.url).pathname;

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: errorResponse("Request body must be valid JSON", 400, req) };
  }
  const body = parseJsonBodyText(text, { allowEmpty: options.allowEmpty });
  if (!body.ok) {
    return { ok: false, response: errorResponse("Request body must be valid JSON", 400, req) };
  }
  const raw: unknown = body.value;

  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data, valid: true };
  }

  const detail = describe(result.error);

  if (getValidationMode() === "enforce") {
    return { ok: false, response: errorResponse(`Validation failed: ${detail}`, 400, req) };
  }

  // Report mode: record it and let the request through unchanged.
  console.error(`[input-validation] ${label} would reject: ${detail}`);
  return { ok: true, data: raw as T, valid: false };
}
