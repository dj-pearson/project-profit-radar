#!/usr/bin/env node
/**
 * Guard: tests that exercise DOMPurify must run under jsdom.
 *
 * happy-dom (the suite default in vitest.config.ts) does not implement the
 * DOM spec's NodeIterator "pre-removing steps". When the node the iterator is
 * currently positioned on is removed, happy-dom ends the iteration instead of
 * moving the reference to the next node. DOMPurify sanitizes by walking the
 * parsed tree with createNodeIterator and removing disallowed nodes as it
 * goes, so under happy-dom it stops at the first thing it strips and returns
 * the rest of the document untouched:
 *
 *   happy-dom: sanitize('Hello<script>evil()</script><b>W</b>')
 *              => '<script>evil()</script><b>W</b>'
 *   jsdom:     => 'Hello<b>W</b>'
 *
 * A test asserting "the payload was removed" therefore proves nothing under
 * happy-dom, and can pass by accident depending on payload ordering. Any test
 * file that reaches DOMPurify - directly or through an import chain - must
 * declare `@vitest-environment jsdom`.
 *
 * The taint set is computed as a fixpoint over the src/ import graph starting
 * from every module that imports `dompurify`, so adding a new sanitizer
 * wrapper or a new test for one is covered without touching this script.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];

/** Test files that import a tainted module but assert nothing about DOM
 *  sanitization (they only exercise string-level helpers from the same file).
 *  Each entry needs a reason. */
const EXEMPT = new Map([
  [
    'src/lib/security/__tests__/sqlInjection.test.ts',
    'Only exercises sanitizeSqlInput, which is three string replaces and never ' +
      'touches the DOM. It imports the same module as sanitizeHtml, which is why ' +
      'the taint analysis reaches it.',
  ],
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.includes(path.extname(full))) out.push(full);
  }
  return out;
}

function resolveSpecifier(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package specifier
  for (const ext of ['', ...EXTS]) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  for (const ext of EXTS) {
    const candidate = path.join(base, 'index' + ext);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_RE = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function specifiersOf(source) {
  const specs = [];
  for (const re of [IMPORT_RE, SIDE_EFFECT_RE, DYNAMIC_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) specs.push(m[1]);
  }
  return specs;
}

const files = walk(SRC);
const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

// edges: importer -> [resolved imports]
const imports = new Map();
for (const [file, src] of sources) {
  imports.set(
    file,
    specifiersOf(src)
      .map((s) => (s === 'dompurify' ? 'dompurify' : resolveSpecifier(s, file)))
      .filter(Boolean),
  );
}

// Fixpoint: a module is tainted if it imports dompurify or a tainted module.
const tainted = new Set();
for (const [file, deps] of imports) if (deps.includes('dompurify')) tainted.add(file);
let grew = true;
while (grew) {
  grew = false;
  for (const [file, deps] of imports) {
    if (tainted.has(file)) continue;
    if (deps.some((d) => tainted.has(d))) {
      tainted.add(file);
      grew = true;
    }
  }
}

const isTest = (f) => /\.(test|spec)\.(ts|tsx)$/.test(f);
/** Does this test file make a claim that depends on the sanitizer working? */
const SANITIZATION_CLAIM_RE = /sanitiz|DOMPurify|<script|javascript:|onerror\s*=|<img\s+src/i;
const hasJsdomDocblock = (src) => /@vitest-environment\s+jsdom/.test(src);

const failures = [];
let checked = 0;
for (const [file, src] of sources) {
  if (!isTest(file)) continue;
  const deps = imports.get(file) || [];
  const reaches = deps.some((d) => d === 'dompurify' || tainted.has(d));
  if (!reaches) continue;
  // Reaching DOMPurify is not enough on its own: a page-render or a11y test
  // that happens to pull in a sanitizer through six layers of imports is not
  // making a claim about sanitization, and dragging it onto jsdom buys
  // nothing. The files that matter are the ones whose assertions would be
  // false if the sanitizer under-sanitized.
  if (!SANITIZATION_CLAIM_RE.test(src)) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (EXEMPT.has(rel)) continue;
  checked += 1;
  if (!hasJsdomDocblock(src)) {
    const via = deps
      .filter((d) => d === 'dompurify' || tainted.has(d))
      .map((d) => (d === 'dompurify' ? 'dompurify' : path.relative(ROOT, d).split(path.sep).join('/')));
    failures.push({ rel, via: via[0] });
  }
}

// Guard the guard: the suite default must still be happy-dom, otherwise the
// docblocks above are load-bearing for nothing and this check is theatre.
const config = readFileSync(path.join(ROOT, 'vitest.config.ts'), 'utf8');
const defaultEnv = /environment:\s*'([^']+)'/.exec(config)?.[1];
if (defaultEnv === 'jsdom') {
  console.log(
    'Suite default is already jsdom; per-file @vitest-environment docblocks are ' +
      'redundant. Delete this guard and the docblocks it enforces.',
  );
  process.exit(0);
}

if (failures.length > 0) {
  console.error('Test files reach DOMPurify but do not declare @vitest-environment jsdom:\n');
  for (const f of failures) console.error(`  ${f.rel}  (reaches DOMPurify via ${f.via})`);
  console.error(
    '\nAdd this docblock at the very top of each file:\n\n' +
      '  /**\n   * @vitest-environment jsdom\n   */\n\n' +
      "happy-dom's NodeIterator ends iteration when the current node is removed, so\n" +
      'DOMPurify stops sanitizing at the first node it strips. Assertions about a\n' +
      'payload being removed are meaningless under happy-dom.',
  );
  process.exit(1);
}

console.log(
  `Sanitizer test-env guard: ${checked} test file(s) reach DOMPurify, all declare jsdom ` +
    `(${tainted.size} tainted modules in the src/ import graph).`,
);
