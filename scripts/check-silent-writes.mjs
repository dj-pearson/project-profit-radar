#!/usr/bin/env node
/**
 * Silent-write guard.
 *
 * supabase-js RETURNS errors, it does not throw them. So this:
 *
 *   await supabase.from('time_entries').insert(rows);
 *   localStorage.removeItem('pending_time_entries');
 *
 * runs the second line whether or not the first worked, and a surrounding
 * try/catch never fires. That exact shape was destroying field workers' queued
 * offline data in OfflineDataManager while showing them "Sync Complete", and
 * the same pattern hid the usage_metrics and workflow_step_executions write
 * failures found while working US-237.
 *
 * This counts writes (insert/update/upsert/delete) whose result is discarded
 * entirely or destructured without `error`, and fails if the count grows. The
 * baseline only shrinks.
 *
 * Fixing one means reading the error and doing something with it: surface it to
 * the user, log it, or let it fail the operation. Deciding an error is safe to
 * ignore is fine — destructure it and say so:
 *
 *   const { error } = await supabase.from('x').update(y);
 *   if (error) console.error('...', error);   // or a comment saying why not
 */
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITES = new Set(['insert', 'update', 'upsert', 'delete']);

function walkFiles(dir, out = []) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(d.name)) continue;
    const p = join(dir, d.name);
    if (d.isDirectory()) walkFiles(p, out);
    else if (/\.(ts|tsx)$/.test(d.name) && !/\.test\.|\.spec\./.test(d.name)) out.push(p);
  }
  return out;
}

const files = [
  ...walkFiles(join(root, 'src')),
  ...walkFiles(join(root, 'supabase', 'functions')),
];

const hits = [];
for (const p of files) {
  const text = readFileSync(p, 'utf8');
  if (!/\.from\s*\(/.test(text)) continue;
  const sf = ts.createSourceFile(
    p, text, ts.ScriptTarget.ES2022, true,
    /\.tsx$/.test(p) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
        && WRITES.has(n.expression.name.text)) {
      let cur = n.expression.expression, table = null;
      while (cur) {
        if (ts.isCallExpression(cur)) {
          if (ts.isPropertyAccessExpression(cur.expression) && cur.expression.name.text === 'from'
              && cur.arguments[0] && ts.isStringLiteral(cur.arguments[0])) table = cur.arguments[0].text;
          cur = cur.expression;
        } else if (ts.isPropertyAccessExpression(cur)) cur = cur.expression;
        else break;
      }
      if (table) {
        let top = n;
        while (ts.isPropertyAccessExpression(top.parent) && ts.isCallExpression(top.parent.parent)) {
          top = top.parent.parent;
        }
        let node = top;
        if (ts.isAwaitExpression(node.parent)) node = node.parent;
        const par = node.parent;
        let why = null;
        if (ts.isExpressionStatement(par)) why = 'result discarded';
        else if (ts.isVariableDeclaration(par) && ts.isObjectBindingPattern(par.name)
                 && !par.name.elements.some((e) => (e.propertyName ?? e.name).getText(sf) === 'error')) {
          why = 'destructured without error';
        }
        if (why) {
          hits.push({
            file: relative(root, p),
            line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
            table, op: n.expression.name.text, why,
          });
        }
      }
    }
    n.forEachChild(walk);
  };
  sf.forEachChild(walk);
}

const BASELINE = 263;
const edge = hits.filter((h) => !h.file.startsWith('src/')).length;

console.log('Silent-write guard');
console.log(`  writes whose error is never read: ${hits.length} (baseline ${BASELINE})`);
console.log(`    edge functions: ${edge}`);
console.log(`    web app:        ${hits.length - edge}`);

if (hits.length > BASELINE) {
  console.error(`\n✖ ${hits.length - BASELINE} new silent write(s). supabase-js returns errors rather than throwing, so an unread error is a write that may never have happened:`);
  for (const h of hits.slice(-(hits.length - BASELINE))) {
    console.error(`    - ${h.file}:${h.line} ${h.op} on ${h.table} (${h.why})`);
  }
  console.error('  Read the error, or destructure it and say why it is safe to ignore.');
  process.exit(1);
}

if (hits.length < BASELINE) {
  console.log(`\n  ${BASELINE - hits.length} fixed since the baseline — lower BASELINE in ${relative(root, fileURLToPath(import.meta.url))}.`);
}

console.log(`\n✔ No new silent writes (${hits.length} in the backlog).`);
