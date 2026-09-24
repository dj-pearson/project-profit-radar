#!/usr/bin/env node
/**
 * Edge-function error-reporting guard (US-251).
 *
 * Every edge function's top-level catch has to hand the error to
 * captureException from _shared/observability.ts. Before US-251 the 200-odd
 * functions only console.error'd, so a billing webhook or a cron job that
 * started failing at 3am paged nobody. captureException is a no-op until
 * EDGE_SENTRY_DSN is set, so wiring it in costs nothing where the DSN is absent.
 *
 * "Top-level catch" means a catch clause whose try statement sits directly in
 * the request handler's body: the handler passed to serve()/Deno.serve(), or
 * the default export for the self-hosted functions that export a handler
 * instead. A catch nested deeper (inside a loop, a helper, a per-row retry) is
 * handled locally and is not what this guard asks about; the outermost one is
 * where an unexpected failure ends up and turns into a 500.
 *
 * A handler with no single outer try/catch (a run of independent steps, or
 * one that deliberately lets a failure escape) is wrapped instead:
 *
 *   serve(withErrorReporting('<fn>', async (req) => { ... }));
 *
 * which reports anything that escapes and rethrows it. The wrapper never sees
 * an error the handler catches and answers itself, so a wrapped handler whose
 * last statement is a try/catch still has to report in that catch.
 *
 * Each call has to name the function it lives in (fn: '<directory>'); a
 * copy-pasted catch that files errors under another function's name counts as
 * unreported.
 *
 * Each function lands in one of four buckets:
 *   reported     every top-level catch calls captureException(, or the
 *                handler is wrapped in withErrorReporting(
 *   unreported   at least one top-level catch does not, or a call names the
 *                wrong function
 *   no-catch     the handler has no top-level try/catch at all, so a throw
 *                escapes to the runtime and is never reported
 *   no-handler   the scanner could not find the handler (a new entry-point shape)
 *
 * The ratchet is exact: the unreported, no-catch and no-handler counts must
 * equal BASELINE (all zero), so any function that stops reporting fails, and
 * so does one whose handler shape the scanner cannot read.
 *
 *   node scripts/check-edge-error-reporting.mjs          check
 *   node scripts/check-edge-error-reporting.mjs --list   also print every function's bucket
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(root, 'supabase', 'functions');

/**
 * Exact counts of functions that do NOT report. All zero since 2026-09-24 (197
 * functions). The reported total is printed but not pinned: a new function
 * that reports is not drift, and pinning it would make every new function
 * edit this file. If a count here ever has to go above zero, that is a
 * decision to write down next to the number, not a baseline bump.
 */
const BASELINE = {
  unreported: 0,
  'no-catch': 0,
  'no-handler': 0,
};

const REPORTS = /\bcaptureException\s*\(/g;
const WRAPPED = /^\s*withErrorReporting\s*\(\s*['"]([^'"]+)['"]\s*,\s*/;

// ---------------------------------------------------------------------------
// A small TypeScript-aware brace scanner. It only needs to know which braces
// are code, so it skips strings, template literal text, comments and regex
// literals, and records every `{`/`}` with its nesting depth.
// ---------------------------------------------------------------------------

const REGEX_PRECEDERS = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_KEYWORDS = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'await', 'yield']);

/**
 * Returns an array `code` of the same length as src where code[i] is true when
 * src[i] is code (not inside a string, comment, template text or regex).
 */
export function codeMask(src) {
  const code = new Uint8Array(src.length);
  const templateDepth = []; // brace depth at which each open ${ started
  let depth = 0;
  let i = 0;
  let lastSignificant = ''; // last non-space code char
  let lastWord = '';

  const scanTemplate = () => {
    // i is just past a backtick or a closing } of ${...}; consume template text.
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; lastSignificant = '`'; lastWord = ''; return; }
      if (c === '$' && src[i + 1] === '{') {
        code[i] = 1; code[i + 1] = 1;
        templateDepth.push(depth);
        depth++;
        i += 2;
        lastSignificant = '{'; lastWord = '';
        return;
      }
      i++;
    }
  };

  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
      i++;
      lastSignificant = c; lastWord = '';
      continue;
    }
    if (c === '`') { i++; scanTemplate(); continue; }
    if (c === '/' && (REGEX_PRECEDERS.has(lastSignificant) || lastSignificant === '' || REGEX_KEYWORDS.has(lastWord))) {
      i++;
      let inClass = false;
      while (i < src.length && src[i] !== '\n') {
        const r = src[i];
        if (r === '\\') { i += 2; continue; }
        if (r === '[') inClass = true;
        else if (r === ']') inClass = false;
        else if (r === '/' && !inClass) break;
        i++;
      }
      i++;
      while (/[a-z]/i.test(src[i] ?? '')) i++;
      lastSignificant = '/'; lastWord = '';
      continue;
    }
    if (c === '}' && templateDepth.length && templateDepth[templateDepth.length - 1] === depth - 1) {
      code[i] = 1;
      templateDepth.pop();
      depth--;
      i++;
      scanTemplate();
      continue;
    }
    code[i] = 1;
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (/[A-Za-z0-9_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) { code[j] = 1; j++; }
      lastWord = src.slice(i, j);
      lastSignificant = src[j - 1];
      i = j;
      continue;
    }
    if (!/\s/.test(c)) { lastSignificant = c; lastWord = ''; }
    i++;
  }
  return code;
}

