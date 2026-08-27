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
import { readFileSync, existsSync } from 'node:fs';
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
]);

const CALLS_LIMITER = /\benforceRateLimit\s*\(|\bcheckRateLimit\s*\(/;

const covered = [];
const missing = [];
const gone = [];
for (const [name, why] of EXPENSIVE) {
  const idx = join(FN, name, 'index.ts');
  if (!existsSync(idx)) { gone.push(name); continue; }
  (CALLS_LIMITER.test(readFileSync(idx, 'utf8')) ? covered : missing).push({ name, why });
}

console.log('Rate-limit coverage guard (US-243)');
console.log(`  expensive functions tracked: ${EXPENSIVE.size}`);
console.log(`  enforcing a limit:           ${covered.length}`);

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

console.log(`\n✔ Every expensive function enforces a rate limit (${covered.length}/${EXPENSIVE.size}).`);
