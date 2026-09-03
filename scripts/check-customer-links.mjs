#!/usr/bin/env node
/**
 * US-326: a write that names a customer should link one.
 *
 * The same homeowner used to exist as four unlinked rows - a CRM contact, free
 * text on the estimate, free text on the project, and an email on their portal
 * access - because every writer typed the name again instead of referencing a
 * record. Fixing the four tables does nothing if the next feature adds a fifth
 * copy, and it is an easy mistake: client_name is right there in the type.
 *
 * So this fails when a NEW write sets client_name or client_email without also
 * setting client_id in the same object literal. The existing writers are
 * baselined by count, not by name: there are 40-odd, most of them building a
 * display object rather than an insert, and a list of names would rot faster
 * than it helped. The count only goes down.
 *
 * WHAT IT DELIBERATELY DOES NOT FLAG:
 *   - Reading client_name (select, destructuring, JSX).
 *   - Test files and the generated types.
 *   - An object that sets client_id alongside, which is the correct shape.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const FUNCTIONS = join(root, 'supabase', 'functions');

// Lower this as writers are converted. It never goes up.
const BASELINE = 48;

const SKIP_DIRS = new Set(['node_modules', 'dist', '__tests__', '__mocks__']);
const SKIP_FILE = /\.(test|spec)\.[tj]sx?$|types\.ts$/;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !SKIP_FILE.test(entry)) out.push(full);
  }
  return out;
}

/** Strip comments so a note about client_name is not a write of one. */
function code(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

const findings = [];

for (const file of [...walk(SRC), ...walk(FUNCTIONS)]) {
  const src = code(readFileSync(file, 'utf8'));
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    // A write, not a read: `client_name:` with a value after it.
    if (!/\bclient_(name|email)\s*:/.test(line)) return;
    // A type declaration, not a value.
    if (/client_(name|email)\??\s*:\s*(string|number|boolean|z\.)/.test(line)) return;

    // Look for client_id in the surrounding object literal. Twelve lines
    // either way covers the shape these objects actually take without
    // wandering into the next one.
    const from = Math.max(0, i - 12);
    const to = Math.min(lines.length, i + 12);
    const near = lines.slice(from, to).join('\n');
    if (/\bclient_id\s*:/.test(near)) return;

    findings.push(`${relative(root, file)}:${i + 1}`);
  });
}

console.log('Customer-link guard (US-326)');
console.log(`  writes naming a customer without linking one: ${findings.length} (baseline ${BASELINE})`);

if (findings.length > BASELINE) {
  console.error(
    `\n❌ ${findings.length - BASELINE} new write(s) that name a customer without linking one.\n` +
    '   The same person then exists twice, and a corrected phone number has to be\n' +
    '   fixed in both places. Set client_id from the ContactPicker alongside the\n' +
    '   name and email (which stay, dual-written, for one release).\n'
  );
  for (const f of findings.slice(0, 20)) console.error(`    - ${f}`);
  process.exit(1);
}

if (findings.length < BASELINE) {
  console.error(
    `\n✖ ${BASELINE - findings.length} fewer than the baseline. Lower BASELINE in ` +
    `scripts/check-customer-links.mjs to ${findings.length} to lock it in - ` +
    'a ceiling nobody lowers stops being a gate.\n'
  );
  process.exit(1);
}

console.log(`\n✔ No new unlinked customer writes (${BASELINE} in the backlog).`);
