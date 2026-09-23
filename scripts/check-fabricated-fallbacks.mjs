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
 *
 * Edge functions (supabase/functions) get a second check, because there the
 * fabrication is not in a catch. check-keyword-positions saved
 * `Math.floor(Math.random() * 50) + 1` to seo_serp_positions as a keyword's
 * Google ranking whenever SERP_API_KEY was unset, and returned it with
 * success: true. So for edge functions this follows a Math.random()-derived
 * VALUE through variables, pushes and helper return values (by symbol, via
 * the type checker, so two variables called `data` are not confused) to two
 * sinks: a supabase write (.insert/.update/.upsert) and a response body
 * (new Response / successResponse). Randomness used to CHOOSE - an index
 * (arr[Math.floor(Math.random() * arr.length)]), a shuffle comparator, an if
 * condition, an id via .toString(36), retry jitter - is not a value and is
 * not followed. Existing hits are baselined per file with a reason, exactly:
 * fixing one fails the guard until its entry is removed.
 */
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
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

function srcOffenders() {
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
  return offenders;
}

// ---------------------------------------------------------------------------
// Edge functions: Math.random()-derived values that reach the DB or a response.
// ---------------------------------------------------------------------------

const FUNCTIONS = join(root, 'supabase', 'functions');

/**
 * Per-file hit counts that were here when the edge check landed, each with
 * the reason it has not been fixed in that change. Exact: a new hit fails, and
 * so does a fixed one until its count is lowered or its entry removed.
 */
const EDGE_BASELINE = new Map([
  // page clicks/impressions/ctr/position and keyword ctr/position/trend are
  // random when the Bing response has no per-page stats; needs a real Bing
  // Webmaster source or nulls, and SEOManager reads these fields.
  ['supabase/functions/bing-search-api/index.ts', { count: 2 }],
  // condition steps pick their branch with Math.random() > 0.5 and the result
  // is saved to workflow_(step_)executions; needs a real condition evaluator,
  // which is a feature, not a one-line fix.
  ['supabase/functions/execute-workflow/index.ts', { count: 3 }],
  // the OpenAI prompt's example JSON and the 12-month historicalTrends are
  // random, then saved to performance_benchmarks; needs monthly history
  // queried from projects.
  ['supabase/functions/generate-performance-benchmarks/index.ts', { count: 2 }],
  // completion dates, confidence, cost variance and revenue forecasts are
  // random around the AI output; the predictions need a model or should be
  // dropped from the response.
  ['supabase/functions/generate-predictive-analytics/index.ts', { count: 1 }],
  // per-project budget/schedule risk and the overall risk scores are random
  // ranges, returned as the assessment; needs scoring from budget and schedule
  // data.
  ['supabase/functions/generate-risk-assessment/index.ts', { count: 1 }],
  // time saved, resource figures, utilization and bottlenecks are random; the
  // optimizer does not exist yet, so this should return an error until it
  // does.
  ['supabase/functions/generate-timeline-optimization/index.ts', { count: 1 }],
  // load time/FCP/LCP/TTI/CLS are simulated in place of PageSpeed Insights and
  // saved as budget violations; needs a PAGESPEED key and a not-configured
  // error like check-keyword-positions.
  ['supabase/functions/monitor-performance-budget/index.ts', { count: 2 }],
  // trendingQueries[].change is a random percentage labelled as mock; needs a
  // previous-period comparison from Search Console.
  ['supabase/functions/seo-analytics/index.ts', { count: 1 }],
  // with no backlink API configured it upserts hard-coded simulated backlinks
  // with random follow/spam/first_seen/status into seo_backlinks; same fix as
  // check-keyword-positions.
  ['supabase/functions/sync-backlinks/index.ts', { count: 2 }],
  // with no SERP data it falls back to random feature presence/ownership and
  // inserts it into seo_serp_positions; same fix as check-keyword-positions
  // (SERP_API_KEY).
  ['supabase/functions/track-serp-features/index.ts', { count: 2 }],
]);

/** Response helpers whose argument becomes the body the caller reads. */
const RESPONSE_HELPER = /^(?:create)?(?:success|json)Response$/;
/** supabase-js write methods. */
const WRITE_METHOD = new Set(['insert', 'update', 'upsert']);

function edgeFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'test' || entry.name === 'node_modules') continue;
      edgeFiles(full, acc);
    } else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function isMathRandomCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Math' &&
    node.expression.name.text === 'random'
  );
}

