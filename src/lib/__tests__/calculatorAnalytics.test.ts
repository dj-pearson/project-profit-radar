import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-303. The public calculator funnel never worked, and every part of why it
 * did not is invisible to the type system:
 *
 *   - increment_lead_score and increment_session_calculations were called but
 *     defined by no migration. types.ts is empty (US-263), so the names
 *     typechecked.
 *   - The calculation insert passed the text session id into a uuid FK column,
 *     failing the cast, and nothing read the error (US-300).
 *   - The lead upsert asked for a RETURNING clause and an ON CONFLICT DO
 *     UPDATE, and anon holds neither the SELECT nor the UPDATE policy those
 *     need, so it always threw and the caller always got null.
 *   - The session flag updates hit no anon UPDATE policy at all and were
 *     filtered to zero rows with no error at all.
 *   - trackReferral built its update with supabase.raw(), which is not a method
 *     on the supabase-js v2 client.
 *
 * These cases drive the real module and assert what it puts on the wire. The
 * schema half - that the RPCs exist, are SECURITY DEFINER and actually move a
 * score - is enforced by scripts/check-rpc-definitions.mjs and was verified by
 * applying both migrations to Postgres 16 and running the visitor journey as
 * the anon role.
 */

const rpc = vi.fn();
const insert = vi.fn();
const from = vi.fn(() => ({ insert }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));

const SOURCE = 'src/lib/calculatorAnalytics.ts';
const SESSION = 'calc_1756000000000_abc123xyz';
const LEAD = '2f8c1d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f';

let analytics: typeof import('../calculatorAnalytics');
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  rpc.mockReset();
  insert.mockReset();
  from.mockClear();
  rpc.mockResolvedValue({ data: null, error: null });
  insert.mockResolvedValue({ data: null, error: null });
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  analytics = await import('../calculatorAnalytics');
});

afterEach(() => {
  errorSpy.mockRestore();
});

/** The single rpc() call whose first argument is `name`, or undefined. */
function rpcCall(name: string) {
  return rpc.mock.calls.find((c) => c[0] === name);
}

describe('trackCalculation', () => {
  it('stores the run through the RPC rather than inserting the text session id into a uuid FK', async () => {
    await analytics.trackCalculation(
      SESSION,
      { projectType: 'remodel', laborHours: 100, materialCost: 5000, crewSize: 3, projectDuration: 20 },
      { recommendedBid: 24000, profitMargin: 18.5, hourlyRate: 45, breakEvenAmount: 19000, riskScore: 4 },
    );

    const call = rpcCall('record_calculator_calculation');
    expect(call, 'record_calculator_calculation was not called').toBeDefined();
    expect(call?.[1]).toMatchObject({
      p_session_id: SESSION,
      p_project_type: 'remodel',
      p_labor_hours: 100,
      p_crew_size: 3,
      p_profit_margin: 18.5,
      p_risk_score: 4,
    });

    // The direct insert is the bug: calculator_calculations.session_id is a
    // uuid, so 'calc_...' fails the cast on every call.
    expect(from).not.toHaveBeenCalledWith('calculator_calculations');
  });

  it('reads the error instead of announcing a calculation that was never stored', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await analytics.trackCalculation(
      SESSION,
      { projectType: 'remodel', laborHours: 1, materialCost: 1, crewSize: 1, projectDuration: 1 },
      { riskScore: 1 },
    );
    expect(errorSpy).toHaveBeenCalledWith('Failed to track calculation:', 'boom');
  });
});

describe('trackEmailCapture', () => {
  it('returns the lead id the RPC hands back', async () => {
    rpc.mockResolvedValue({ data: LEAD, error: null });
    await expect(analytics.trackEmailCapture(SESSION, 'lead@example.com', 'Acme', '555-0100')).resolves.toBe(LEAD);

    const call = rpcCall('capture_calculator_lead');
    expect(call?.[1]).toMatchObject({
      p_session_id: SESSION,
      p_email: 'lead@example.com',
      p_company_name: 'Acme',
      p_phone: '555-0100',
    });
  });

  it('returns null and says so when the capture fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'nope' } });
    await expect(analytics.trackEmailCapture(SESSION, 'lead@example.com')).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Failed to track email capture:', 'nope');
  });

  it('does not treat a missing lead id as a successful capture', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(analytics.trackEmailCapture(SESSION, 'lead@example.com')).resolves.toBeNull();
  });
});

