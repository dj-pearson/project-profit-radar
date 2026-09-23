import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseJsonBodyText } from './parse-json-body';

// validateBody's malformed-body rule (US-241). A missing body is a 400 unless
// the function opts in with allowEmpty, which data-subject-delete and
// data-subject-export need because the iOS app sends no body at all.

describe('parseJsonBodyText', () => {
  it('parses a JSON object', () => {
    expect(parseJsonBodyText('{"a":1}')).toEqual({ ok: true, value: { a: 1 }, empty: false });
  });

  it('rejects an empty body by default', () => {
    expect(parseJsonBodyText('')).toEqual({ ok: false });
    expect(parseJsonBodyText('  \n\t')).toEqual({ ok: false });
  });

  it('treats an empty body as {} with allowEmpty', () => {
    expect(parseJsonBodyText('', { allowEmpty: true })).toEqual({ ok: true, value: {}, empty: true });
    expect(parseJsonBodyText(' \r\n ', { allowEmpty: true })).toEqual({ ok: true, value: {}, empty: true });
  });

  it('hands back a fresh object each time, so one request cannot mutate the next', () => {
    const a = parseJsonBodyText('', { allowEmpty: true });
    const b = parseJsonBodyText('', { allowEmpty: true });
    expect(a.ok && b.ok && a.value !== b.value).toBe(true);
  });

  it('still rejects a present-but-malformed body with allowEmpty', () => {
    expect(parseJsonBodyText('{not json', { allowEmpty: true })).toEqual({ ok: false });
    expect(parseJsonBodyText('undefined', { allowEmpty: true })).toEqual({ ok: false });
  });

  it('does not turn an explicit JSON null into {}', () => {
    // "null" is a body the client chose to send; the schema decides on it.
    expect(parseJsonBodyText('null', { allowEmpty: true })).toEqual({ ok: true, value: null, empty: false });
  });

  it('keeps {} as {} whether or not the option is set', () => {
    expect(parseJsonBodyText('{}')).toEqual({ ok: true, value: {}, empty: false });
    expect(parseJsonBodyText('{}', { allowEmpty: true })).toEqual({ ok: true, value: {}, empty: false });
  });
});

describe('validateBody wiring', () => {
  const dir = join('supabase', 'functions');
  const helper = readFileSync(join(dir, '_shared', 'validate-body.ts'), 'utf8');

  it('reads the body through parseJsonBodyText and forwards allowEmpty', () => {
    expect(helper).toContain('parseJsonBodyText(text, { allowEmpty: options.allowEmpty })');
    expect(helper).not.toMatch(/\breq\s*\.\s*json\s*\(/);
  });

  it.each(['data-subject-delete', 'data-subject-export'])(
    '%s opts in, because the iOS app calls it with no body',
    (name) => {
      const src = readFileSync(join(dir, name, 'index.ts'), 'utf8');
      expect(src).toMatch(/validateBody\(req, \w+, \{[^}]*allowEmpty: true[^}]*\}\)/);
    },
  );
});
