import { describe, it, expect, vi } from 'vitest';
import {
  generateVerificationToken,
  normalizeDomain,
  parseDohTxtResponse,
  parseTxtData,
  resolveTxt,
  txtMatchesToken,
  verificationRecordName,
} from './domain-verification';

const TOKEN = 'brikly-verify=0123456789abcdef0123456789abcdef';

describe('normalizeDomain', () => {
  it('strips scheme, trailing slash and trailing dot, and lowercases', () => {
    expect(normalizeDomain('https://App.Example.com/')).toBe('app.example.com');
    expect(normalizeDomain('http://app.example.com')).toBe('app.example.com');
    expect(normalizeDomain('app.example.com.')).toBe('app.example.com');
  });

  it('refuses anything that is not a bare hostname', () => {
    expect(normalizeDomain('example.com/path')).toBeNull();
    expect(normalizeDomain('example.com:8443')).toBeNull();
    expect(normalizeDomain('user@example.com')).toBeNull();
    expect(normalizeDomain('localhost')).toBeNull();
    expect(normalizeDomain('a..com')).toBeNull();
    expect(normalizeDomain(`${'a'.repeat(64)}.com`)).toBeNull();
    expect(normalizeDomain('')).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain(42)).toBeNull();
  });
});

describe('verificationRecordName', () => {
  it('puts the record under _brikly-verify', () => {
    expect(verificationRecordName('app.example.com')).toBe('_brikly-verify.app.example.com');
  });
});

describe('generateVerificationToken', () => {
  it('is 128 bits of hex behind the prefix, matching the migration CHECK', () => {
    const t = generateVerificationToken();
    expect(t).toMatch(/^brikly-verify=[0-9a-f]{32}$/);
  });

  it('draws from the injected CSPRNG', () => {
    const t = generateVerificationToken((a) => a.fill(0xab));
    expect(t).toBe(`brikly-verify=${'ab'.repeat(16)}`);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateVerificationToken()));
    expect(seen.size).toBe(200);
  });
});

describe('parseTxtData', () => {
  it('unquotes one string', () => {
    expect(parseTxtData(`"${TOKEN}"`)).toBe(TOKEN);
  });

  it('joins a value split into several strings', () => {
    expect(parseTxtData('"brikly-verify=0123" "456789abcdef0123456789abcdef"')).toBe(TOKEN);
  });

  it('unescapes quotes and backslashes', () => {
    expect(parseTxtData('"a\\"b\\\\c"')).toBe('a"b\\c');
  });

  it('passes an unquoted value through', () => {
    expect(parseTxtData(TOKEN)).toBe(TOKEN);
  });
});

describe('parseDohTxtResponse', () => {
  it('reads TXT answers and ignores other types (a CNAME in the chain)', () => {
    const r = parseDohTxtResponse({
      Status: 0,
      Answer: [
        { type: 5, data: 'target.example.net.' },
        { type: 16, data: `"${TOKEN}"` },
        { type: 16, data: '"v=spf1 -all"' },
      ],
    });
    expect(r).toEqual({ ok: true, records: [TOKEN, 'v=spf1 -all'] });
  });

  it('treats NXDOMAIN and an empty NOERROR as no records', () => {
    expect(parseDohTxtResponse({ Status: 3 })).toEqual({ ok: true, records: [] });
    expect(parseDohTxtResponse({ Status: 0 })).toEqual({ ok: true, records: [] });
  });

  it('treats SERVFAIL and garbage as errors, not as "record missing"', () => {
    expect(parseDohTxtResponse({ Status: 2 }).ok).toBe(false);
    expect(parseDohTxtResponse(null).ok).toBe(false);
    expect(parseDohTxtResponse('nope').ok).toBe(false);
  });
});

describe('resolveTxt', () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/dns-json' } });

  it('asks for TXT at the given name with the DoH JSON accept header', async () => {
    const fetchImpl = vi.fn(async () => json({ Status: 0, Answer: [{ type: 16, data: `"${TOKEN}"` }] }));
    const r = await resolveTxt('_brikly-verify.app.example.com', fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, records: [TOKEN] });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://cloudflare-dns.com/dns-query?name=_brikly-verify.app.example.com&type=TXT');
    expect((init.headers as Record<string, string>).accept).toBe('application/dns-json');
  });

  it('falls back to the next resolver when one fails', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(json({ Status: 0, Answer: [{ type: 16, data: `"${TOKEN}"` }] }));
    const r = await resolveTxt('x.example.com', fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, records: [TOKEN] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('falls back on SERVFAIL and on a non-2xx', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ Status: 2 }))
      .mockResolvedValueOnce(json({}, 503));
    const r = await resolveTxt('x.example.com', fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'resolver returned HTTP 503' });
  });

  it('stops at the first definite answer, including NXDOMAIN', async () => {
    const fetchImpl = vi.fn(async () => json({ Status: 3 }));
    const r = await resolveTxt('x.example.com', fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, records: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('txtMatchesToken', () => {
  it('matches an exact record among others', () => {
    expect(txtMatchesToken(['v=spf1 -all', ` ${TOKEN} `], [TOKEN])).toBe(true);
  });

  it('does not match a prefix, a substring or a different token', () => {
    expect(txtMatchesToken([TOKEN.slice(0, -1)], [TOKEN])).toBe(false);
    expect(txtMatchesToken([`x${TOKEN}`], [TOKEN])).toBe(false);
    expect(txtMatchesToken([`${TOKEN} extra`], [TOKEN])).toBe(false);
    expect(txtMatchesToken(['brikly-verify=ffffffffffffffffffffffffffffffff'], [TOKEN])).toBe(false);
  });

  it('never matches with no tokens or no records', () => {
    expect(txtMatchesToken([''], [])).toBe(false);
    expect(txtMatchesToken([''], [''])).toBe(false);
    expect(txtMatchesToken([], [TOKEN])).toBe(false);
  });
});
