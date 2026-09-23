import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateIncidentHTML } from './safety-incident-email.ts';
import { escapeHtml } from './html-escape.ts';

const PAYLOAD = '<img src=x onerror="alert(1)">';

describe('safety incident email escaping', () => {
  const html = generateIncidentHTML({
    id: `abc"><script>x()</script>`,
    incident_type: `slip_${PAYLOAD}`,
    severity: 'high',
    description: `Worker fell. ${PAYLOAD}`,
    location_description: `<b>Level 3</b> & stairwell`,
    reported_at: '2026-09-01T12:00:00Z',
    immediate_actions_taken: `<a href="https://evil.test">call</a>`,
  });

  it('never emits user-entered markup', () => {
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<b>Level 3</b>');
    expect(html).not.toContain('href="https://evil.test"');
  });

  it('keeps the text, escaped', () => {
    expect(html).toContain(`Worker fell. ${escapeHtml(PAYLOAD)}`);
    expect(html).toContain('&lt;b&gt;Level 3&lt;/b&gt; &amp; stairwell');
    expect(html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;call&lt;/a&gt;');
  });

  it('cannot break out of the report link attribute', () => {
    const link = html.match(/href="https:\/\/brikly\.app\/safety\/incidents\/([^"]*)"/);
    expect(link).not.toBeNull();
    expect(link![1]).not.toMatch(/[<>"]/);
  });

  it('renders a missing description as empty, not "undefined"', () => {
    const out = generateIncidentHTML({ incident_type: 'near_miss', severity: 'low' });
    expect(out).not.toContain('undefined');
    expect(out).not.toContain('null');
  });

  it('send-safety-notification uses the shared, escaping template', () => {
    const src = readFileSync('supabase/functions/send-safety-notification/index.ts', 'utf8');
    expect(src).toContain("from '../_shared/safety-incident-email.ts'");
    expect(src).not.toMatch(/const generateIncidentHTML\s*=/);
  });
});
