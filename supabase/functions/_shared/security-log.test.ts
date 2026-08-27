import { describe, it, expect, vi } from 'vitest';
import { writeSecurityLog } from './security-log.ts';

function makeClient(result: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(result);
  return { client: { from: vi.fn(() => ({ insert })) }, insert };
}

const req = () =>
  new Request('https://api.brikly.net/x', {
    headers: { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'probe/1.0' },
  });

describe('writeSecurityLog', () => {
  it('writes to security_logs with the derived request metadata', async () => {
    const { client, insert } = makeClient({ error: null });
    await writeSecurityLog(client, {
      user_id: 'u1',
      event_type: 'mfa_login_failed',
      req: req(),
      details: { reason: 'invalid_code' },
    });
    expect(client.from).toHaveBeenCalledWith('security_logs');
    const row = insert.mock.calls[0][0];
    expect(row.user_id).toBe('u1');
    expect(row.event_type).toBe('mfa_login_failed');
    expect(row.ip_address).toBe('203.0.113.9');
    expect(row.user_agent).toBe('probe/1.0');
    expect(row.details.reason).toBe('invalid_code');
    expect(typeof row.details.timestamp).toBe('string');
  });

  it('lets the caller override ip and user agent', async () => {
    const { client, insert } = makeClient({ error: null });
    await writeSecurityLog(client, {
      user_id: null,
      event_type: 'sso_login',
      ip_address: '198.51.100.4',
      user_agent: 'other/2.0',
    });
    const row = insert.mock.calls[0][0];
    expect(row.ip_address).toBe('198.51.100.4');
    expect(row.user_agent).toBe('other/2.0');
  });

  it('does not let caller details overwrite nothing - timestamp is defaulted, not forced', async () => {
    const { client, insert } = makeClient({ error: null });
    await writeSecurityLog(client, {
      user_id: 'u1',
      event_type: 'x',
      details: { timestamp: 'caller-supplied' },
    });
    expect(insert.mock.calls[0][0].details.timestamp).toBe('caller-supplied');
  });

  it('reports a returned error under a greppable marker', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = makeClient({ error: { message: 'denied by RLS' } });
    await writeSecurityLog(client, { user_id: 'u1', event_type: 'mfa_disabled' });
    expect(err).toHaveBeenCalledWith(
      'SECURITY_LOG_WRITE_FAILED',
      expect.objectContaining({ event_type: 'mfa_disabled', error: 'denied by RLS' }),
    );
    err.mockRestore();
  });

  it('never throws on a returned error, so a logging fault cannot take auth down', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = makeClient({ error: { message: 'boom' } });
    await expect(writeSecurityLog(client, { user_id: null, event_type: 'x' })).resolves
      .toBeUndefined();
    err.mockRestore();
  });

  it('never throws when the insert itself rejects', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = { from: () => ({ insert: () => Promise.reject(new Error('network')) }) };
    await expect(writeSecurityLog(client, { user_id: null, event_type: 'x' })).resolves
      .toBeUndefined();
    expect(err).toHaveBeenCalledWith('SECURITY_LOG_WRITE_FAILED', expect.objectContaining({
      error: 'network',
    }));
    err.mockRestore();
  });

  it('never throws when the client is not a client at all', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(writeSecurityLog({}, { user_id: null, event_type: 'x' })).resolves
      .toBeUndefined();
    err.mockRestore();
  });
});
