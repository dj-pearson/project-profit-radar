import { describe, it, expect, vi } from 'vitest';
import { resolveCompanyScope, canActOnUser } from './caller-company.ts';
import { dispatchReminder, type ReminderDeps } from '../send-payment-reminder/dispatch.ts';

describe('resolveCompanyScope (US-341)', () => {
  it('uses the profile company when the body sends none', () => {
    expect(resolveCompanyScope('co-a', undefined)).toEqual({ ok: true, companyId: 'co-a' });
  });

  it('accepts a body company_id that agrees, so older clients keep working', () => {
    expect(resolveCompanyScope('co-a', 'co-a')).toEqual({ ok: true, companyId: 'co-a' });
  });

  it('refuses a body company_id for another tenant with 403', () => {
    expect(resolveCompanyScope('co-a', 'co-b')).toMatchObject({ ok: false, status: 403 });
  });

  it('refuses a caller with no company at all', () => {
    expect(resolveCompanyScope(null, undefined)).toMatchObject({ ok: false, status: 403 });
    expect(resolveCompanyScope(undefined, 'co-b')).toMatchObject({ ok: false, status: 403 });
  });
});

function deps(overrides: Partial<ReminderDeps> = {}) {
  const ok = () => Promise.resolve(new Response('{}', { status: 200 }));
  const d = {
    requireInternalCaller: vi.fn<() => Response | null>(() => new Response('{"error":"Not found"}', { status: 404 })),
    authenticate: vi.fn<ReminderDeps['authenticate']>(async () => ({ userId: 'user-a', companyId: 'co-a' })),
    processScheduled: vi.fn(ok),
    forCompany: {
      send: vi.fn(ok), schedule: vi.fn(ok), get_settings: vi.fn(ok), update_settings: vi.fn(ok), preview: vi.fn(ok),
    },
    json: (payload: Record<string, unknown>, status: number) => new Response(JSON.stringify(payload), { status }),
    ...overrides,
  };
  return d;
}

describe('send-payment-reminder dispatch (US-341)', () => {
  it('a company A token with body.company_id of company B gets 403 and sends no email', async () => {
    const d = deps();
    const res = await dispatchReminder({ action: 'send', company_id: 'co-b', invoice_id: 'inv-1' }, d);
    expect(res.status).toBe(403);
    expect(d.forCompany.send).not.toHaveBeenCalled();
  });

  it('sends for the caller company, not the body one', async () => {
    const d = deps();
    const res = await dispatchReminder({ action: 'send', invoice_id: 'inv-1' }, d);
    expect(res.status).toBe(200);
    expect(d.forCompany.send).toHaveBeenCalledWith('co-a', expect.anything());
  });

  it('hard-fails with 401 when there is no verified user, whatever the body says', async () => {
    const d = deps({ authenticate: vi.fn(async () => null) });
    for (const action of ['send', 'schedule', 'get_settings', 'update_settings', 'preview']) {
      const res = await dispatchReminder({ action, company_id: 'co-b' }, d);
      expect(res.status).toBe(401);
    }
    for (const fn of Object.values(d.forCompany)) expect(fn).not.toHaveBeenCalled();
  });

  it('process_scheduled is internal-only: a signed-in user is refused', async () => {
    const d = deps();
    const res = await dispatchReminder({ action: 'process_scheduled' }, d);
    expect(res.status).toBe(404);
    expect(d.processScheduled).not.toHaveBeenCalled();
  });

  it('process_scheduled runs for an internal caller', async () => {
    const d = deps({ requireInternalCaller: vi.fn(() => null) });
    const res = await dispatchReminder({ action: 'process_scheduled' }, d);
    expect(res.status).toBe(200);
    expect(d.processScheduled).toHaveBeenCalled();
  });

  it('rejects an unknown action before authenticating', async () => {
    const d = deps();
    const res = await dispatchReminder({ action: 'drop_tables' }, d);
    expect(res.status).toBe(400);
    expect(d.authenticate).not.toHaveBeenCalled();
  });
});

describe('canActOnUser (US-241)', () => {
  // process-behavioral-triggers took userId from the body and fired email,
  // notification and webhook actions at that user on the service role. A
  // company admin could name a user in another tenant.
  const admin = { id: 'u-admin', role: 'admin', companyId: 'co-a' };

  it('lets anyone act on themselves, company or not', () => {
    expect(canActOnUser({ id: 'u-1', role: 'office_staff', companyId: null }, { id: 'u-1' })).toBe(true);
  });

  it('lets a caller act on a user in their own company', () => {
    expect(canActOnUser(admin, { id: 'u-2', companyId: 'co-a' })).toBe(true);
  });

  it('refuses a user in another company', () => {
    expect(canActOnUser(admin, { id: 'u-3', companyId: 'co-b' })).toBe(false);
  });

  it('fails closed when either company is unknown', () => {
    expect(canActOnUser(admin, { id: 'u-4', companyId: null })).toBe(false);
    expect(canActOnUser({ id: 'u-5', role: 'admin', companyId: null }, { id: 'u-6', companyId: null })).toBe(false);
  });

  it('lets root_admin act across tenants', () => {
    expect(canActOnUser({ id: 'u-root', role: 'root_admin', companyId: null }, { id: 'u-7', companyId: 'co-b' })).toBe(true);
  });

  it('refuses empty ids rather than matching them to each other', () => {
    expect(canActOnUser({ id: '', companyId: 'co-a' }, { id: '', companyId: 'co-a' })).toBe(false);
  });
});
