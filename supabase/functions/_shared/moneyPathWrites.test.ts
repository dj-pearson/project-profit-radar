import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-300, edge functions. Twenty-one writes in the payment, billing and MFA
 * paths discarded their result. supabase-js returns the error rather than
 * throwing it, so each one ran, failed, and let the handler carry on as if it
 * had worked.
 *
 * These are the ones where that costs money or access:
 *
 *   stripe-webhook            the webhook_events row IS the idempotency guard
 *   usage-billing             marking records billed is what stops double billing
 *   failed-payment-recovery   suspend, advance dunning, resolve on payment
 *   send-payment-reminder     marking a reminder sent is what stops it resending
 *   verify-mfa-login          consuming a backup code is what makes it single-use
 *
 * Read the tree rather than run it: these are Deno modules with remote imports.
 * The behaviour they encode is argued in the comments at each site.
 */

const F = (name: string) => `supabase/functions/${name}/index.ts`;

/** Comment lines stripped, so a file documenting the old shape is not using it. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

describe('stripe-webhook idempotency', () => {
  const src = code(F('stripe-webhook'));

  it('refuses the event when the guard row cannot be written', () => {
    // Stripe retries for up to three days. A delayed charge is recoverable in a
    // way that a duplicate one is not.
    // The destructure specifically: `recordError` also appears in the check
    // below, so asserting the bare name passes even when the error is dropped
    // again. Mutation-testing this file is what surfaced that.
    expect(src).toMatch(/const \{ error: recordError \} = await supabaseClient/);
    expect(src).toMatch(/status: 500/);
  });

  it('treats a unique violation as the guard working, not a failure', () => {
    // 23505 means a concurrent delivery of the same event won the race.
    expect(src).toContain('"23505"');
  });

  it('does not make Stripe retry when the work already happened', () => {
    // Marking processed=true failing is an inconsistency, not a reason to
    // reprocess. It is logged instead.
    expect(src).toContain('markError');
    expect(src).toContain('PROCESSED BUT NOT RECORDED');
  });

  it('fails the event when a lost dispute produces no chargeback fee', () => {
    expect(src).toContain('feeError');
  });
});

describe('billing writes that would charge twice', () => {
  it('usage-billing throws when the records stay unbilled after invoicing', () => {
    const src = code(F('usage-billing'));
    expect(src).toContain('markBilledError');
    expect(src).toContain('will be invoiced again');
  });

  it('send-payment-reminder throws when a sent reminder is not marked sent', () => {
    const src = code(F('send-payment-reminder'));
    expect(src).toContain('markSentError');
    expect(src).toContain('will send again');
  });

  it('billing-automation throws when a rule runs but its schedule does not advance', () => {
    const src = code(F('billing-automation'));
    expect(src).toContain('runCountError');
    expect(src).toContain('scheduleError');
  });
});

describe('dunning', () => {
  const src = code(F('failed-payment-recovery'));

  it.each([
    ['suspendError', 'suspending an account after max retries'],
    ['advanceError', 'advancing the attempt counter'],
    ['resolveError', 'resolving the failure after payment'],
  ])('%s is read (%s)', (marker) => {
    expect(src).toContain(marker);
  });

  it('says what the consequence is rather than just failing', () => {
    expect(src).toContain('this retry will repeat');
    expect(src).toContain('still open in dunning');
  });
});

describe('verify-mfa-login', () => {
  const src = code(F('verify-mfa-login'));

  it('refuses the sign-in when the backup code cannot be consumed', () => {
    // A backup code that stays valid after use is not a backup code.
    expect(src).toMatch(/const \{ error: consumeError \} = await supabaseClient/);
    expect(src).toContain('mfa_backup_code_consume_failed');
    // Bounded to the block that handles it: an unbounded slice reaches later
    // 500s elsewhere in the file and passes even when this one is removed.
    const start = src.indexOf('if (consumeError) {');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, start + 600);
    expect(block).toMatch(/createErrorResponse\(500/);
  });

  it('calls increment_mfa_uses with the parameter name the function declares', () => {
    // It was called as { device_id: userId }: wrong parameter name (the function
    // declares p_device_id), wrong value (the user id, not the device id), and
    // the builder was assigned into an update payload instead of awaited, so it
    // never ran and total_uses received a serialised object.
    expect(src).toContain('p_device_id: device.id');
    expect(src).not.toMatch(/total_uses:\s*supabaseClient\.rpc/);
  });

  it('and awaits it rather than embedding it in the update', () => {
    expect(src).toMatch(/await supabaseClient\.rpc\("increment_mfa_uses"/);
  });
});

describe('the audit trails that were being lost', () => {
  it('a complimentary grant is not recorded silently', () => {
    const src = code(F('manage-complimentary-subscription'));
    expect(src).toContain('historyError');
    expect(src).toContain('revokeHistoryError');
  });
});

describe('the second edge batch: email, referrals and accounting sync', () => {
  it('send-scheduled-emails stops an unsubscribed recipient being requeued', () => {
    // The cancel failing left the row pending, and the next run emailed the
    // person who had unsubscribed - the one outcome an unsubscribe prevents.
    const src = code(F('send-scheduled-emails'));
    expect(src).toContain('cancelError');
    expect(src).toContain('Unsubscribed recipient still queued');
    expect(src).toContain('Opted-out recipient still queued');
  });

  it('and does not lose the send record into a retry that emails twice', () => {
    // `const { data: emailSend }` with emailSend.id read below meant a failed
    // insert threw a TypeError into the catch, which marked the row pending and
    // resent. The queue row is now marked sent first.
    const src = code(F('send-scheduled-emails'));
    expect(src).toMatch(/const \{ data: emailSend, error: sendRecordError \} = await supabaseClient/);
    expect(src).toContain('SENT BUT NOT RECORDED');
    expect(src).toContain('SENT BUT STILL QUEUED');
  });

  it('process-referral-signup will not grant the same reward twice', () => {
    // Marking the referral rewarded is what stops a rerun re-inserting the
    // reward rows.
    const src = code(F('process-referral-signup'));
    expect(src).toMatch(/const \{ error: rewardedError \} = await supabaseClient/);
    expect(src).toContain('a rerun would grant them again');
  });

  it('and does not report success when a reward was never granted', () => {
    const src = code(F('process-referral-signup'));
    expect(src).toContain('referrerRewardError');
    expect(src).toContain('refereeRewardError');
  });

  it('quickbooks-sync fails loudly when refreshed tokens are not saved', () => {
    // Intuit rotates the refresh token and invalidates the old one, so losing
    // the write breaks the integration on the next run.
    const src = code(F('quickbooks-sync'));
    expect(src).toMatch(/const \{ error: tokenError \} = await supabaseClient/);
    expect(src).toContain('invalidated refresh token');
  });

  it('and its record upserts count only what they actually wrote', () => {
    // recordsProcessed is incremented per row by the caller, so a discarded
    // upsert error reported an import that wrote nothing - the exact silent
    // truncation records_fetched vs records_processed exists to expose.
    const src = code(F('quickbooks-sync'));
    for (const table of ['quickbooks_customers', 'quickbooks_items', 'quickbooks_expenses', 'quickbooks_payments']) {
      expect(src, `${table} upsert still discards its error`).toContain(`${table} upsert failed`);
    }
    expect(src).not.toMatch(/^\s*await supabaseClient\s*\n\s*\.from\('quickbooks_(customers|items|expenses|payments)'\)/m);
  });

  it('and refuses to run without a sync log to record it', () => {
    const src = code(F('quickbooks-sync'));
    expect(src).toMatch(/const \{ data: syncLog, error: syncLogError \} = await supabaseClient/);
    expect(src).toContain('leave no record');
  });
});

describe('the third edge batch: oauth tokens, telephony and workflows', () => {
  it('analytics-oauth-google does not tell a user their Google tokens were cleared when they were not', () => {
    // Press Disconnect, be told it worked, and have a live access token and
    // refresh token still sitting in analytics_platform_connections.
    const src = code(F('analytics-oauth-google'));
    expect(src).toMatch(/const \{ error: disconnectError \} = await supabaseClient/);
    expect(src).toContain('stored Google tokens were NOT cleared');
  });

  it('and stores a refreshed access token or says the refresh did not stick', () => {
    const src = code(F('analytics-oauth-google'));
    expect(src).toMatch(/const \{ error: refreshError \} = await supabaseClient/);
  });

  it('webhook-delivery keeps the failure count that drives its own auto-disable', () => {
    // failure_count >= 10 is what disables a dead endpoint. A dropped error
    // meant the count never climbed and the endpoint was hammered forever.
    const src = code(F('webhook-delivery'));
    expect(src).toMatch(/const \{ error: statsError \} = await supabaseClient/);
    expect(src).toContain('did not advance toward the auto-disable threshold');
  });

  it('and only logs the auto-disable after the write that performs it', () => {
    // The log line used to run before the update, announcing a disable that
    // had not happened.
    const src = code(F('webhook-delivery'));
    const logIndex = src.indexOf('Auto-disabled endpoint after 10 failures');
    const guardIndex = src.indexOf('statsError');
    expect(logIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(logIndex).toBeGreaterThan(guardIndex);
    expect(src).toContain('if (updates.is_active === false)');
  });

  it('and does not re-send a webhook whose delivery was already recorded', () => {
    const src = code(F('webhook-delivery'));
    expect(src).toMatch(/const \{ error: deliveryError \} = await supabaseClient/);
    expect(src).toContain('so it may be re-sent');
  });

  it('and one failed bookkeeping write does not abandon the rest of the batch', () => {
    const src = code(F('webhook-delivery'));
    expect(src).toContain('bookkeepingError');
    expect(src).toContain('deliveryResult.bookkeeping_error');
  });

  it('api-management keeps the delivery log that proves a webhook was sent', () => {
    const src = code(F('api-management'));
    expect(src).toMatch(/const \{ error: logError \} = await supabase/);
    expect(src).toContain('was DELIVERED but not logged');
    expect(src).toMatch(/const \{ error: failureLogError \} = await supabase/);
  });

  it('and its success/failure tracking reads its error on both branches', () => {
    // The two branches were separate discarded awaits inside an if/else; they
    // are now one destructured result so neither can be dropped.
    const src = code(F('api-management'));
    expect(src).toMatch(/const \{ error: trackingError \} = response\.ok/);
    expect(src).toContain('auto-disable will not advance');
  });

  it('twilio-calling does not strand a call at its old status after Twilio reports it ended', () => {
    const src = code(F('twilio-calling'));
    expect(src).toMatch(/const \{ error: statusUpdateError \} = await supabaseClient/);
    expect(src).toContain('was fetched from Twilio but NOT stored');
  });

  it('and lets Twilio retry the recording callback instead of orphaning the recording', () => {
    const src = code(F('twilio-calling'));
    expect(src).toMatch(/const \{ error: recordingError \} = await supabaseClient/);
    expect(src).toContain('could not be attached to call');
  });

  it('and stops claiming a transcription that no service produced', () => {
    // It wrote transcription_status "completed" with the body "Transcription
    // feature coming soon" and answered success: true.
    const src = code(F('twilio-calling'));
    expect(src).not.toContain('Transcription feature coming soon');
    expect(src).not.toContain('Transcription initiated');
    expect(src).toContain('no speech-to-text service is configured');
    expect(src).toMatch(/transcription_status: "failed"/);
  });

  it('execute-workflow does not leave a finished run reading as running', () => {
    const src = code(F('execute-workflow'));
    expect(src).toMatch(/const \{ error: completeError \} = await supabase/);
    expect(src).toContain('could NOT be marked completed');
  });

  it('and reports when a failed run could not be marked failed', () => {
    const src = code(F('execute-workflow'));
    expect(src).toMatch(/const \{ error: markFailedError \} = await supabase/);
    expect(src).toContain("is STRANDED at 'running'");
    expect(src).toMatch(/const \{ error: failUpdateError \} = await supabase/);
    expect(src).toMatch(/const \{ error: progressError \} = await supabase/);
    expect(src).toMatch(/const \{ error: stepUpdateError \} = await supabase/);
  });

  it('workflow-execution does not let its response disagree with the stored status', () => {
    // It answered `status: finalStatus` from a variable while the row it
    // failed to update still said 'running'.
    const src = code(F('workflow-execution'));
    expect(src).toMatch(/const \{ error: executionUpdateError \} = await supabase/);
    expect(src).toContain('but that was NOT recorded');
    expect(src).toMatch(/const \{ error: lastExecutedError \} = await supabase/);
  });

  it('quickbooks-callback records that a company connected', () => {
    const src = code(F('quickbooks-callback'));
    expect(src).toMatch(/const \{ error: connectionLogError \} = await supabaseClient/);
    expect(src).toContain('CONNECTED but the event was not logged');
  });
});
