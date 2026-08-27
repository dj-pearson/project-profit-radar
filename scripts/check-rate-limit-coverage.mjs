#!/usr/bin/env node
/**
 * Rate-limit coverage guard (US-243).
 *
 * Some edge functions spend money on every call — LLM tokens, Whisper
 * transcription, SES sends. Without a per-caller ceiling, a compromised token
 * running one in a loop is a billing incident rather than just load. The limiter
 * has existed in _shared/rate-limiter.ts all along; the gap was that these
 * functions never called it.
 *
 * EXPENSIVE lists the functions that must enforce a limit. Add to it whenever a
 * new function calls a paid API or fans out into heavy work; only remove a name
 * when the function itself goes away.
 *
 * Key the limit on a user id, not an IP and never on anything from the request
 * body — a body field is attacker-controlled, so a caller can rotate it and
 * never hit the ceiling. process-voice-command takes user_id in its body for
 * other purposes and deliberately does not use it here.
 */
import ts from 'typescript';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(root, 'supabase', 'functions');

const EXPENSIVE = new Map([
  ['generate-blog-content', 'LLM generation'],
  ['enhanced-blog-ai', 'LLM generation'],
  ['ai-content-generator', 'LLM generation'],
  ['ai-estimating', 'LLM generation'],
  ['smart-data-analyzer', 'LLM analysis of uploaded data'],
  ['generate-cash-flow-forecast', 'LLM forecasting'],
  ['analyze-support-ticket', 'LLM classification'],
  ['voice-to-text', 'Whisper transcription, billed per request'],
  ['process-voice-command', 'Whisper plus an LLM round trip'],
  ['generate-custom-report', 'heavy query fan-out, AI-assisted'],

  // SES-backed senders. Unbounded sending burns quota and, worse, sender
  // reputation — and the unauthenticated ones are an open relay for bombing
  // someone's inbox. send-auth-otp also keeps a per-email throttle, which is a
  // different control: per-email stops one address being targeted, per-IP stops
  // one source spraying across many. Both are wanted.
  ['send-email', 'generic SES sender'],
  ['send-auth-otp', 'sends OTP mail, unauthenticated'],
  ['signup-with-otp', 'sends OTP mail, unauthenticated'],
  ['reset-password-otp', 'sends OTP mail, unauthenticated'],
]);

const CALLS_LIMITER = /\benforceRateLimit\s*\(|\bcheckRateLimit\s*\(/;

// US-307: the limiter now writes rate_limit_state through the consume_rate_limit
// RPC, and EXECUTE on that function is granted to service_role alone. A
// user-JWT client here means the RPC is refused, checkRateLimit fails open, and
// the limit silently never applies again - which is the exact failure this
// story existed to fix, so it needs a guard rather than a comment.
const LIMITER_FNS = new Set(['enforceRateLimit', 'checkRateLimit']);

function limiterClientHits(name, text) {
  const sf = ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  // Two passes, because the service-role key is usually held in a variable:
  //   const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  //   const client = createClient(url, key)
  // so looking for SERVICE_ROLE_KEY inside the createClient call misses it.
  const serviceKeyVars = new Set();
  const serviceClients = new Set();
  const collect = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)) {
      const init = n.initializer.getText(sf);
      if (/SERVICE_ROLE_KEY/.test(init)) serviceKeyVars.add(n.name.text);
    }
    n.forEachChild(collect);
  };
  sf.forEachChild(collect);

  const classify = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)) {
      const init = n.initializer.getText(sf);
      if (/createServiceClient\s*\(/.test(init)) serviceClients.add(n.name.text);
      else if (/createClient\s*\(/.test(init)) {
        const usesServiceKey =
          /SERVICE_ROLE_KEY/.test(init) ||
          [...serviceKeyVars].some((v) => new RegExp(`\\b${v}\\b`).test(init));
        if (usesServiceKey) serviceClients.add(n.name.text);
      }
    }
    n.forEachChild(classify);
  };
  sf.forEachChild(classify);

  const out = [];
  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)
        && LIMITER_FNS.has(n.expression.text)) {
      const arg = n.arguments[0];
      if (arg) {
        // createServiceClient() passed inline.
        const inline = ts.isCallExpression(arg) && ts.isIdentifier(arg.expression)
          && arg.expression.text === 'createServiceClient';
        const named = ts.isIdentifier(arg) && serviceClients.has(arg.text);
        if (!inline && !named) {
          out.push({ name, arg: arg.getText(sf).slice(0, 40), line: lineOf(n) });
        }
      }
    }
    n.forEachChild(walk);
  };
  sf.forEachChild(walk);
  return out;
}

const clientHits = [];

const covered = [];
const missing = [];
const gone = [];
// Every function that calls the limiter, not only the expensive ones: passing
// the wrong client is just as silent in capture-lead or verify-mfa-login.
for (const d of readdirSync(FN, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === '_shared') continue;
  const idx = join(FN, d.name, 'index.ts');
  if (!existsSync(idx)) continue;
  const text = readFileSync(idx, 'utf8');
  if (!CALLS_LIMITER.test(text)) continue;
  clientHits.push(...limiterClientHits(d.name, text));
}

for (const [name, why] of EXPENSIVE) {
  const idx = join(FN, name, 'index.ts');
  if (!existsSync(idx)) { gone.push(name); continue; }
  (CALLS_LIMITER.test(readFileSync(idx, 'utf8')) ? covered : missing).push({ name, why });
}

console.log('Rate-limit coverage guard (US-243)');
console.log(`  expensive functions tracked: ${EXPENSIVE.size}`);
console.log(`  enforcing a limit:           ${covered.length}`);
console.log(`  limiter calls on a non-service client: ${clientHits.length}`);

if (gone.length) {
  console.error(`\n✖ Tracked function(s) no longer exist — update EXPENSIVE in ${relative(root, fileURLToPath(import.meta.url))}: ${gone.join(', ')}`);
  process.exit(1);
}

if (missing.length) {
  console.error('\n✖ These spend money per call and enforce no rate limit:');
  for (const m of missing) console.error(`    - ${m.name}: ${m.why}`);
  console.error('  Use enforceRateLimit() from _shared/rate-limiter.ts, keyed on the caller user id.');
  process.exit(1);
}

if (clientHits.length) {
  console.error('\n\u2716 These pass a non-service-role client to the rate limiter:');
  for (const h of clientHits) console.error(`    - ${h.name} line ${h.line}: ${h.arg}`);
  console.error(
    '  consume_rate_limit is granted to service_role only, so the RPC is refused and',
  );
  console.error(
    '  checkRateLimit fails open - the limit silently stops applying. Pass',
  );
  console.error('  createServiceClient() from _shared/service-client.ts.');
  process.exit(1);
}

console.log(`\n✔ Every expensive function enforces a rate limit (${covered.length}/${EXPENSIVE.size}).`);
console.log('✔ Every limiter call passes a service-role client.');
