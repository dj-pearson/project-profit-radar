import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

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

describe('the fourth edge batch: queues that resend when their bookkeeping is lost', () => {
  it('process-funnel-queue claims an item atomically instead of hoping the status stuck', () => {
    // A plain `update({ status: "sending" })` with its error discarded left the
    // row at "scheduled", so the next cron run emailed the same subscriber
    // again. Matching on the old status makes the claim atomic.
    const src = code(F('process-funnel-queue'));
    // The status guard has to be on the claim itself. The fetch query above it
    // also filters on scheduled, so a bare toContain would pass with the claim
    // unguarded.
    expect(src).toMatch(
      /const \{ data: claimed, error: claimError \} = await supabase\s*\n\s*\.from\("funnel_email_queue"\)\s*\n\s*\.update\(\{ status: "sending" \}\)\s*\n\s*\.eq\("id", item\.id\)\s*\n\s*\.eq\("status", "scheduled"\)\s*\n\s*\.select\("id"\);/,
    );
    expect(src).toContain('already claimed by another run');
  });

  it('and never throws after the email has been sent', () => {
    // The catch marks the item failed, and a failed item is retried, so any
    // throw below the send resends to a real person.
    const src = code(F('process-funnel-queue'));
    const sendIndex = src.indexOf('resend.emails.send');
    const tail = src.slice(sendIndex);
    expect(sendIndex).toBeGreaterThan(-1);
    for (const name of [
      'markSentError',
      'subscriberError',
      'sentAnalyticsError',
      'nextQueueError',
      'completedError',
    ]) {
      expect(tail, `${name} is not handled after the send`).toContain(name);
    }
    // Nothing between the send and the end of the loop body raises.
    const loopTail = tail.slice(0, tail.indexOf('} catch (emailError)'));
    expect(loopTail).not.toContain('throw ');
  });

  it('and reports a subscriber dropped out of the funnel rather than losing them quietly', () => {
    const src = code(F('process-funnel-queue'));
    expect(src).toContain('DROPPED OUT of the funnel');
    expect(src).toContain('SENT BUT STILL MARKED sending');
    expect(src).toContain('bookkeeping_failures');
  });

  it('and counts what it sent, not what it fetched', () => {
    // `processed: queueItems?.length` counted skipped and failed items as
    // processed.
    const src = code(F('process-funnel-queue'));
    expect(src).toContain('processed: sent');
    expect(src).toContain('fetched: queueItems?.length || 0');
    expect(src).not.toMatch(/processed: queueItems\?\.length/);
  });

  it('process-behavioral-triggers stops reporting success for actions that wrote nothing', () => {
    // executeEmailAction, executeModalAction and executeNotificationAction each
    // discarded their insert error and returned a hardcoded success: true, so
    // the trigger recorded 'completed' having done nothing to the user.
    const src = code(F('process-behavioral-triggers'));
    expect(src).toMatch(/const \{ error: queueError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ error: modalError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ error: notificationError \} = await supabaseClient/);
    expect(src).toContain('Email was not queued for');
    expect(src).toContain('Modal was not queued for user');
    expect(src).toContain('Notification was not stored for user');
  });

  it('and keeps the history row that stops a rule firing at the same user twice', () => {
    const src = code(F('process-behavioral-triggers'));
    expect(src).toMatch(/const \{ error: historyError \} = await supabaseClient/);
    expect(src).toContain('so it may fire again');
    expect(src).toMatch(/const \{ error: executionUpdateError \} = await supabaseClient/);
  });

  it('enhanced-blog-ai does not pay for the same article twice', () => {
    const src = code(F('enhanced-blog-ai'));
    expect(src).toMatch(/const \{ data: claimed, error: claimError \} = await supabaseClient/);
    expect(src).toContain(".neq('status', 'processing')");
    expect(src).toContain('was GENERATED but the item was not marked completed');
  });

  it('and keeps the topic history its own diversity check reads back', () => {
    // generateDiverseTopic queries blog_topic_history to avoid repeating a
    // topic inside minimum_topic_gap_days. A lost row defeats exactly that.
    const src = code(F('enhanced-blog-ai'));
    expect(src).toMatch(/const \{ error: topicHistoryError \} = await supabaseClient/);
    expect(src).toContain('diversity checks will not see it');
    expect(src).toMatch(/const \{ error: analysisError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ error: markFailedError \} = await supabaseClient/);
  });
});

