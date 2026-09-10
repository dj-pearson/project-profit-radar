#!/usr/bin/env node
/**
 * A failed query must not be answered with invented data.
 *
 * CustomReportBuilder caught every error from its report query - an RLS
 * denial, a missing column, a dropped connection - and returned 10 to 30 rows
 * of `Math.floor(Math.random() * 10000) + 1000` from generateMockData. The
 * caller then showed "Report generated successfully" and offered the result as
 * an Excel export. A contractor could send a client a spreadsheet of numbers
 * that were never in the database, and nothing anywhere said so.
 *
 * This is not the US-309 shape. There, a write announces success having
 * written nothing. Here a READ fails and its failure is replaced by fiction,
 * so the screen looks identical whether the data is real or the query is
 * broken - which also means the underlying breakage never gets reported.
 *
 * Detection is deliberately narrow, because the broad version is useless: 23
 * files legitimately pair a supabase query with Math.random for filenames,
 * ids and retry jitter, and a guard that flags those gets baselined and
 * ignored. So this walks the AST for one specific shape - a `catch` block that
 * returns generated data, either inline or via a generator defined in the same
 * file - and stays quiet about everything else.
 *
 * An empty result and a failed query are different answers. Say which.
 */
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/** Marks of fabrication inside a returned value. */
const FABRICATED = /Math\.random\s*\(|\bfaker\b/;

/**
 * A generated IDENTIFIER is not fabricated data. realUserMonitoring falls back
 * to `${Date.now()}-${Math.random().toString(36)...}` for a session id when
 * sessionStorage is unavailable, which is correct - the id is arbitrary by
 * design and stands for nothing. What this guard is for is a value the user
 * reads as a fact: rows, totals, metrics. Randomness base-36'd into a string
 * is an id; randomness scaled into a number or spread across an array is a
 * claim.
 */
const IDENTIFIER_SHAPE = /Math\.random\s*\(\s*\)\s*\.toString\s*\(/;

/** Names that admit to it, for a generator called from the catch. */
const GENERATOR_NAME = /^(?:generate|get|build|make|create)?_?(?:mock|sample|fake|dummy|demo|placeholder)/i;

function sourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'test') continue;
      sourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const offenders = [];

for (const file of sourceFiles(SRC)) {
  const text = readFileSync(file, 'utf8');
  // Cheap gate: no catch, or nothing that could fabricate, and there is
  // nothing to walk the AST for.
  if (!text.includes('catch') || !FABRICATED.test(text)) continue;

  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  /** Local functions whose body fabricates, by name. */
  const fabricators = new Map();
  const collect = (node) => {
    let name = null;
    let body = null;
    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.text;
      body = node.body;
    } else if (
      ts.isVariableDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      name = node.name.text;
      body = node.initializer.body;
    }
    if (name && body && FABRICATED.test(body.getText(sf))) fabricators.set(name, true);
    ts.forEachChild(node, collect);
  };
  collect(sf);

  const visit = (node) => {
    if (ts.isCatchClause(node)) {
      const seen = new Set();
      const scan = (n) => {
        if (ts.isReturnStatement(n) && n.expression) {
          const returned = n.expression.getText(sf);
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          const fabricatedNotJustAnId =
            FABRICATED.test(returned) &&
            returned.replace(new RegExp(IDENTIFIER_SHAPE.source, 'g'), '').match(FABRICATED);
          if (fabricatedNotJustAnId) {
            seen.add(`${line}: returns ${returned.slice(0, 70).replace(/\s+/g, ' ')}`);
          } else {
            // return someGenerator(...) where someGenerator fabricates here.
            const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(returned);
            const callee = call?.[1];
            if (callee && (fabricators.has(callee) || GENERATOR_NAME.test(callee))) {
              seen.add(`${line}: returns ${callee}(), which fabricates`);
            }
          }
        }
        // Do not descend into a nested function: its return is not this
        // catch's answer to the caller.
        if (
          ts.isFunctionDeclaration(n) ||
          ts.isFunctionExpression(n) ||
          ts.isArrowFunction(n) ||
          ts.isMethodDeclaration(n)
        ) {
          return;
        }
        ts.forEachChild(n, scan);
      };
      ts.forEachChild(node.block, scan);
      for (const s of seen) offenders.push(`${relative(root, file)}:${s}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (offenders.length) {
  console.error(
    '::error::A catch block answers a failed query with invented data. The screen ' +
      'then looks the same whether the data is real or the query is broken:'
  );
  for (const o of offenders) console.error(`  - ${o}`);
  console.error('');
  console.error(
    '  Let the error reach the caller and say so in the UI. An empty result and a ' +
      'failed query are different answers, and only one of them is safe to export.'
  );
  process.exit(1);
}

console.log('No catch block returns fabricated data.');
