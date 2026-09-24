import { describe, it, expect } from 'vitest';
import {
  computeTwilioSignature, verifyTwilioSignature, twilioSigningString, twilioUrlVariants,
} from './twilio-signature';

// The worked example from https://www.twilio.com/docs/usage/security
// ("Validating signatures from Twilio"): auth token 12345, this URL and these
// POST parameters sign to 0/KCTR6DLpKmkAf8muzZqo1nDgQ=.
const DOC_TOKEN = '12345';
const DOC_URL = 'https://mycompany.com/myapp.php?foo=1&bar=2';
const DOC_PARAMS = {
  Digits: '1234',
  To: '+18005551212',
  From: '+12349013030',
  Caller: '+12349013030',
  CallSid: 'CA1234567890ABCDE',
};
const DOC_SIGNATURE = '0/KCTR6DLpKmkAf8muzZqo1nDgQ=';

describe('twilioSigningString', () => {
  it('appends each parameter name+value sorted by name, with no delimiters', () => {
    expect(twilioSigningString(DOC_URL, DOC_PARAMS)).toBe(
      'https://mycompany.com/myapp.php?foo=1&bar=2' +
        'CallSidCA1234567890ABCDECaller+12349013030Digits1234From+12349013030To+18005551212',
    );
  });

  it('sorts repeated names by value', () => {
    expect(twilioSigningString('u', [['b', '2'], ['a', 'z'], ['a', 'y']])).toBe('uayazb2');
  });
});

describe('computeTwilioSignature', () => {
  it("reproduces Twilio's documented signature", async () => {
    expect(await computeTwilioSignature(DOC_TOKEN, DOC_URL, DOC_PARAMS)).toBe(DOC_SIGNATURE);
  });

  it('gives the same answer for FormData-style entries as for an object', async () => {
    const fd = new URLSearchParams(DOC_PARAMS);
    expect(await computeTwilioSignature(DOC_TOKEN, DOC_URL, fd)).toBe(DOC_SIGNATURE);
  });
});

describe('verifyTwilioSignature', () => {
  it('accepts the documented example', async () => {
    expect(await verifyTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, DOC_URL, DOC_PARAMS)).toBe(true);
  });

  it('rejects a wrong auth token', async () => {
    expect(await verifyTwilioSignature('54321', DOC_SIGNATURE, DOC_URL, DOC_PARAMS)).toBe(false);
  });

  it('rejects a tampered parameter', async () => {
    const tampered = { ...DOC_PARAMS, CallSid: 'CA0000000000ABCDE' };
    expect(await verifyTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, DOC_URL, tampered)).toBe(false);
  });

  it('rejects an added parameter', async () => {
    const extra = { ...DOC_PARAMS, RecordingUrl: 'https://evil.example/r.mp3' };
    expect(await verifyTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, DOC_URL, extra)).toBe(false);
  });

  it('rejects a different URL (query string is signed)', async () => {
    const url = 'https://mycompany.com/myapp.php?foo=1&bar=3';
    expect(await verifyTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, url, DOC_PARAMS)).toBe(false);
  });

  it('fails closed on a missing token or signature', async () => {
    expect(await verifyTwilioSignature('', DOC_SIGNATURE, DOC_URL, DOC_PARAMS)).toBe(false);
    expect(await verifyTwilioSignature(DOC_TOKEN, null, DOC_URL, DOC_PARAMS)).toBe(false);
    expect(await verifyTwilioSignature(DOC_TOKEN, '', DOC_URL, DOC_PARAMS)).toBe(false);
  });

  it('accepts a signature made over the URL with the default port spelled out', async () => {
    const withPort = 'https://mycompany.com:443/myapp.php?foo=1&bar=2';
    const sig = await computeTwilioSignature(DOC_TOKEN, withPort, DOC_PARAMS);
    expect(await verifyTwilioSignature(DOC_TOKEN, sig, DOC_URL, DOC_PARAMS)).toBe(true);
    expect(await verifyTwilioSignature(DOC_TOKEN, DOC_SIGNATURE, withPort, DOC_PARAMS)).toBe(true);
  });
});

describe('twilioUrlVariants', () => {
  it('adds or removes only the default port', () => {
    expect(twilioUrlVariants('https://a.b/x?y=1')).toEqual(['https://a.b/x?y=1', 'https://a.b:443/x?y=1']);
    expect(twilioUrlVariants('https://a.b:443/x')).toEqual(['https://a.b:443/x', 'https://a.b/x']);
    expect(twilioUrlVariants('http://a.b/x')).toEqual(['http://a.b/x', 'http://a.b:80/x']);
    expect(twilioUrlVariants('https://a.b:8443/x')).toEqual(['https://a.b:8443/x']);
  });
});
