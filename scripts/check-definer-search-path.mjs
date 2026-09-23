#!/usr/bin/env node
/**
 * US-353: every SECURITY DEFINER function must pin its search_path.
 *
 * A SECURITY DEFINER function runs with its owner's rights. Without SET
 * search_path, an unqualified name in its body resolves through the CALLER's
 * search_path, so a caller who can create an object earlier on that path
 * (a temp table or function in pg_temp, say) can have the owner run it.
 *
 * Replays supabase/migrations in order and tracks, per function, whether its
 * latest definition is SECURITY DEFINER and whether a SET search_path applies
 * (in the CREATE, or a later ALTER FUNCTION ... SET search_path). A function
 * is keyed by schema-less name and argument count, which separates the
 * overloads that exist here.
 *
 * Two gates, like check-rls-policies.mjs:
 *   - a migration newer than BASELINE that leaves a definer function without
 *     search_path fails outright;
 *   - the historical backlog is a ratchet: the count may fall, never rise.
 *     When it falls, lower BACKLOG to lock it in.
 *
 * Run with --list to print the backlog.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'supabase', 'migrations');
const BASELINE = '20260923020000';
const BACKLOG = Number(process.env.DEFINER_BACKLOG_OVERRIDE ?? NaN) || 0;

const stripComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

function argCount(args) {
  const inner = args.trim();
  if (!inner) return 0;
  let depth = 0, n = 1;
  for (const ch of inner) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) n++;
  }
  return n;
}

// Text between the name's opening paren and its matching close.
function readArgs(sql, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') { depth--; if (depth === 0) return { args: sql.slice(openIdx + 1, i), end: i + 1 }; }
  }
  return null;
}

const NAME = String.raw`(?:(?:"?[\w]+"?)\.)?"?([\w]+)"?`;
const CREATE_RE = new RegExp(String.raw`CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+${NAME}\s*\(`, 'gi');
const ALTER_RE = new RegExp(String.raw`ALTER\s+FUNCTION\s+${NAME}\s*(\()?`, 'gi');
const DROP_RE = new RegExp(String.raw`DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?${NAME}\s*(\()?`, 'gi');

// Migrations that pin every definer function live at the time they run, from
// pg_proc, which a file replay cannot see statement by statement.
const PIN_ALL = new Set(['20260923030000_pin_definer_search_path.sql']);

const state = new Map(); // key -> { definer, pinned, file }
const newViolations = [];

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
for (const file of files) {
  const sql = stripComments(readFileSync(join(DIR, file), 'utf8'));
  const events = [];

  for (const m of sql.matchAll(CREATE_RE)) {
    const a = readArgs(sql, m.index + m[0].length - 1);
    if (!a) continue;
    // Body: first dollar-quote after the signature, to its matching close.
    const rest = sql.slice(a.end);
    const open = rest.match(/\$([A-Za-z_]*)\$/);
    if (!open) continue;
    const bodyStart = open.index + open[0].length;
    const close = rest.indexOf(open[0], bodyStart);
    if (close === -1) continue;
    const semi = rest.indexOf(';', close + open[0].length);
    const header = rest.slice(0, open.index);
    const trailer = rest.slice(close + open[0].length, semi === -1 ? undefined : semi);
    const attrs = header + ' ' + trailer;
    events.push({
      at: m.index, kind: 'create', key: `${m[1].toLowerCase()}/${argCount(a.args)}`,
      definer: /SECURITY\s+DEFINER/i.test(attrs),
      pinned: /SET\s+search_path/i.test(attrs),
    });
  }

  for (const m of sql.matchAll(ALTER_RE)) {
    const semi = sql.indexOf(';', m.index);
    const stmt = sql.slice(m.index, semi === -1 ? undefined : semi);
    let keys;
    if (m[2]) {
      const a = readArgs(sql, m.index + m[0].length - 1);
      keys = a ? [`${m[1].toLowerCase()}/${argCount(a.args)}`] : [];
    } else {
      keys = [...state.keys()].filter((k) => k.startsWith(`${m[1].toLowerCase()}/`));
    }
    events.push({
      at: m.index, kind: 'alter', keys,
      pin: /SET\s+search_path/i.test(stmt),
      invoker: /SECURITY\s+INVOKER/i.test(stmt),
      definer: /SECURITY\s+DEFINER/i.test(stmt),
    });
  }

  for (const m of sql.matchAll(DROP_RE)) {
    let keys;
    if (m[2]) {
      const a = readArgs(sql, m.index + m[0].length - 1);
      keys = a ? [`${m[1].toLowerCase()}/${argCount(a.args)}`] : [];
    } else {
      keys = [...state.keys()].filter((k) => k.startsWith(`${m[1].toLowerCase()}/`));
    }
    events.push({ at: m.index, kind: 'drop', keys });
  }

  if (PIN_ALL.has(file)) {
    for (const st of state.values()) if (st.definer) st.pinned = true;
  }

  events.sort((x, y) => x.at - y.at);
  for (const e of events) {
    if (e.kind === 'create') {
      state.set(e.key, { definer: e.definer, pinned: e.pinned, file });
    } else if (e.kind === 'alter') {
      for (const k of e.keys) {
        const s = state.get(k);
        if (!s) continue;
        if (e.pin) s.pinned = true;
        if (e.invoker) s.definer = false;
        if (e.definer) s.definer = true;
      }
    } else {
      for (const k of e.keys) state.delete(k);
    }
  }

  if (file.slice(0, 14) > BASELINE) {
    for (const e of events) {
      if (e.kind !== 'create') continue;
      const s = state.get(e.key);
      if (s && s.definer && !s.pinned && s.file === file) newViolations.push(`${file}: ${e.key}`);
    }
  }
}

const backlog = [...state.entries()].filter(([, s]) => s.definer && !s.pinned);

console.log('SECURITY DEFINER search_path guard (US-353)');
console.log(`  functions tracked:           ${state.size}`);
console.log(`  definer, no search_path:     ${backlog.length} (backlog ${BACKLOG})`);
if (process.argv.includes('--list')) {
  for (const [k, s] of backlog.sort()) console.log(`    ${k.padEnd(48)} ${s.file}`);
}

let fail = false;
if (newViolations.length) {
  console.error('\n✖ New SECURITY DEFINER function(s) without SET search_path:');
  for (const v of newViolations) console.error(`    ${v}`);
  console.error("  Add SET search_path = '' and schema-qualify every name in the body.");
  fail = true;
}
if (backlog.length > BACKLOG) {
  console.error(`\n✖ The backlog grew from ${BACKLOG} to ${backlog.length}.`);
  fail = true;
} else if (backlog.length < BACKLOG) {
  console.log(`\n  Backlog is down to ${backlog.length}. Lower BACKLOG in scripts/check-definer-search-path.mjs to lock it in.`);
}
if (fail) process.exit(1);
console.log('\n✔ No new SECURITY DEFINER functions without a pinned search_path.');