describe('the fifth edge batch: single-use auth state and the marketing record of a lead', () => {
  it('sso-oauth-callback refuses the sign-in when it cannot consume the state', () => {
    // The oauth_pending_states row is the single-use CSRF token for the
    // callback. Deleting it is what stops the same state being presented again
    // before expires_at, and the delete discarded its error.
    const src = code(F('sso-oauth-callback'));
    expect(src).toMatch(
      /const \{ error: stateDeleteError \} = await supabaseClient\s*\n\s*\.from\("oauth_pending_states"\)\s*\n\s*\.delete\(\)\s*\n\s*\.eq\("state", state\);/,
    );
    expect(src).toContain('error=state_not_consumed');
    expect(src).toContain('oauth_state_not_consumed');
  });

  it('and says so when a session it cannot revoke was created', () => {
    // An unrecorded session does not appear in the admin session list, so
    // revocation has nothing to act on. Logged rather than failed: auth has
    // already succeeded by then.
    const src = code(F('sso-oauth-callback'));
    expect(src).toMatch(/const \{ error: sessionRecordError \} = await supabaseClient/);
    expect(src).toContain('SIGNED IN but the session was not recorded');
    expect(src).toMatch(/const \{ error: expiredDeleteError \} = await supabaseClient/);
  });

  it('capture-lead reports a conversion that never reached the funnel', () => {
    const src = code(F('capture-lead'));
    expect(src).toMatch(/const \{ error: activityError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ error: conversionError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ error: attributionError \} = await supabaseClient/);
    expect(src).toContain('First-touch attribution LOST for a new lead');
  });

  it('handle-demo-request and handle-sales-contact do the same', () => {
    for (const fn of ['handle-demo-request', 'handle-sales-contact']) {
      const src = code(F(fn));
      expect(src, `${fn} activity`).toMatch(/const \{ error: activityError \} = await supabaseClient/);
      expect(src, `${fn} conversion`).toMatch(/const \{ error: conversionError \} = await supabaseClient/);
      expect(src, `${fn} marker`).toContain('but the conversion event was not recorded');
    }
  });

  it('crm-email-automation does not log a campaign step it failed to queue', () => {
    // The insert is the next step of the drip sequence; the logStep below it
    // announced the scheduling regardless.
    const src = code(F('crm-email-automation'));
    expect(src).toMatch(/const \{ error: queueStepError \} = await supabase/);
    const throwIndex = src.indexOf('so the sequence stops here');
    const logIndex = src.indexOf("logStep('Scheduled campaign email'");
    expect(throwIndex).toBeGreaterThan(-1);
    expect(logIndex).toBeGreaterThan(throwIndex);
  });

  it('and keeps the CRM timeline entry a rep reads before following up', () => {
    const src = code(F('crm-email-automation'));
    expect(src).toMatch(/const \{ error: activityError \} = await supabase/);
    expect(src).toContain('QUEUED but not shown on the CRM timeline');
    expect(src).toMatch(/const \{ error: completedError \} = await supabase/);
  });

  it('calculate-lead-score will not report a promotion the row did not get', () => {
    // It answered the new quality from a local variable while the leads row
    // kept the old one, and routing and alerts read the row.
    const src = code(F('calculate-lead-score'));
    expect(src).toMatch(/const \{ error: qualityError \} = await supabaseClient/);
    expect(src).toContain('but the new quality was NOT stored');
  });

  it('ml-lead-scoring records its scoring activity or says it did not', () => {
    const src = code(F('ml-lead-scoring'));
    expect(src).toMatch(/const \{ error: activityError \} = await supabase\.from\('crm_activities'\)/);
    expect(src).toContain('the scoring activity was not recorded');
  });
});

