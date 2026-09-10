#!/usr/bin/env node
/**
 * No source file may be silently excluded by .gitignore.
 *
 * .gitignore carries four substring patterns aimed at key material - *secret*,
 * *private*, *token*, *credential* - and a substring pattern matches source
 * code just as happily as it matches a .pem. That is how
 * supabase/migrations/..._make_customer_buckets_private.sql disappeared: the
 * commit that was supposed to make the customer storage buckets private
 * shipped with no migration in it, said in its body that the buckets "are now
 * public = false", and added the test that would have caught it - which was
 * red from that day forward. The buckets stayed world-readable for months.
 *
 * `git add <ignored-path>` is a no-op that prints a hint, and a hint is
 * invisible inside a scripted commit. So the check has to be a gate, not a
 * convention: anything under the tracked source roots that git would refuse to
 * add is a build failure here.
 */
import { execSync } from 'node:child_process';

/** Directories whose contents are always meant to be tracked. */
const SOURCE_ROOTS = ['src', 'supabase/migrations', 'supabase/functions', 'scripts', 'tests'];

/** Extensions that are source, never credential material. */
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|sql|swift|sh)$/i;

let ignored = '';
try {
  // Files present on disk, not tracked, and excluded by an ignore rule.
  ignored = execSync('git ls-files --others --ignored --exclude-standard', {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (e) {
  console.error('::error::could not list ignored files:', e.message);
  process.exit(1);
}

const offenders = ignored
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .filter((f) => SOURCE_ROOTS.some((r) => f === r || f.startsWith(`${r}/`)))
  .filter((f) => SOURCE_EXT.test(f));

if (offenders.length) {
  console.error(
    '::error::These source files exist on disk but .gitignore excludes them, so ' +
      '`git add` skips them and a commit can claim work it does not contain:'
  );
  for (const f of offenders) {
    let rule = '';
    try {
      rule = execSync(`git check-ignore -v -- ${JSON.stringify(f)}`, { encoding: 'utf8' }).trim();
    } catch {
      rule = '(rule not reported)';
    }
    console.error(`  - ${f}`);
    console.error(`      ${rule}`);
  }
  console.error('');
  console.error(
    '  Fix the pattern rather than force-adding the file: the next one to hit it ' +
      'will be just as silent. Secrets are kept out by content scanning ' +
      '(scripts/secret-scan.sh), not by matching words in filenames.'
  );
  process.exit(1);
}

console.log(`No source files are hidden by .gitignore (checked ${SOURCE_ROOTS.join(', ')}).`);