describe('scoring a lead', () => {
  const cases = [
    { label: 'pdf download', points: 5, flag: 'pdf_downloaded', run: (id: string) => analytics.trackPDFDownload(SESSION, id) },
    { label: 'social share', points: 8, flag: 'social_shared', run: (id: string) => analytics.trackSocialShare(SESSION, 'x', id) },
    { label: 'trial click', points: 20, flag: 'trial_clicked', run: (id: string) => analytics.trackTrialClick(SESSION, id) },
  ];

  it.each(cases)('$label awards $points points and flips $flag', async ({ run, points, flag }) => {
    await run(LEAD);

    expect(rpcCall('increment_lead_score')?.[1]).toEqual({ p_lead_id: LEAD, p_points: points });
    expect(rpcCall('record_calculator_session_event')?.[1]).toMatchObject({
      p_session_id: SESSION,
      p_event: flag,
    });
  });

  it('still records the funnel flag for a visitor who has not given an email', async () => {
    await analytics.trackTrialClick(SESSION);
    expect(rpcCall('record_calculator_session_event')).toBeDefined();
    expect(rpcCall('increment_lead_score')).toBeUndefined();
  });

  it('reads the scoring error rather than dropping it', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'no such function' } });
    await analytics.trackPDFDownload(SESSION, LEAD);
    expect(errorSpy).toHaveBeenCalledWith('Failed to score lead for pdf download:', 'no such function');
  });
});

describe('trackTimeOnPage', () => {
  it('records the dwell through the RPC, rounded to whole seconds', async () => {
    analytics.trackTimeOnPage(SESSION, 95.6);
    await vi.waitFor(() => expect(rpcCall('record_calculator_session_event')).toBeDefined());
    expect(rpcCall('record_calculator_session_event')?.[1]).toEqual({
      p_session_id: SESSION,
      p_event: 'time_on_page',
      p_seconds: 96,
    });
  });
});

describe('trackReferral', () => {
  it('increments the count through the RPC instead of supabase.raw', async () => {
    await analytics.trackReferral('referrer@example.com', 'friend@example.com');

    expect(from).toHaveBeenCalledWith('calculator_referrals');
    expect(rpcCall('increment_referral_count')?.[1]).toEqual({ p_referrer_email: 'referrer@example.com' });
  });

  it('does not try to increment when the referral row itself failed to insert', async () => {
    insert.mockResolvedValue({ data: null, error: { message: 'duplicate' } });
    await analytics.trackReferral('referrer@example.com', 'friend@example.com');

    expect(errorSpy).toHaveBeenCalledWith('Failed to track referral:', 'duplicate');
    expect(rpcCall('increment_referral_count')).toBeUndefined();
  });
});

describe('initializeSession', () => {
  it('reads the insert error, which supabase-js returns rather than throws', async () => {
    insert.mockResolvedValue({ data: null, error: { message: 'rls' } });
    await analytics.initializeSession(SESSION);
    expect(errorSpy).toHaveBeenCalledWith('Failed to initialize session:', 'rls');
  });
});

describe('the shapes that made this file lie', () => {
  const src = readFileSync(SOURCE, 'utf8');
  const code = src
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .join('\n');

  it('never chains .catch() onto a PostgrestBuilder', () => {
    // PostgrestBuilder implements PromiseLike: it has then() and no catch().
    // Calling .catch() on one raises a TypeError before the request is sent.
    expect(code).not.toMatch(/\.(rpc|insert|update|upsert|delete|select|eq)\([^\n]*\)\s*\.catch\(/);
    expect(code).not.toMatch(/^\s*\.catch\(/m);
  });

  it('never reaches for supabase.raw, which does not exist on the v2 client', () => {
    expect(code).not.toContain('supabase.raw');
  });

  it('does not write calculator_leads or calculator_calculations directly', () => {
    // Both need policies anon does not have. The definer RPCs are the path.
    expect(code).not.toMatch(/from\(['"]calculator_leads['"]\)/);
    expect(code).not.toMatch(/from\(['"]calculator_calculations['"]\)/);
  });

  it('does not update calculator_sessions directly, which RLS filters to zero rows', () => {
    expect(code).not.toMatch(/from\(['"]calculator_sessions['"]\)[\s\S]{0,80}\.update\(/);
  });
});