describe('the sixth edge batch: CRUD that lied, and a raw() that never worked', () => {
  it('manage-alert-rules does not say "deleted" for a rule that keeps firing', () => {
    // Every branch answered success: true without reading the error, so a
    // rejected delete came back as "Alert rule deleted".
    const src = code(F('manage-alert-rules'));
    expect(src).toMatch(/const \{ data: deleted, error: deleteError \} = await supabaseClient/);
    expect(src).toContain('was NOT deleted and will keep firing');
    expect(src).toMatch(/const \{ data: created, error: createError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ data: updated, error: updateError \} = await supabaseClient/);
  });

  it('and distinguishes a deleted rule from an id that matched nothing', () => {
    const src = code(F('manage-alert-rules'));
    expect(src).toContain("'No alert rule matched that id'");
    expect(src).toContain('deleted: deleted?.length ?? 0');
  });

  it('manage-schedules does the same for schedules that keep running audits', () => {
    const src = code(F('manage-schedules'));
    expect(src).toMatch(/const \{ data: deleted, error: deleteError \} = await supabaseClient/);
    expect(src).toContain('was NOT deleted and will keep running audits');
    expect(src).toMatch(/const \{ data: created, error: createError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ data: updated, error: updateError \} = await supabaseClient/);
    expect(src).toContain("'No schedule matched that id'");
  });

  it('quickbooks-route-transactions increments its match counter through an RPC', () => {
    // `.update({ matches_count: supabase.raw('matches_count + 1') })` threw a
    // TypeError on every matched transaction - supabase-js has no `raw` - so
    // the catch swallowed the routing-history write and both counters, and the
    // batch reported "0 auto-assigned, 0 need review" for work it had done.
    const src = code(F('quickbooks-route-transactions'));
    expect(src).toMatch(/\.rpc\('increment_routing_rule_match', \{ p_rule_id: bestMatch\.rule_id \}\)/);
    expect(src).not.toMatch(/supabase\.raw\s*\(/);
    expect(src).toMatch(/const \{ error: routeError \} = await supabase/);
    expect(src).toMatch(/const \{ error: historyError \} = await supabase/);
  });

  it('and that RPC is created by a migration with a tenancy check', () => {
    const sql = readFileSync(
      'supabase/migrations/20260827130000_routing_rule_match_counter.sql',
      'utf8',
    );
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.increment_routing_rule_match');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain('public.user_in_company(v_company_id)');
    expect(sql).toContain('COALESCE(matches_count, 0) + 1');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.increment_routing_rule_match(uuid) FROM PUBLIC');
  });

  it('and nothing in the repo calls .raw() on a supabase client any more', () => {
    // The same mistake shipped twice (calculatorAnalytics.trackReferral under
    // US-303, this function under US-300), so it has its own guard now.
    // Assert the invariant itself rather than the guard's wording: run the
    // guard and require a clean exit.
    const result = spawnSync('node', ['scripts/check-supabase-raw.mjs'], { encoding: 'utf8' });
    expect(result.stdout + result.stderr).not.toMatch(/\.raw\(\.\.\.\)/);
    expect(result.status).toBe(0);
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain('check-supabase-raw.mjs');
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('check-supabase-raw.mjs');
  });
});

describe('the seventh edge batch: writes that gate their own scheduler', () => {
  it('api-auth says loudly when a request was not counted against its rate limit', () => {
    // api_request_logs is not only a log: checkRateLimits counts rows in it to
    // decide the per-minute, per-hour and per-day limits. A request that is not
    // recorded never counts against any of them, so a failing insert quietly
    // removes rate limiting while the API keeps answering 200.
    const src = code(F('api-auth'));
    expect(src).toMatch(/const \{ error: logError \} = await supabaseClient\s*\n\s*\.from\('api_request_logs'\)/);
    expect(src).toContain('RATE LIMIT NOT COUNTED');
    expect(src).toMatch(/const \{ error: lastUsedError \} = await supabaseClient/);
  });

  it('run-scheduled-audit refuses to leave a schedule permanently due', () => {
    // Schedules are selected with next_run_at <= now(). A lost update leaves it
    // in the past, so the URL is audited on every tick and the same alerts are
    // re-fired and re-emailed forever.
    const src = code(F('run-scheduled-audit'));
    expect(src).toMatch(/const \{ error: scheduleUpdateError \} = await supabaseClient/);
    expect(src).toContain('will re-run every tick');
    expect(src).toMatch(/const \{ error: alertError \} = await supabaseClient/);
    expect(src).toMatch(/const \{ error: executionLogError \} = await supabaseClient/);
  });

  it('social-post-scheduler will not post to a customer feed on every tick', () => {
    // Same shape, worse consequence: configs are picked with
    // next_post_at < now(), and the side effect is a public social post.
    const src = code(F('social-post-scheduler'));
    expect(src).toMatch(/const \{ error: nextPostError \} = await supabaseClient/);
    expect(src).toContain('would post again on every tick');
  });

  it('and records that a library item was used so it is not posted twice', () => {
    const src = code(F('social-post-scheduler'));
    expect(src).toMatch(/const \{ error: usageError \} = await supabaseClient/);
    expect(src).toContain('so it may be posted again');
    expect(src).toMatch(/const \{ error: markFailedError \} = await supabaseClient/);
  });

  it('analyze-support-ticket does not return suggestions it failed to store', () => {
    // The handler answered success: true with the suggestions inline while none
    // of them reached the database - and the agent who opens the ticket later
    // reads the database, not that response.
    const src = code(F('analyze-support-ticket'));
    expect(src).toMatch(/const \{ error: suggestionError \} = await supabase\.from\("support_suggestions"\)/);
    expect(src).toContain('suggestion(s) were not saved');
    // Collected across the loop rather than thrown per row, so one bad row does
    // not hide how many others failed.
    expect(src).toMatch(/failed\.push\(/);
    expect(src).toMatch(/of \$\{suggestions\.length\}/);
  });

  it('and does not leave a re-categorised ticket in the old queue', () => {
    const src = code(F('analyze-support-ticket'));
    expect(src).toMatch(/const \{ error: ticketUpdateError \} = await supabase/);
    expect(src).toContain('so it stays in the old queue');
    expect(src).toMatch(/const \{ error: contextError \} = await supabase/);
  });
});

describe('the eighth edge batch: two defaults, a stuck spinner, and a fake compressor', () => {
  it('sso-manage will not leave two connections flagged as the default provider', () => {
    // The "unset other defaults" update discarded its error, so a failed clear
    // followed by the insert left two is_default rows and login provider
    // selection became whatever the query returned first.
    const src = code(F('sso-manage'));
    const clears = src.match(/const \{ error: clearDefaultError \} = await supabase/g) || [];
    expect(clears.length, 'both the create and update paths must clear').toBe(2);
    expect(src).toContain('was not created as default');
    expect(src).toContain('was not promoted to default');
  });

  it('sync-calendar counts events it stored, not events it fetched', () => {
    const src = code(F('sync-calendar'));
    expect(src).toMatch(/const \{ error: eventError \} = await supabaseClient/);
    expect(src).toContain('events_synced: storedCount');
    expect(src).toContain('events_fetched: events.length');
    expect(src).not.toMatch(/events_synced: events\.length/);
  });

  it('and does not stamp a successful sync over a partial one', () => {
    // Advancing last_sync after a partial store is what makes the gap
    // permanent - the next run starts after the events that never landed.
    const src = code(F('sync-calendar'));
    expect(src).toContain('if (storeFailures.length === 0) {');
    expect(src).toContain('last_sync deliberately not advanced');
  });

  it('sync-analytics-data does not strand a connection at "syncing"', () => {
    const src = code(F('sync-analytics-data'));
    expect(src).toMatch(/const \{ error: syncResultError \} = await serviceClient/);
    expect(src).toContain("STUCK at 'syncing'");
    expect(src).toMatch(/const \{ error: syncingError \} = await serviceClient/);
  });

  it('and stores why a sync failed instead of the string "Sync failed"', () => {
    const src = code(F('sync-analytics-data'));
    expect(src).toContain('last_sync_error: syncErrorMessage');
    expect(src).not.toMatch(/last_sync_error: syncResult\.status === 'failed' \? 'Sync failed' : null/);
  });

  it('image-processor stops claiming a transcode it never performed', () => {
    // Every "responsive size" is the original blob re-uploaded under a .webp
    // name, and savings was imageBlob.size * 0.65 - a constant presented as a
    // measurement. The document was marked transcoding_status 'completed'.
    const src = code(F('image-processor'));
    expect(src).toContain("transcoding_status: 'pending'");
    expect(src).not.toContain("transcoding_status: 'completed'");
    expect(src).not.toContain('imageBlob.size * 0.65');
    expect(src).toContain('No compression has happened yet');
  });

  it('and reads the queue insert that is the only handoff to real processing', () => {
    // It was `.then(() => {}).catch(() => {})` under a comment claiming the
    // table might not exist. It does - migration 20251209000004 creates it -
    // and postgrest resolves with { error } rather than rejecting, so the
    // catch was dead code either way.
    const src = code(F('image-processor'));
    expect(src).toMatch(/const \{ error: queueError \} = await supabase/);
    expect(src).not.toMatch(/\.then\(\(\) => \{\}\)/);
    expect(src).toContain('no version of this image will ever be produced');
    expect(src).toMatch(/const \{ error: documentError \} = await supabase/);
  });

  it('generate-churn-predictions counts predictions it stored', () => {
    const src = code(F('generate-churn-predictions'));
    expect(src).toMatch(/const \{ error: predictionError \} = existingPrediction/);
    // The counter must be unreachable when the write failed.
    const guardIndex = src.indexOf('if (predictionError) {');
    const counterIndex = src.indexOf('predictionsGenerated++');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(counterIndex).toBeGreaterThan(guardIndex);
    expect(src.slice(guardIndex, counterIndex)).toContain('continue;');
  });

  it('schedule-trial-emails says a campaign failed to write rather than "not found"', () => {
    // A failed insert surfaced 12 lines later as "Campaign not found" from the
    // lookup, which reads like a configuration problem, and the trial user
    // silently lost that step of the sequence.
    const src = code(F('schedule-trial-emails'));
    expect(src).toMatch(/const \{ error: campaignError \} = await supabaseClient/);
    expect(src).toContain('was NOT created, so this email will be skipped below');
    expect(src).toMatch(/const \{ error: preferencesError \} = await supabaseClient/);
  });
});