function isFunctionLike(n) {
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isFunctionExpression(n) ||
    ts.isArrowFunction(n) ||
    ts.isMethodDeclaration(n)
  );
}

/**
 * True when this Math.random() only CHOOSES something - which element, what
 * order, whether a branch runs, an arbitrary id, a retry delay - rather than
 * producing a number that is presented as a fact.
 */
function isChoice(call) {
  // Math.random().toString(36): an id, stands for nothing.
  const p = call.parent;
  if (ts.isPropertyAccessExpression(p) && p.name.text === 'toString') return true;
  let child = call;
  for (let n = call.parent; n; child = n, n = n.parent) {
    // arr[Math.floor(Math.random() * arr.length)]: picks an existing element.
    if (ts.isElementAccessExpression(n) && n.argumentExpression === child) return true;
    // if (Math.random() < rate): control flow, not a value.
    if ((ts.isIfStatement(n) || ts.isWhileStatement(n)) && n.expression === child) return true;
    if (ts.isCallExpression(n) && n.arguments.includes(child)) {
      const callee = n.expression;
      const name = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : ts.isIdentifier(callee)
          ? callee.text
          : '';
      // .sort(() => Math.random() - 0.5): a shuffle. setTimeout/sleep: jitter.
      if (/^(?:sort|setTimeout|sleep|delay|wait)$/.test(name)) return true;
    }
    if (ts.isStatement(n) && !ts.isBlock(n)) break;
  }
  return false;
}

/** A single-file program, so the checker can tell same-named variables apart. */
function checkedSourceFile(fileName, text) {
  const options = { noLib: true, noResolve: true, allowJs: false, target: ts.ScriptTarget.Latest, types: [] };
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (resolve(name) === resolve(fileName) ? sf : undefined);
  host.fileExists = (name) => resolve(name) === resolve(fileName);
  host.readFile = (name) => (resolve(name) === resolve(fileName) ? text : undefined);
  const program = ts.createProgram({ rootNames: [fileName], options, host });
  return { sf: program.getSourceFile(fileName) ?? sf, checker: program.getTypeChecker() };
}

/**
 * Hits in one edge-function source: each is { line, sink, text } for a write
 * or response whose payload carries a Math.random()-derived value.
 */
