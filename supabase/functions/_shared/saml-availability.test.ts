import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAML_AVAILABLE, samlUnavailableResponse, wouldEnableSaml } from './saml-availability.ts';
import { SAML_AVAILABLE as WEB_SAML_AVAILABLE } from '../../../src/lib/sso/samlAvailability';

const fn = (name: string) => readFileSync(join(process.cwd(), 'supabase/functions', name, 'index.ts'), 'utf8');

describe('SAML kill switch (US-340)', () => {
  it('SAML is off, and the web mirror agrees with the server', () => {
    expect(SAML_AVAILABLE).toBe(false);
    expect(WEB_SAML_AVAILABLE).toBe(SAML_AVAILABLE);
  });

  it('answers 503 with the standard envelope', async () => {
    const res = samlUnavailableResponse({ 'Access-Control-Allow-Origin': 'https://brikly.net' });
    expect(res?.status).toBe(503);
    const body = await res!.json();
    expect(body).toMatchObject({ success: false });
    expect(typeof body.error).toBe('string');
    expect(typeof body.timestamp).toBe('string');
  });

  it('refuses to enable a SAML connection and nothing else', () => {
    expect(wouldEnableSaml('saml', true)).toBe(true);
    expect(wouldEnableSaml('saml', false)).toBe(false);
    expect(wouldEnableSaml('saml', undefined)).toBe(false);
    expect(wouldEnableSaml('oauth_google', true)).toBe(false);
    expect(wouldEnableSaml(undefined, true)).toBe(false);
  });

  // The callback is where the forged assertion would be accepted, so the
  // switch has to run before it parses anything or touches the database.
  for (const name of ['sso-saml-callback', 'sso-saml-init']) {
    it(`${name} returns the 503 before creating a client or parsing a body`, () => {
      const src = fn(name);
      const handler = src.slice(src.indexOf('serve(async'));
      const gate = handler.indexOf('samlUnavailableResponse(');
      expect(gate).toBeGreaterThan(-1);
      for (const later of ['createClient(', 'formData(', 'req.json(', 'parseSAMLResponse(']) {
        const at = handler.indexOf(later);
        if (at > -1) expect(gate).toBeLessThan(at);
      }
    });
  }

  it('sso-manage checks both create and the id-only enable toggle', () => {
    const src = fn('sso-manage');
    expect(src.match(/wouldEnableSaml\(/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
