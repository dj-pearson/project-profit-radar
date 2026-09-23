import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FEATURE_FLAGS, resolveFlag, isFlagEnabled, featureDisabledResponse,
  type FeatureFlagKey,
} from './feature-flags.ts';
import {
  FEATURE_FLAGS as WEB_FEATURE_FLAGS,
  resolveFlag as webResolveFlag,
} from '../../../src/lib/featureFlags';

const A = 'aaaaaaaa-0000-0000-0000-000000000000';
const B = 'bbbbbbbb-0000-0000-0000-000000000000';
const KEY: FeatureFlagKey = 'quickbooks.sync';

function stubClient(result: { data: unknown; error: { message: string } | null } | Error) {
  const eq = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq };
}

describe('feature flag registry (US-281)', () => {
  it('the web mirror matches the server registry exactly', () => {
    expect(WEB_FEATURE_FLAGS).toEqual(FEATURE_FLAGS);
  });

  for (const [key, def] of Object.entries(FEATURE_FLAGS)) {
    it(`${key} documents its safe side, owner and dates`, () => {
      expect(key).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/);
      expect(def.safeSide.length).toBeGreaterThan(20);
      expect(def.owner).not.toBe('');
      expect(def.addedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(def.removeBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(def.removeBy > def.addedOn).toBe(true);
    });

    // Lifecycle (docs/FEATURE_FLAGS.md): a flag past its date is deleted, or
    // its removeBy is pushed out in a reviewed change that says why.
    it(`${key} is not past its removeBy date`, () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(today <= def.removeBy, `${key} was due for removal on ${def.removeBy}`).toBe(true);
    });
  }

  it('quickbooks.sync fails open: a read error must not switch off a working integration', () => {
    expect(FEATURE_FLAGS['quickbooks.sync'].default).toBe(true);
    expect(FEATURE_FLAGS['quickbooks.sync'].onReadError).toBe(true);
  });
});

describe('resolveFlag', () => {
  const cases: Array<[string, Array<{ company_id: string | null; enabled: boolean }>, boolean, string]> = [
    ['no rows uses the default', [], true, 'default'],
    ['a global off row is the kill switch', [{ company_id: null, enabled: false }], false, 'global_kill'],
    ['a company on row cannot override a global kill',
      [{ company_id: null, enabled: false }, { company_id: A, enabled: true }], false, 'global_kill'],
    ['a company off row switches off one company', [{ company_id: A, enabled: false }], false, 'company'],
    ['a company row wins over a global on row',
      [{ company_id: null, enabled: true }, { company_id: A, enabled: false }], false, 'company'],
    ['a global on row applies when the company has none', [{ company_id: null, enabled: true }], true, 'global'],
    ['another company\'s row is ignored', [{ company_id: B, enabled: false }], true, 'default'],
  ];
  for (const [name, rows, enabled, source] of cases) {
    it(name, () => {
      expect(resolveFlag(KEY, rows, A)).toEqual({ enabled, source });
      expect(webResolveFlag(KEY, rows, A)).toEqual({ enabled, source });
    });
  }

  it('without a company only global rows count', () => {
    expect(resolveFlag(KEY, [{ company_id: A, enabled: false }], null)).toEqual({ enabled: true, source: 'default' });
  });
});

describe('isFlagEnabled', () => {
  it('reads only this key and resolves the rows', async () => {
    const s = stubClient({ data: [{ company_id: null, enabled: false }], error: null });
    await expect(isFlagEnabled(s.client, KEY, A)).resolves.toEqual({ enabled: false, source: 'global_kill' });
    expect(s.from).toHaveBeenCalledWith('feature_flags');
    expect(s.eq).toHaveBeenCalledWith('flag_key', KEY);
  });

  it('never puts the company id in the query', async () => {
    const s = stubClient({ data: [], error: null });
    await isFlagEnabled(s.client, KEY, 'x),company_id.neq.null');
    expect(JSON.stringify(s.eq.mock.calls)).not.toContain('company_id');
  });

  it('falls to onReadError on a PostgREST error (table not applied yet)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = stubClient({ data: null, error: { message: 'relation "public.feature_flags" does not exist' } });
    await expect(isFlagEnabled(s.client, KEY, A)).resolves.toEqual({
      enabled: FEATURE_FLAGS[KEY].onReadError, source: 'read_error',
    });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('falls to onReadError when the client throws', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = stubClient(new Error('network down'));
    await expect(isFlagEnabled(s.client, KEY, A)).resolves.toMatchObject({ source: 'read_error' });
    err.mockRestore();
  });
});

describe('featureDisabledResponse', () => {
  it('answers 503 in the standard envelope', async () => {
    const res = featureDisabledResponse(KEY, { 'Access-Control-Allow-Origin': 'https://brikly.net' });
    expect(res.status).toBe(503);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://brikly.net');
    const body = await res.json();
    expect(body).toMatchObject({ success: false, feature_flag: KEY });
    expect(typeof body.error).toBe('string');
    expect(typeof body.timestamp).toBe('string');
  });
});

describe('quickbooks-sync gate', () => {
  it('checks the flag after validation and before tokens, logs or Intuit calls', () => {
    const src = readFileSync(join(process.cwd(), 'supabase/functions/quickbooks-sync/index.ts'), 'utf8');
    const handler = src.slice(src.indexOf('serve(async'));
    const gate = handler.indexOf("isFlagEnabled(supabaseClient, 'quickbooks.sync'");
    expect(gate).toBeGreaterThan(handler.indexOf('validateBody('));
    for (const later of ["from('quickbooks_integrations')", 'loadQuickBooksTokens(', "from('quickbooks_sync_logs')", 'fetchQuickBooksData(']) {
      const at = handler.indexOf(later);
      expect(at, later).toBeGreaterThan(gate);
    }
    expect(handler.slice(gate, gate + 400)).toContain("featureDisabledResponse('quickbooks.sync'");
  });
});
