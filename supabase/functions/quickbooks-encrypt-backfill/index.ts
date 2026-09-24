/**
 * One-off backfill: encrypt QuickBooks OAuth tokens stored before US-345.
 *
 * Rows written by quickbooks-callback / quickbooks-sync before this release
 * hold access_token / refresh_token in plain text and nothing in the
 * *_encrypted columns. This encrypts them with the same helper those functions
 * now use and records how many rows it touched, in the response and in the
 * audit log (action quickbooks_tokens.backfill_encrypted).
 *
 * Internal only: call it with the service-role bearer or x-cron-secret, e.g.
 *   curl -X POST "$SUPABASE_URL/functions/v1/quickbooks-encrypt-backfill" \
 *     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
 * It is idempotent; run it again until `remaining` is 0. That zero is the gate
 * for release N+1 (stop writing plaintext, NULL the plaintext columns).
 *
 * The plaintext columns are left in place on purpose: release N still
 * dual-writes them so the previous edge-function version keeps working on a
 * rollback.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { requireInternalCaller } from '../_shared/internal-only.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
import { encryptSecret, getQuickBooksTokenKey } from '../_shared/quickbooks-token-crypto.ts';
import { captureException } from '../_shared/observability.ts';

const BATCH = 200;

function json(
  body: { success: boolean; data?: unknown; error?: string },
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify({
    success: body.success,
    data: body.data,
    error: body.error,
    timestamp: new Date().toISOString(),
  }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // verify_jwt = true is satisfied by the publishable anon key; this is the
  // real gate (US-241).
  const denied = requireInternalCaller(req);
  if (denied) return denied;

  try {
    const key = getQuickBooksTokenKey();
    const service = createServiceClient();

    // Rows with plaintext and no ciphertext at all. Every writer since this
    // release sets both *_encrypted columns together, so "both null" is the
    // set the backfill owns.
    const { data: rows, error } = await service
      .from('quickbooks_integrations')
      .select('id, company_id, access_token, refresh_token')
      .is('access_token_encrypted', null)
      .is('refresh_token_encrypted', null)
      .or('access_token.not.is.null,refresh_token.not.is.null')
      .limit(BATCH);

    if (error) throw new Error(`could not list plaintext rows: ${error.message}`);

    let encrypted = 0;
    let skipped = 0;
    const failed: string[] = [];

    for (const row of rows ?? []) {
      try {
        const update: Record<string, string> = {};
        if (row.access_token) update.access_token_encrypted = await encryptSecret(row.access_token, key);
        if (row.refresh_token) update.refresh_token_encrypted = await encryptSecret(row.refresh_token, key);

        // Guarded on the ciphertext still being empty: if quickbooks-sync
        // refreshed the pair between the select and here, it already wrote
        // fresh ciphertext and this (now stale) value must not replace it.
        const { data: written, error: writeError } = await service
          .from('quickbooks_integrations')
          .update(update)
          .eq('id', row.id)
          .is('access_token_encrypted', null)
          .is('refresh_token_encrypted', null)
          .select('id');

        if (writeError) throw new Error(writeError.message);
        if ((written ?? []).length === 1) encrypted++;
        else skipped++;
      } catch (rowError) {
        console.error('[quickbooks-encrypt-backfill] row not encrypted', {
          id: row.id,
          error: rowError instanceof Error ? rowError.message : String(rowError),
        });
        failed.push(row.id);
      }
    }

    const { count: remaining, error: countError } = await service
      .from('quickbooks_integrations')
      .select('id', { count: 'exact', head: true })
      .is('access_token_encrypted', null)
      .is('refresh_token_encrypted', null)
      .or('access_token.not.is.null,refresh_token.not.is.null');

    if (countError) throw new Error(`could not count remaining rows: ${countError.message}`);

    const result = {
      candidates: (rows ?? []).length,
      encrypted,
      skipped_concurrent_write: skipped,
      failed: failed.length,
      failed_ids: failed,
      remaining: remaining ?? null,
    };

    await writeAuditLog(service, {
      action: 'quickbooks_tokens.backfill_encrypted',
      entityType: 'quickbooks_integrations',
      after: result,
      description: `Encrypted QuickBooks OAuth tokens on ${encrypted} integration row(s); ${remaining ?? '?'} remaining`,
      riskLevel: 'high',
    });

    console.log('[quickbooks-encrypt-backfill] done', result);
    return json({ success: failed.length === 0, data: result }, failed.length === 0 ? 200 : 500, corsHeaders);
  } catch (err) {
    await captureException(err, { fn: 'quickbooks-encrypt-backfill', req });
    const message = err instanceof Error ? err.message : String(err);
    console.error('[quickbooks-encrypt-backfill] failed', message);
    return json({ success: false, error: message }, 500, corsHeaders);
  }
});