export function findEdgeFabrications(fileName, text) {
  if (!/Math\.random\s*\(/.test(text)) return [];
  const { sf, checker } = checkedSourceFile(fileName, text);

  const valueRandoms = new Set();
  const walkAll = (n, fn) => {
    fn(n);
    ts.forEachChild(n, (c) => walkAll(c, fn));
  };
  walkAll(sf, (n) => {
    if (isMathRandomCall(n) && !isChoice(n)) valueRandoms.add(n);
  });
  if (valueRandoms.size === 0) return [];

  const tainted = new Set();
  const symbolOf = (id) => {
    if (ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id) {
      return checker.getShorthandAssignmentValueSymbol(id.parent);
    }
    return checker.getSymbolAtLocation(id);
  };
  const taint = (id) => {
    const sym = symbolOf(id);
    if (sym && !tainted.has(sym)) {
      tainted.add(sym);
      return true;
    }
    return false;
  };

  /** Does evaluating this expression carry a random-derived value? */
  const carries = (expr) => {
    let hit = false;
    const scan = (n) => {
      if (hit) return;
      if (valueRandoms.has(n)) {
        hit = true;
        return;
      }
      // arr[randomIndex] is an element that already existed; the index chose
      // it but is not in the value.
      if (ts.isElementAccessExpression(n)) {
        scan(n.expression);
        return;
      }
      if (ts.isIdentifier(n)) {
        const sym = symbolOf(n);
        if (sym && tainted.has(sym)) {
          hit = true;
          return;
        }
      }
      ts.forEachChild(n, scan);
    };
    scan(expr);
    return hit;
  };

  /** Identifiers a binding name declares. */
  const bindingIds = (name, acc = []) => {
    if (ts.isIdentifier(name)) acc.push(name);
    else for (const el of name.elements ?? []) if (ts.isBindingElement(el)) bindingIds(el.name, acc);
    return acc;
  };

  /** The variable an assignment target or a method receiver belongs to. */
  const rootId = (expr) => {
    let e = expr;
    while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isParenthesizedExpression(e)) {
      e = e.expression;
    }
    return ts.isIdentifier(e) ? e : null;
  };

  /** Does a function hand a random-derived value back to its caller? */
  const returnsCarried = (fn) => {
    if (!fn.body) return false;
    if (!ts.isBlock(fn.body)) return carries(fn.body);
    let hit = false;
    const scan = (n) => {
      if (hit || (n !== fn && isFunctionLike(n))) return;
      if (ts.isReturnStatement(n) && n.expression && carries(n.expression)) {
        hit = true;
        return;
      }
      ts.forEachChild(n, scan);
    };
    ts.forEachChild(fn.body, scan);
    return hit;
  };

  // Propagate to a fixpoint: variables, assignments, pushes, helper returns.
  for (let changed = true; changed; ) {
    changed = false;
    walkAll(sf, (n) => {
      if (ts.isVariableDeclaration(n) && n.initializer) {
        const init = n.initializer;
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          if (ts.isIdentifier(n.name) && returnsCarried(init)) changed = taint(n.name) || changed;
        } else if (carries(init)) {
          for (const id of bindingIds(n.name)) changed = taint(id) || changed;
        }
      } else if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name && ts.isIdentifier(n.name)) {
        if (returnsCarried(n)) changed = taint(n.name) || changed;
      } else if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        n.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
        carries(n.right)
      ) {
        const id = rootId(n.left);
        if (id) changed = taint(id) || changed;
      } else if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        /^(?:push|unshift|set|add|splice)$/.test(n.expression.name.text) &&
        n.arguments.some(carries)
      ) {
        const id = rootId(n.expression.expression);
        if (id) changed = taint(id) || changed;
      }
    });
  }

  const hits = [];
  const record = (node, sink) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    hits.push({ line, sink, text: node.getText(sf).slice(0, 70).replace(/\s+/g, ' ') });
  };
  walkAll(sf, (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      if (WRITE_METHOD.has(n.expression.name.text) && n.arguments.some(carries)) {
        record(n, 'writes it to the database');
      }
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && RESPONSE_HELPER.test(n.expression.text)) {
      if (n.arguments.some(carries)) record(n, 'returns it in the response');
    }
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Response') {
      if (n.arguments?.[0] && carries(n.arguments[0])) record(n, 'returns it in the response');
    }
  });
  return hits;
}

function edgeReport() {
  const byFile = new Map();
  for (const file of edgeFiles(FUNCTIONS)) {
    const hits = findEdgeFabrications(file, readFileSync(file, 'utf8'));
    if (hits.length) byFile.set(relative(root, file), hits);
  }
  const problems = [];
  for (const [file, hits] of byFile) {
    const allowed = EDGE_BASELINE.get(file)?.count ?? 0;
    if (hits.length > allowed) {
      problems.push(`${file}: ${hits.length} hit(s), baseline ${allowed}`);
      for (const h of hits) problems.push(`    ${h.line}: ${h.sink}: ${h.text}`);
    }
  }
  for (const [file, { count }] of EDGE_BASELINE) {
    const found = byFile.get(file)?.length ?? 0;
    if (found < count) {
      problems.push(
        `${file}: ${found} hit(s), baseline ${count} - fixed, so lower its entry in EDGE_BASELINE ` +
          '(remove it at 0). The baseline only shrinks.'
      );
    }
  }
  const total = [...byFile.values()].reduce((n, h) => n + h.length, 0);
  return { problems, total, byFile };
}

function main() {
  const offenders = srcOffenders();
  const edge = edgeReport();
  let failed = false;

  if (offenders.length) {
    failed = true;
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
  }

  if (edge.problems.length) {
    failed = true;
    console.error(
      '::error::An edge function writes or returns a Math.random()-derived value as data. ' +
        'Nobody measured it, and the row or response reads exactly like one somebody did:'
    );
    for (const p of edge.problems) console.error(`  - ${p}`);
    console.error('');
    console.error(
      '  With no real source, return an error envelope saying what is not configured ' +
        '(see supabase/functions/_shared/keyword-positions.ts) or leave the field null.'
    );
  }

  if (failed) process.exit(1);
  console.log('No catch block returns fabricated data.');
  console.log(
    `Edge functions: ${edge.total} Math.random()-derived write/response hit(s), ` +
      `all baselined across ${EDGE_BASELINE.size} file(s).`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

