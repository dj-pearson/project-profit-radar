import { describe, it, expect, vi } from 'vitest';
import { resolveCompanyScope } from './caller-company.ts';
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
