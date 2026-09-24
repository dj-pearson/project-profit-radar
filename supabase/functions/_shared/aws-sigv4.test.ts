import { describe, it, expect } from 'vitest';
import { amzDate, deriveSigningKeyHex, signRequest } from './aws-sigv4';

// Vectors from AWS's published SigV4 test suite and IAM documentation.
const creds = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' };
const at = new Date('2015-08-30T12:36:00Z');

describe('aws-sigv4', () => {
  it('derives the documented signing key', async () => {
    expect(await deriveSigningKeyHex(creds.secretAccessKey, '20120215', 'us-east-1', 'iam')).toBe(
      'f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d',
    );
  });

  it('formats x-amz-date', () => {
    expect(amzDate(at)).toBe('20150830T123600Z');
  });

  it('signs get-vanilla', async () => {
    const h = await signRequest({ method: 'GET', url: 'https://example.amazonaws.com/', headers: {}, body: '' }, creds, 'us-east-1', 'service', at);
    expect(h.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
    expect(h['x-amz-date']).toBe('20150830T123600Z');
  });

  it('signs post-vanilla', async () => {
    const h = await signRequest({ method: 'POST', url: 'https://example.amazonaws.com/', headers: {}, body: '' }, creds, 'us-east-1', 'service', at);
    expect(h.authorization).toMatch(/Signature=5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b$/);
  });

  it('signs every header it is given and a session token when present', async () => {
    const h = await signRequest(
      { method: 'POST', url: 'https://email.us-east-1.amazonaws.com/v2/email/outbound-emails', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      { ...creds, sessionToken: 'tok' },
      'us-east-1',
      'ses',
      at,
    );
    expect(h.authorization).toContain('SignedHeaders=content-type;host;x-amz-date;x-amz-security-token');
    expect(h.authorization).toContain('/us-east-1/ses/aws4_request');
    expect(h['x-amz-security-token']).toBe('tok');
  });
});
