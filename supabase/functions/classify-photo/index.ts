/**
 * classify-photo: tag job-site photos (US-046, delivered through US-330).
 *
 * The web daily report calls this without awaiting it, right after it inserts
 * photo_attachments rows. It reads the rows with the CALLER's client, so RLS
 * decides which photos they may classify (their company's), signs a
 * five-minute URL for each image with that same client, asks a vision model to
 * pick tags from a fixed vocabulary (tags.ts), and writes ai_tags,
 * ai_confidence and ai_classified_at back. The project Photos tab (US-107's
 * timeline) reads and searches those tags.
 *
 * A photo the model could not read is left with ai_classified_at NULL, so it
 * stays in idx_photo_attachments_unclassified and a later call picks it up.
 * Recording "classified, no tags" for a failed call would hide it for good.
 *
 * Request:  { photo_ids: uuid[] }  (1 to 10)
 * Response: { success, data: { classified, unreadable, skipped }, timestamp }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { initializeAuthContext, errorResponse, successResponse, safeErrorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { enforceRateLimit, RATE_LIMITS } from '../_shared/rate-limiter.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { captureException } from '../_shared/observability.ts';
import { CLASSIFY_PROMPT, parseClassification } from './tags.ts';

// New endpoint, so no shipped client depends on a looser shape: the schema is
// enforced whatever INPUT_VALIDATION_MODE says.
const ClassifyPhotoSchema = z.object({
  photo_ids: z.array(z.string().uuid()).min(1).max(10),
});

const SIGNED_URL_SECONDS = 300;
const VISION_MODEL = 'gpt-4o-mini';

async function classifyImage(imageUrl: string, apiKey: string): Promise<string | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 150,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: CLASSIFY_PROMPT },
          // detail: low is a fixed small token cost per image, and tagging a
          // trade or phase does not need the full-resolution read.
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      }],
    }),
  });
  if (!response.ok) {
    console.error('[classify-photo] model call failed', response.status);
    return null;
  }
  const json = await response.json();
  return json?.choices?.[0]?.message?.content ?? null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authContext = await initializeAuthContext(req);
    if (!authContext) return errorResponse('Unauthorized', 401, req);
    const { user, supabase } = authContext;

    // Each photo is a paid model call. Keyed on the user, never on the body.
    const limited = await enforceRateLimit(createServiceClient(), user.id, 'classify-photo', RATE_LIMITS.AI, corsHeaders);
    if (limited) return limited;

    const parsed = await validateBody(req, ClassifyPhotoSchema, { name: 'classify-photo' });
    if (!parsed.ok) return parsed.response;
    if (!parsed.valid) return errorResponse('photo_ids must be 1 to 10 photo ids', 400, req);
    const { photo_ids } = parsed.data;

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      // Honest about it: the photos stay unclassified and are picked up once
      // the key is set, rather than being marked done with no tags.
      return errorResponse('Photo classification is not configured', 503, req);
    }

    // The caller's client: RLS limits this to photos in their company.
    const { data: rows, error: readError } = await supabase
      .from('photo_attachments')
      .select('id, file_path, storage_bucket')
      .in('id', photo_ids)
      .is('ai_classified_at', null);
    if (readError) {
      console.error('[classify-photo] read failed', readError);
      return safeErrorResponse(req);
    }

    let classified = 0;
    let unreadable = 0;
    for (const row of rows ?? []) {
      const { data: signed, error: signError } = await supabase.storage
        .from(row.storage_bucket || 'project-documents')
        .createSignedUrl(row.file_path, SIGNED_URL_SECONDS);
      if (signError || !signed?.signedUrl) {
        console.error('[classify-photo] could not sign', row.id, signError?.message);
        unreadable++;
        continue;
      }

      const result = parseClassification(await classifyImage(signed.signedUrl, apiKey));
      if (!result) {
        unreadable++;
        continue;
      }

      const { data: updated, error: writeError } = await supabase
        .from('photo_attachments')
        .update({
          ai_tags: result.tags,
          ai_confidence: result.confidence,
          ai_classified_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .select('id');
      if (writeError || !updated || updated.length === 0) {
        console.error('[classify-photo] tags not written', row.id, writeError?.message);
        unreadable++;
        continue;
      }
      classified++;
    }

    return successResponse({
      classified,
      unreadable,
      // Not the caller's, already classified, or no such photo.
      skipped: photo_ids.length - (rows?.length ?? 0),
    }, req);
  } catch (error) {
    await captureException(error, { fn: 'classify-photo', req });
    console.error('[classify-photo] unexpected error', error);
    return safeErrorResponse(req);
  }
});
