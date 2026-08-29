#!/usr/bin/env node
/**
 * US-309: no success message for an operation that performed no write.
 *
 * The shape, found four separate times in one day:
 *
 *   OfflineDataManager     cleared a field worker's queued time entries after an
 *                          unchecked insert, showing "Sync Complete".
 *   MobileMaterialTracker  "Delivery confirmed successfully", writing nothing.
 *   EquipmentEditForm      sleeps 500ms, "Equipment updated successfully".
 *   admin/Settings         sleeps 1s, "Settings saved successfully", with no
 *                          settings table behind the screen at all.
 *
 * Distinct from US-300's silent writes: there a write's error is discarded, here
 * there is no write to fail. The user acts on a claim that is simply false, and
 * for a safety incident or a certification reminder that claim carries
 * regulatory weight.
 *
 * A function is flagged when its body announces success and contains no
 * insert/update/upsert/delete, no rpc, no functions.invoke and no storage call.
 * Bodies under 120 characters are ignored, because a one-line helper that takes
 * a message and shows it is not making a claim of its own.
 *
 * FALSE POSITIVES ARE EXPECTED where a handler delegates the write to a helper
 * it calls. That is what the baseline is for: an entry there is a claim that
 * someone looked. It must only ever shrink.
 */
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

const ANNOUNCES_SUCCESS =
  /toast\.success\s*\(|title:\s*["'][^"']*(?:success|created|saved|updated|sent|confirmed|deleted|added|reported)/i;
/**
 * "Not saved" contains "saved". Without this the two screens fixed under this
 * story stayed flagged BY THEIR OWN FIX, which would have taught the next
 * person that being honest does not clear the check.
 */
const NEGATED = /title:\s*["'](?:not |could ?n[o']t |un(?:able|saved)|failed)/i;
const PERFORMS_WRITE =
  /\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(|functions\s*\.\s*invoke\s*\(|\.storage\b|localStorage|sessionStorage|fetch\s*\(/;
const MIN_BODY = 120;

/**
 * The narrowing that makes this a guard rather than noise.
 *
 * "Success toast and no write in the same function" alone flags 122 files, most
 * of them fine - a handler whose success message sits in the onSuccess of a
 * mutation defined elsewhere, or one that calls a save helper. A 122-entry
 * baseline would be theatre: it reads as covered and means nothing.
 *
 * What actually distinguishes a screen that PRETENDS to work is a stand-in for
 * the work: a comment saying so, or an artificial delay standing where the
 * request should be. Both were present in every instance found by hand
 * (MobileMaterialTracker, EquipmentEditForm, admin/Settings,
 * SafetyComplianceManager). Requiring one of them takes 122 to a set where the
 * sampled hit rate was 3 of 3.
 *
 * The cost is real and worth stating: a handler that fakes success with no
 * comment and no sleep is not caught. This is a high-precision check, not a
 * complete one.
 */
/**
 * `placeholder` needs the lookahead. Without it this matched the JSX
 * `placeholder="Search invoices..."` attribute on every form input, which is
 * not a stand-in for work - it is the input's hint text. That put 18 matches
 * and a number of entirely correct screens into the backlog, ResetPassword
 * among them: it awaits supabase.auth.updateUser, checks the error, and shows
 * success only on the else branch. A baseline entry is supposed to mean someone
 * looked, so an entry that could never have been a real hit is worse than no
 * entry at all. Corrected 2026-08-27 (US-309).
 */
const PRETENDS =
  /for now|would (?:upload|save|call|send|be|update|create)|\bmock\b|not implemented|todo:|\bplaceholder\b(?!\s*[=:])|simulat|in a real (?:app|implementation)|setTimeout\s*\(\s*resolve/i;

/**
 * A COUNT, not a name list, matching check-silent-writes.mjs.
 *
 * A sixty-entry allowlist reads as "all reviewed" and would not be. The count
 * ratchets: it may fall as screens are fixed and must never rise, and the
 * triage itself lives on US-309 where it can be read.
 */
const BASELINE = 19;

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f);
    else if (/\.tsx?$/.test(f) && !/\.(test|spec)\./.test(f) && !/__tests__/.test(f)) files.push(f);
  }
};
walk(SRC);

/**
 * A stand-in for work lives in code or in a comment where the work should be:
 *   // Mock data for now - replace with actual Supabase query
 *   // Implementation would create rule in database
 *   setTimeout(() => resolve(), 3000)
 *
 * It does not live inside a user-facing string. Two false positives came from
 * scanning those: the JSX attribute `placeholder="Search invoices..."`, and
 * ProjectSchedule's entirely correct destructive toast
 * `'That dependency would create a cycle.'` - a function that goes on to call
 * addDependency and await a real write. Blanking string and template literals
 * before the PRETENDS test removes that whole class, and costs nothing: no
 * genuine stand-in has ever been found inside a quoted string. Comments are
 * deliberately kept, because that is where most real ones are (US-309).
 */
function withoutStringLiterals(body) {
  return body
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
}

const flagged = new Set();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (!ANNOUNCES_SUCCESS.test(text)) continue;
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const check = (n) => {
    if (ts.isArrowFunction(n) || ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)
        || ts.isMethodDeclaration(n)) {
      const body = n.body ? n.body.getText(sf) : '';
      const announces = ANNOUNCES_SUCCESS.test(body) && !NEGATED.test(body);
      if (body.length > MIN_BODY && announces
          && !PERFORMS_WRITE.test(body) && PRETENDS.test(withoutStringLiterals(body))) {
        flagged.add(relative(root, f).split('\\').join('/'));
      }
    }
    n.forEachChild(check);
  };
  sf.forEachChild(check);
}

const files_flagged = [...flagged].sort();

console.log('Fake-success guard (US-309)');
console.log(`  announce success with no write: ${files_flagged.length} (baseline ${BASELINE})`);

if (files_flagged.length > BASELINE) {
  console.error(
    `\n\u2716 ${files_flagged.length - BASELINE} new screen(s) announcing success without writing anything.`,
  );
  console.error('  Current set:');
  for (const f of files_flagged) console.error(`    ${f}`);
  console.error(
    '\nA success message the user acts on has to mean the thing happened. Either do the',
  );
  console.error('write, or say plainly that nothing was saved (see US-309).');
  process.exit(1);
}

if (files_flagged.length < BASELINE) {
  console.error(
    `\n\u2716 ${BASELINE - files_flagged.length} fixed since the baseline, and that has to be ` +
      `locked in: set BASELINE to ${files_flagged.length} in ` +
      `${relative(root, fileURLToPath(import.meta.url))}.`,
  );
  console.error(
    '  A baseline nobody lowers stops being a gate. US-212 let one drift to 1860 against a real ' +
      'count of 669 - permitting 1191 new errors - precisely because a count below it only ' +
      'printed a suggestion.',
  );
  process.exit(1);
}

console.log(`\n\u2714 No new success messages without a write (${files_flagged.length} in the backlog).`);