/** Index of the brace matching the `{` at `open`, or -1. */
export function matchBrace(src, mask, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (!mask[i]) continue;
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function firstCodeMatch(src, mask, re, from = 0) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  g.lastIndex = from;
  let m;
  while ((m = g.exec(src))) {
    if (mask[m.index]) return m;
  }
  return null;
}

/** Find the body of a function expression starting at `at` (async (req) => {...} / function (req) {...}). */
function functionBodyAt(src, mask, at) {
  const head = src.slice(at, at + 400);
  const arrow = /^\s*(?:async\s+)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?::\s*[^=]+?)?\s*=>\s*/.exec(head);
  if (arrow) {
    const open = at + arrow[0].length;
    if (src[open] !== '{') return null;
    return { open, param: paramName(arrow[1] ?? arrow[2]) };
  }
  const fnExpr = /^\s*(?:async\s+)?function\s*[\w$]*\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\{/.exec(head);
  if (fnExpr) return { open: at + fnExpr[0].length - 1, param: paramName(fnExpr[1]) };
  return null;
}

function paramName(params) {
  if (!params) return null;
  const first = params.split(',')[0].trim();
  const m = /^([A-Za-z_$][\w$]*)/.exec(first);
  return m ? m[1] : null;
}

/** Locate a named function/const in the file and return its body. */
function namedFunctionBody(src, mask, name) {
  const decl = firstCodeMatch(src, mask, new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(([^)]*)\\)[^{]*\\{`));
  if (decl) return { open: decl.index + decl[0].length - 1, param: paramName(decl[1]) };
  const cnst = firstCodeMatch(src, mask, new RegExp(`(?:const|let)\\s+${name}\\s*(?::[^=]+)?=\\s*`));
  if (cnst) return functionBodyAt(src, mask, cnst.index + cnst[0].length);
  return null;
}

/**
 * Find the request handler's body: { open, close, param } or null.
 */
export function findHandler(src, mask = codeMask(src)) {
  const serve = firstCodeMatch(src, mask, /\b(?:Deno\.)?serve\s*\(/);
  if (serve) {
    let at = serve.index + serve[0].length;
    const wrap = WRAPPED.exec(src.slice(at, at + 200));
    if (wrap) {
      const found = functionBodyAt(src, mask, at + wrap[0].length);
      const close = found ? matchBrace(src, mask, found.open) : -1;
      if (close > 0) return { ...found, close, wrappedAs: wrap[1] };
    }
    // serve({ port }, handler) / serve(handler, { port })
    const direct = functionBodyAt(src, mask, at);
    let found = direct;
    if (!found) {
      const ident = /^\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(src.slice(at, at + 200));
      if (ident) found = namedFunctionBody(src, mask, ident[1]);
    }
    if (found) {
      const close = matchBrace(src, mask, found.open);
      if (close > 0) return { ...found, close };
    }
  }
  const def = firstCodeMatch(src, mask, /\bexport\s+default\s+/);
  if (def) {
    const at = def.index + def[0].length;
    const wrap = WRAPPED.exec(src.slice(at, at + 200));
    if (wrap) {
      const found = functionBodyAt(src, mask, at + wrap[0].length);
      const close = found ? matchBrace(src, mask, found.open) : -1;
      if (close > 0) return { ...found, close, wrappedAs: wrap[1] };
    }
    let found = functionBodyAt(src, mask, at);
    if (!found) {
      const ident = /^\s*([A-Za-z_$][\w$]*)\s*;?/.exec(src.slice(at, at + 200));
      if (ident) found = namedFunctionBody(src, mask, ident[1]);
    }
    if (found) {
      const close = matchBrace(src, mask, found.open);
      if (close > 0) return { ...found, close };
    }
  }
  return null;
}

/**
 * Catch clauses whose try sits directly in the handler body.
 * Each: { at, binding, open, close } where open/close are the catch block braces.
 */
export function topLevelCatches(src, mask, handler) {
  const out = [];
  let depth = 0;
  for (let i = handler.open + 1; i < handler.close; i++) {
    if (!mask[i]) continue;
    const c = src[i];
    if (c === '{') { depth++; continue; }
    if (c === '}') { depth--; continue; }
    if (depth === 0 && c === 't' && src.startsWith('try', i) && !/[\w$]/.test(src[i - 1] ?? '') && /^try\s*\{/.test(src.slice(i, i + 20))) {
      const tryOpen = src.indexOf('{', i);
      const tryClose = matchBrace(src, mask, tryOpen);
      const after = /^\s*catch\s*(?:\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*)?\{/.exec(src.slice(tryClose + 1, tryClose + 200));
      if (after) {
        const open = tryClose + after[0].length;
        const close = matchBrace(src, mask, open);
        out.push({ at: tryClose + 1, binding: after[1] ?? null, open, close });
        i = close; // continue scanning after the catch block (depth unchanged)
      } else {
        i = tryClose;
      }
    }
  }
  return out;
}

/** The fn: names passed to captureException calls inside [from, to). */
function reportedNames(src, from, to) {
  const body = src.slice(from, to);
  const names = [];
  REPORTS.lastIndex = 0;
  let m;
  while ((m = REPORTS.exec(body))) {
    const fn = /\bfn\s*:\s*['"]([^'"]+)['"]/.exec(body.slice(m.index, m.index + 300));
    names.push(fn ? fn[1] : null);
  }
  return names;
}

/**
 * Classify one entry-point source. `name` is the function's directory; when
 * given, a report tagged with any other fn name counts as unreported, because
 * a copy-pasted catch files the error under the wrong function.
 *
 * A handler wrapped in withErrorReporting() is covered for anything that
 * escapes it. If it also ends in a try/catch (the catch-all shape), that catch
 * answers the request itself and the wrapper never sees the error, so it still
 * has to report.
 */
export function classify(src, name = null) {
  const mask = codeMask(src);
  const handler = findHandler(src, mask);
  if (!handler) return { bucket: 'no-handler' };
  const catches = topLevelCatches(src, mask, handler);
  const reportsHere = (c) => {
    const names = reportedNames(src, c.open, c.close);
    return names.length > 0 && (!name || names.every((n) => n === name));
  };
  if (handler.wrappedAs) {
    if (name && handler.wrappedAs !== name) return { bucket: 'unreported', handler, catches, missing: [], wrongName: handler.wrappedAs };
    const last = catches[catches.length - 1];
    const endsInCatch = last && !src.slice(last.close + 1, handler.close).trim();
    if (endsInCatch && !reportsHere(last)) return { bucket: 'unreported', handler, catches, missing: [last] };
    return { bucket: 'reported', handler, catches, missing: [] };
  }
  if (!catches.length) return { bucket: 'no-catch', handler };
  const missing = catches.filter((c) => !reportsHere(c));
  return { bucket: missing.length ? 'unreported' : 'reported', handler, catches, missing };
}

function functionDirs() {
  return readdirSync(FN, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name)
    .filter((n) => existsSync(join(FN, n, 'index.ts')))
    .sort();
}

function main() {
  const list = process.argv.includes('--list');
  const buckets = { reported: [], unreported: [], 'no-catch': [], 'no-handler': [] };
  for (const name of functionDirs()) {
    const { bucket } = classify(readFileSync(join(FN, name, 'index.ts'), 'utf8'), name);
    buckets[bucket].push(name);
  }

  console.log('Edge-function error-reporting guard (US-251)');
  for (const [k, v] of Object.entries(buckets)) {
    const base = k in BASELINE ? ` (baseline ${BASELINE[k]})` : '';
    console.log(`  ${k.padEnd(11)} ${String(v.length).padStart(4)}${base}`);
    if (list || (k !== 'reported' && v.length)) for (const n of v) console.log(`      ${n}`);
  }

  const drift = Object.keys(BASELINE).filter((k) => buckets[k].length !== BASELINE[k]);
  if (drift.length) {
    console.error('\nFAIL: counts moved off the exact baseline:');
    for (const k of drift) console.error(`  ${k}: ${buckets[k].length}, baseline ${BASELINE[k]}`);
    console.error('\n  A top-level catch in supabase/functions/<fn>/index.ts must call');
    console.error("    await captureException(error, { fn: '<fn>', req });");
    console.error("  from '../_shared/observability.ts', or the handler must be wrapped in");
    console.error("    serve(withErrorReporting('<fn>', async (req) => { ... }));");
    console.error('  no-handler means the scanner does not know the entry-point shape: teach');
    console.error('  findHandler() in this script rather than raising the baseline.');
    process.exit(1);
  }
  console.log(`\nOK: all ${buckets.reported.length} edge functions report their top-level failures.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
