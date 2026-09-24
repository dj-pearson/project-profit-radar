#!/usr/bin/env node
/**
 * Every environment name Brikly reads is documented, in one generated place
 * (US-392).
 *
 * Sixty-nine Deno.env.get names were read across supabase/functions and three
 * of them appeared in any doc, so whoever deployed next had to grep to learn
 * what to set. The web app's own URL was read under three names and the
 * functions base URL under two.
 *
 * This script builds docs/EDGE_SECRETS.md from the code:
 *   - every Deno.env.get('NAME') literal under supabase/functions (tests
 *     excluded), attributed to each function that reaches the reading file
 *     through relative imports, so a read in _shared/ lists its real callers;
 *   - the names _shared/app-urls.ts reads for siteUrl()/functionsBaseUrl(),
 *     taken from its ENV_ALIASES table;
 *   - every VITE_* the web app reads and every process.env name vite.config.ts
 *     reads, for the Cloudflare Pages build env.
 * The descriptions (required or not, where it is set, what breaks) live in the
 * EDGE and WEB tables below, next to the code that checks them.
 *
 * It fails when:
 *   - a function reads a name with no entry in EDGE (undocumented secret),
 *   - an entry in EDGE or WEB is read by nothing (stale doc),
 *   - code reads a deprecated alias directly instead of through app-urls.ts,
 *   - a Deno.env.get takes a non-literal name outside the reviewed files,
 *   - env.example does not list exactly the VITE_* names the app reads,
 *   - docs/EDGE_SECRETS.md differs from what this script generates.
 *
 *   node scripts/check-edge-secrets.mjs          # check (pre-commit, CI)
 *   node scripts/check-edge-secrets.mjs --write  # regenerate the doc
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN_ROOT = join(root, 'supabase', 'functions');
const DOC = join(root, 'docs', 'EDGE_SECRETS.md');
const HELPER = '_shared/app-urls.ts';
const ENV_EXAMPLE = join(root, 'env.example');
const VITE_CONFIG = join(root, 'vite.config.ts');
const WRITE = process.argv.includes('--write');

/**
 * Files allowed to call Deno.env.get with a computed name, and the names they
 * can compute. Anything else computing a name fails the guard, because the
 * doc cannot see what it reads.
 */
const DYNAMIC_READS = {
  // getApiKey(provider) maps claude/anthropic/openai/gemini to these.
  '_shared/ai-service.ts': ['CLAUDE_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'],
  '_shared/ai-service-env.ts': ['CLAUDE_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'],
  // Reads the canonical name and its aliases from ENV_ALIASES.
  [HELPER]: [],
};

/** Exported helper -> the canonical name it reads (plus that name's aliases). */
const HELPER_FNS = { siteUrl: 'SITE_URL', functionsBaseUrl: 'PUBLIC_FUNCTIONS_BASE_URL' };

const P = 'platform';
const S = 'secret';

/**
 * Edge-function environment: NAME -> [need, where, what happens without it].
 * need: platform (the runtime provides it) | required | optional.
 */
const EDGE = {
  SUPABASE_URL: [P, P, 'Nothing can reach the database or auth; every function fails.'],
  SUPABASE_SERVICE_ROLE_KEY: [P, P, 'Service-role clients cannot be built; writes that must bypass RLS fail. oauth-proxy also signs OAuth state with it when OAUTH_STATE_SECRET is unset.'],
  SUPABASE_ANON_KEY: [P, P, 'User-JWT clients cannot be built, so auth.getUser fails and authenticated functions return errors.'],
  SITE_URL: ['optional', S, 'Defaults to https://brikly.net. Links in email (invoices, estimates, invites, payment and renewal reminders, blog posts) and SSO/OAuth redirects point there, so a staging project without it sends users to production.'],
  PUBLIC_FUNCTIONS_BASE_URL: ['optional', S, 'oauth-proxy defaults to https://functions.brikly.net, which must match the redirect URI registered with Google and Apple. commercial-email derives SUPABASE_URL/functions/v1; with neither, marketing mail goes out without a List-Unsubscribe link.'],
  STRIPE_SECRET_KEY: ['required', S, 'Checkout, subscription changes, the billing portal and payment functions return errors.'],
  STRIPE_WEBHOOK_SECRET: ['required', S, 'stripe-webhook cannot verify signatures and rejects every event, so subscription state stops following Stripe.'],
  STRIPE_ENCRYPTION_KEY: ['required', S, 'store-stripe-keys throws; a company cannot save its own Stripe keys.'],
  CALENDAR_TOKEN_ENCRYPTION_KEY: ['optional', S, 'Google/Outlook calendar connect and sync-calendar fail closed: tokens cannot be encrypted or read, and the OAuth state cannot be signed. At least 32 characters; separate from QUICKBOOKS_TOKEN_ENCRYPTION_KEY.'],
  CLAUDE_API_KEY: ['required', S, 'Every AI feature whose provider is Claude (the default) fails with "API key CLAUDE_API_KEY not configured".'],
  OPENAI_API_KEY: ['optional', S, 'AI features configured for OpenAI fail; the rest are unaffected.'],
  GEMINI_API_KEY: ['optional', S, 'Only models whose provider is gemini fail.'],
  AI_DEFAULT_PROVIDER: ['optional', S, 'Only _shared/ai-service-env.ts reads it, and only test-ai-configuration imports that module; the AI features use _shared/ai-service.ts, which ignores it.'],
  DEFAULT_AI_MODEL: ['optional', S, 'Only _shared/ai-service-env.ts reads it, and only test-ai-configuration imports that module; the AI features use _shared/ai-service.ts, which ignores it.'],
  LIGHTWEIGHT_AI_MODEL: ['optional', S, 'Only _shared/ai-service-env.ts reads it, and only test-ai-configuration imports that module; the AI features use _shared/ai-service.ts, which ignores it.'],
  AI_TIMEOUT_MS: ['optional', S, 'Only _shared/ai-service-env.ts reads it, and only test-ai-configuration imports that module; the AI features use _shared/ai-service.ts, which ignores it.'],
  AI_MAX_RETRIES: ['optional', S, 'Only _shared/ai-service-env.ts reads it, and only test-ai-configuration imports that module; the AI features use _shared/ai-service.ts, which ignores it.'],
  RESEND_API_KEY: ['required', S, 'Mail sent through Resend fails: notifications, booking confirmations, payment and renewal reminders, safety and support notices, trial and funnel email.'],
  AMAZON_SMTP_USER_NAME: ['required', S, 'Mail sent through SES (_shared/ses-email-service.ts: invites, invoices, estimates) returns an error.'],
  AMAZON_SMTP_PASSWORD: ['required', S, 'Same as AMAZON_SMTP_USER_NAME.'],
  AMAZON_SMTP_ENDPOINT: ['optional', S, 'Defaults to email-smtp.us-east-1.amazonaws.com.'],
  SENDGRID_API_KEY: ['optional', S, 'send-scheduled-emails and SEO notification email fail or are skipped.'],
  FROM_EMAIL: ['optional', S, 'SEO notification email is sent from seo@brikly.net.'],
  EMAIL_UNSUBSCRIBE_SECRET: ['required', S, 'email-unsubscribe rejects every link, and commercial email goes out with no unsubscribe link.'],
  CRON_SECRET: ['required', S, 'System functions guarded by _shared/system-auth.ts run UNGUARDED (staged rollout, logged as a warning); process-dsar-fulfillment refuses scheduled runs.'],
  ALLOWED_CORS_ORIGINS: ['optional', S, 'Only the built-in origin list is allowed. Comma-separated extra origins.'],
  ENVIRONMENT: ['optional', S, 'Leave unset in production. "development" adds localhost origins to CORS and relaxes security headers.'],
  DEV: ['optional', S, 'Leave unset in production. "true" behaves like ENVIRONMENT=development.'],
  EDGE_SENTRY_DSN: ['optional', S, 'captureException is a no-op; errors reach the platform logs only.'],
  INPUT_VALIDATION_MODE: ['optional', S, 'Defaults to report: schema failures are logged and the handler still runs. "enforce" returns 400. See env.example before flipping it.'],
  TURNSTILE_SECRET_KEY: ['optional', S, 'Lead forms are not bot-checked. Set it only after VITE_TURNSTILE_SITE_KEY is live, or every submission is refused.'],
  OAUTH_STATE_SECRET: ['optional', S, 'oauth-proxy signs OAuth state with SUPABASE_SERVICE_ROLE_KEY instead.'],
  GOOGLE_CLIENT_ID: ['required', S, 'Google sign-in (oauth-proxy) and Search Console connect fail.'],
  GOOGLE_CLIENT_SECRET: ['required', S, 'Same as GOOGLE_CLIENT_ID.'],
  GOOGLE_REDIRECT_URI: ['optional', S, 'Search Console OAuth uses SUPABASE_URL/functions/v1/gsc-oauth-callback.'],
  GOOGLE_OAUTH_CLIENT_ID: ['optional', S, 'Google Calendar and Google Analytics connect fail. A separate OAuth client from GOOGLE_CLIENT_ID, not an alias.'],
  GOOGLE_OAUTH_CLIENT_SECRET: ['optional', S, 'Same as GOOGLE_OAUTH_CLIENT_ID.'],
  GOOGLE_OAUTH_REDIRECT_URI: ['optional', S, 'analytics-oauth-google falls back to a placeholder (your-domain.com), so that flow is broken until it is set.'],
  GOOGLE_CLIENT_EMAIL: ['optional', S, 'GA4 and Search Console API functions return an error (service account email).'],
  GOOGLE_PRIVATE_KEY: ['optional', S, 'Same as GOOGLE_CLIENT_EMAIL (service account key).'],
  GA4_PROPERTY_ID: ['optional', S, 'GA4 reporting functions return an error.'],
  GOOGLE_SERVICE_ACCOUNT_JSON: ['optional', S, 'google-indexing-api returns an error.'],
  SEARCH_CONSOLE_SITE_URL: ['optional', S, 'Defaults to the brikly.net property. This is a Search Console property id, not the app URL.'],
  APPLE_CLIENT_ID: ['optional', S, 'Sign in with Apple fails.'],
  APPLE_CLIENT_SECRET: ['optional', S, 'Same as APPLE_CLIENT_ID.'],
  MICROSOFT_CLIENT_ID: ['optional', S, 'Outlook calendar connect fails.'],
  MICROSOFT_CLIENT_SECRET: ['optional', S, 'Same as MICROSOFT_CLIENT_ID.'],
  QUICKBOOKS_CLIENT_ID: ['required', S, 'QuickBooks connect, sync and disconnect fail.'],
  QUICKBOOKS_CLIENT_SECRET: ['required', S, 'Same as QUICKBOOKS_CLIENT_ID.'],
  QUICKBOOKS_ENVIRONMENT: ['required', S, 'Anything but "production" talks to the Intuit SANDBOX API, so production customers sync nothing real.'],
  TWILIO_ACCOUNT_SID: ['optional', S, 'twilio-calling and workflow SMS steps fail.'],
  TWILIO_AUTH_TOKEN: ['optional', S, 'Same as TWILIO_ACCOUNT_SID.'],
  TWILIO_PHONE_NUMBER: ['optional', S, 'Same as TWILIO_ACCOUNT_SID.'],
  VAPID_PRIVATE_KEY: ['optional', S, 'Web push is disabled (logged, not an error).'],
  EXPO_ACCESS_TOKEN: ['optional', S, 'trigger-expo-build returns an error. The Expo app is archived (see CLAUDE.md).'],
  LDAP_PROXY_URL: ['optional', S, 'LDAP sign-in returns "LDAP authentication service not configured".'],
  ADMIN_CREATION_SECRET: ['optional', S, 'create-root-admin refuses every call. Bootstrap only; unset it afterwards.'],
  ADMIN_EMAIL: ['optional', S, 'create-root-admin throws. Bootstrap only; unset it afterwards.'],
  ADMIN_PASSWORD: ['optional', S, 'create-root-admin throws. Bootstrap only; unset it afterwards.'],
  BLOG_AUTOMATION_API_KEY: ['optional', S, 'External callers cannot authenticate to blog-ai-automation with an API key; admin JWTs still work.'],
  AHREFS_API_KEY: ['optional', S, 'Backlink sync skips Ahrefs.'],
  MOZ_ACCESS_ID: ['optional', S, 'Backlink sync skips Moz.'],
  MOZ_SECRET_KEY: ['optional', S, 'Same as MOZ_ACCESS_ID.'],
  SERP_API_KEY: ['optional', S, 'check-keyword-positions saves Math.random() positions, volumes and difficulty as if they were real rankings.'],
  PAGESPEED_INSIGHTS_API_KEY: ['optional', S, 'SEO audits and Core Web Vitals checks skip PageSpeed data.'],
  BING_SEARCH_API_KEY: ['optional', S, 'bing-search-api returns an error. Bing Web Search API, a different product from MICROSOFT_BING_API_KEY.'],
  MICROSOFT_BING_API_KEY: ['optional', S, 'bing-webmaster-api returns an error. Bing Webmaster Tools API.'],
  SLACK_WEBHOOK_URL: ['optional', S, 'SEO Slack alerts are skipped unless the request carries its own webhook.'],
  CUSTOM_WEBHOOK_URL: ['optional', S, 'SEO notifications skip the custom webhook.'],
};

const CF = 'Cloudflare Pages env (Production and Preview)';
/** Web build: NAME -> [need, where, what happens without it]. */
const WEB = {
  VITE_SUPABASE_URL: ['required', 'wrangler.toml [vars]', 'Falls back to https://api.brikly.net.'],
  VITE_SUPABASE_PUBLISHABLE_KEY: ['required', CF, 'The production build fails (vite.config.ts guard).'],
  VITE_EDGE_FUNCTIONS_URL: ['optional', 'wrangler.toml [vars]', 'Falls back to VITE_SUPABASE_URL/functions/v1.'],
  VITE_SUPABASE_PROJECT_ID: ['optional', CF, 'Diagnostics only.'],
  VITE_SENTRY_DSN: ['optional', CF, 'Browser errors are not reported. Set it in production.'],
  VITE_APP_VERSION: ['optional', `${CF}, build time`, 'Sentry events carry no release, so uploaded source maps never match them.'],
  VITE_POSTHOG_API_KEY: ['optional', CF, 'Product analytics are off.'],
  VITE_POSTHOG_HOST: ['optional', CF, 'Defaults to https://app.posthog.com.'],
  VITE_TURNSTILE_SITE_KEY: ['optional', CF, 'The Turnstile widget is hidden on lead forms.'],
  VITE_SOURCEMAP: ['optional', 'Build env', '"true" emits hidden source maps without a Sentry upload.'],
  SENTRY_AUTH_TOKEN: ['optional', `${CF}, build time; GitHub secret for ci.yml`, 'No source-map upload; production stack traces stay minified.'],
  SENTRY_ORG: ['optional', 'Same as SENTRY_AUTH_TOKEN', 'Upload cannot find the organization.'],
  SENTRY_PROJECT: ['optional', 'Same as SENTRY_AUTH_TOKEN', 'Upload cannot find the project.'],
};

// ---------------------------------------------------------------- scanning

const posix = (p) => p.split(sep).join('/');
const isTest = (p) => /\.(test|spec)\.[jt]sx?$/.test(p) || /(^|\/)(__tests__|test)\//.test(p);

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/**
 * Drop whole-line comments (// and the * lines of a block comment) so a
 * commented-out read is not counted. Deliberately line-based: stripping
 * block-comment spans with a regex also eats code after a string such as
 * 'image/*', which silently hid real reads in the first version.
 */
const stripComments = (src) =>
  src.split('\n').filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).join('\n');

export function parseAliases(src) {
  const m = src.match(/ENV_ALIASES[^=]*=\s*\{([\s\S]*?)\};/);
  if (!m) throw new Error(`${HELPER}: ENV_ALIASES table not found`);
  const out = {};
  for (const [, name, list] of m[1].matchAll(/([A-Z0-9_]+)\s*:\s*\[([^\]]*)\]/g)) {
    out[name] = [...list.matchAll(/['"]([A-Z0-9_]+)['"]/g)].map((x) => x[1]);
  }
  return out;
}

function scanEdge() {
  const files = walk(FN_ROOT, ['.ts', '.js']).filter((f) => !isTest(posix(relative(FN_ROOT, f))));
  const rel = (f) => posix(relative(FN_ROOT, f));
  const aliases = parseAliases(readFileSync(join(FN_ROOT, HELPER), 'utf8'));
  const aliasOf = new Map(Object.entries(aliases).flatMap(([c, as]) => as.map((a) => [a, c])));

  const reads = new Map(); // name -> Set(rel file)
  const add = (name, file) => (reads.get(name) ?? reads.set(name, new Set()).get(name)).add(file);
  const imports = new Map(); // rel file -> Set(rel file)
  const errors = [];

  for (const f of files) {
    const r = rel(f);
    const src = stripComments(readFileSync(f, 'utf8'));
    for (const [, name] of src.matchAll(/\bDeno\.env\.get\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*\)/g)) {
      if (aliasOf.has(name)) {
        errors.push(`${r}: reads deprecated ${name} directly. Use ${aliasOf.get(name) === 'SITE_URL' ? 'siteUrl()' : 'functionsBaseUrl()'} from ${HELPER}.`);
      }
      add(name, r);
    }
    const computed = [...src.matchAll(/\benv\??\.get\((?!\s*['"`][A-Za-z0-9_]+['"`]\s*\))([^)]*)\)/g)]
      .filter((m) => /Deno/.test(src.slice(Math.max(0, m.index - 40), m.index + 4)));
    if (computed.length) {
      if (!(r in DYNAMIC_READS)) {
        errors.push(`${r}: Deno.env.get(${computed[0][1].trim()}) takes a computed name the secrets doc cannot see. Use a literal, or add the file to DYNAMIC_READS in scripts/check-edge-secrets.mjs with the names it can produce.`);
      }
      for (const n of DYNAMIC_READS[r] ?? []) add(n, r);
    }
    if (/\bDeno\.env\.toObject\(/.test(src)) errors.push(`${r}: Deno.env.toObject() reads names the secrets doc cannot see.`);

    const deps = new Set();
    for (const [, spec] of src.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      deps.add(posix(relative(FN_ROOT, resolve(dirname(f), spec))));
    }
    imports.set(r, deps);

    const helperImport = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*app-urls\.ts['"]/g)];
    for (const [, names] of helperImport) {
      for (const n of names.split(',').map((s) => s.trim().split(/\s+as\s+/)[0])) {
        const canonical = HELPER_FNS[n];
        if (canonical) for (const envName of [canonical, ...aliases[canonical]]) add(envName, r);
      }
    }
  }

  // Which functions reach each file through relative imports.
  const fnDirs = readdirSync(FN_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => e.name)
    .filter((d) => existsSync(join(FN_ROOT, d, 'index.ts')));
  const reachedBy = new Map(); // rel file -> Set(fn)
  for (const fn of fnDirs) {
    const stack = [...imports.keys()].filter((k) => k.startsWith(`${fn}/`));
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      (reachedBy.get(cur) ?? reachedBy.set(cur, new Set()).get(cur)).add(fn);
      for (const d of imports.get(cur) ?? []) stack.push(d);
    }
  }
  const fnsFor = (name) => {
    const out = new Set();
    for (const file of reads.get(name) ?? []) for (const fn of reachedBy.get(file) ?? []) out.add(fn);
    return [...out].sort();
  };
  return { reads, aliases, fnsFor, errors };
}

function scanWeb() {
  const src = new Map(); // name -> Set(file)
  const add = (n, f) => (src.get(n) ?? src.set(n, new Set()).get(n)).add(f);
  for (const f of walk(join(root, 'src'), ['.ts', '.tsx'])) {
    const r = posix(relative(root, f));
    if (isTest(r)) continue;
    const text = stripComments(readFileSync(f, 'utf8'));
    for (const re of [/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g, /import\.meta\.env\[\s*['"](VITE_[A-Z0-9_]+)['"]\s*\]/g, /getEnvVar\(\s*['"](VITE_[A-Z0-9_]+)['"]\s*\)/g]) {
      for (const [, n] of text.matchAll(re)) add(n, r);
    }
  }
  const build = new Set();
  if (existsSync(VITE_CONFIG)) {
    for (const [, n] of stripComments(readFileSync(VITE_CONFIG, 'utf8')).matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (n !== 'NODE_ENV') build.add(n);
    }
  }
  const example = new Set(
    existsSync(ENV_EXAMPLE)
      ? [...readFileSync(ENV_EXAMPLE, 'utf8').matchAll(/^(VITE_[A-Z0-9_]+)=/gm)].map((m) => m[1])
      : [],
  );
  return { src, build, example };
}

// --------------------------------------------------------------- rendering

const esc = (s) => s.replace(/\|/g, '\\|');
const code = (s) => `\`${s}\``;
const WHERE = {
  platform: 'Injected by Supabase',
  secret: 'Supabase secret',
};
const LIST_MAX = 8;

export function render({ edge, web }) {
  const { reads, aliases, fnsFor } = edge;
  const names = Object.keys(EDGE).sort();
  const aliasNames = Object.values(aliases).flat();
  const L = [];
  L.push('# Edge-function secrets and build environment');
  L.push('');
  L.push('<!-- GENERATED by scripts/check-edge-secrets.mjs. Do not edit by hand: change the EDGE/WEB tables in that script and run `node scripts/check-edge-secrets.mjs --write`. -->');
  L.push('');
  L.push(`Every environment name the edge functions and the web build read, generated from the code (US-392). ${names.length} names are read by edge functions, plus ${aliasNames.length} deprecated aliases still honoured for one release. No values live here; a value belongs in the place the "Set in" column names.`);
  L.push('');
  L.push('The pre-commit hook and CI fail when a function reads a name that is not listed here, when this file is out of date, or when `env.example` stops matching the `VITE_*` names the app reads.');
  L.push('');
  L.push('## Where values are set');
  L.push('');
  L.push('- **Supabase secret**: `supabase secrets set NAME=...` or the Supabase dashboard (Edge Functions, Secrets). On the self-hosted stack, the functions service environment in Coolify. Functions read them at cold start, so redeploy or restart the functions after a change.');
  L.push('- **Injected by Supabase**: the hosted runtime provides it. The self-hosted functions container needs it in its environment.');
  L.push('- **Cloudflare Pages env**: Pages project, Settings, Environment variables, for Production and Preview. `VITE_*` names are baked into the bundle at build time, so a change needs a new deploy.');
  L.push('');
  L.push('## Renames in progress');
  L.push('');
  L.push('Five names were in use for two URLs. Functions now read the canonical name through `supabase/functions/_shared/app-urls.ts` and fall back to the old names, logging `[env] NAME is deprecated; set CANONICAL` when one is used, so a project that only has the old secret keeps working.');
  L.push('');
  L.push('| Canonical | Deprecated aliases, in fallback order | Meaning |');
  L.push('|---|---|---|');
  const meaning = {
    SITE_URL: 'Public origin of the web app, e.g. https://brikly.net. APP_URL held the full subscription-page URL, so only its origin is used.',
    PUBLIC_FUNCTIONS_BASE_URL: 'Public base URL that serves function `x` at `${base}/x`, e.g. https://functions.brikly.net.',
  };
  for (const [c, as] of Object.entries(aliases)) {
    L.push(`| ${code(c)} | ${as.map(code).join(', ')} | ${esc(meaning[c] ?? '')} |`);
  }
  L.push('');
  L.push('To finish a rename: set the canonical secret to the value the alias holds (the first alias that is set wins today), redeploy, confirm the deprecation line is gone from the function logs, then delete the alias secret. A release after that, remove the alias from `ENV_ALIASES` and this script regenerates the table.');
  L.push('');
  L.push('## Edge functions');
  L.push('');
  L.push('"Need": **platform** is provided by the runtime; **required** means a core flow breaks without it; **optional** means a default applies or one integration is off.');
  L.push('');
  L.push('| Name | Need | Set in | Read by | Without it |');
  L.push('|---|---|---|---|---|');
  const long = [];
  for (const n of names) {
    const [need, where, missing] = EDGE[n];
    const fns = fnsFor(n);
    const files = [...(reads.get(n) ?? [])].sort();
    let by;
    if (fns.length === 0) by = `no deployed function (${files.join(', ')})`;
    else if (fns.length <= LIST_MAX) by = fns.join(', ');
    else {
      by = `${fns.length} functions, listed below`;
      long.push([n, fns]);
    }
    L.push(`| ${code(n)} | ${need} | ${WHERE[where]} | ${esc(by)} | ${esc(missing)} |`);
  }
  L.push('');
  L.push('Two pairs look like duplicates and are not: `GOOGLE_CLIENT_ID` (sign-in, Search Console) and `GOOGLE_OAUTH_CLIENT_ID` (Calendar, Analytics) are separate OAuth clients with separate redirect URIs, and `BING_SEARCH_API_KEY` / `MICROSOFT_BING_API_KEY` are keys for two different Bing APIs.');
  L.push('');
  L.push('`_shared/ai-service.ts` and `_shared/ai-service-env.ts` compute the key name from the provider (claude, openai, gemini); those reads are counted under the three `*_API_KEY` rows.');
  if (long.length) {
    L.push('');
    L.push('### Functions reading the widely used names');
    L.push('');
    for (const [n, fns] of long) {
      L.push(`**${n}** (${fns.length}): ${fns.join(', ')}`);
      L.push('');
    }
    L.pop();
  }
  L.push('');
  L.push('## Web build (Cloudflare Pages)');
  L.push('');
  L.push('Build command `npm ci && npm run build`, Node from `.nvmrc`. `VITE_*` names are what `src/` reads (`import.meta.env`); the rest are read by `vite.config.ts` at build time. `env.example` lists every `VITE_*` name below.');
  L.push('');
  L.push('| Name | Need | Set in | Read in | Without it |');
  L.push('|---|---|---|---|---|');
  for (const n of Object.keys(WEB).sort()) {
    const [need, where, missing] = WEB[n];
    // Where, not which file: listing src/ paths would make every refactor or
    // deleted module that touches a reader regenerate this doc.
    const files = [];
    if (web.src.has(n)) files.push('src/ (import.meta.env)');
    if (web.build.has(n)) files.push('vite.config.ts');
    L.push(`| ${code(n)} | ${need} | ${esc(where)} | ${esc(files.join(', '))} | ${esc(missing)} |`);
  }
  L.push('');
  L.push('### Sentry release and source maps');
  L.push('');
  L.push('The Sentry plugin in `vite.config.ts` uploads hidden source maps only when `SENTRY_AUTH_TOKEN` is present at build time, tags them with `VITE_APP_VERSION`, and deletes the `.map` files from `dist/` afterwards. Today only `ci.yml` sets these, and CI does not deploy: the bundle Cloudflare Pages serves is built by Pages itself, so unless the four names are in the Pages env its stack traces are minified.');
  L.push('');
  L.push('To enable it on Pages:');
  L.push('');
  L.push('1. Add `SENTRY_AUTH_TOKEN` (encrypted), `SENTRY_ORG` and `SENTRY_PROJECT` to the Pages env for Production.');
  L.push('2. `VITE_APP_VERSION` has to change per deploy, and the dashboard cannot reference another variable. Set the build command to `npm ci && VITE_APP_VERSION=$CF_PAGES_COMMIT_SHA npm run build` so the release is the deployed commit.');
  L.push('3. Confirm one deploy: the Pages build log shows the Sentry plugin uploading source maps for that release, and Sentry, Settings, Source Maps lists a release named after the commit SHA. Until someone has done this, treat source-map upload as unconfirmed.');
  L.push('');
  return L.join('\n');
}

// ------------------------------------------------------------------- main

function main() {
  const edge = scanEdge();
  const web = scanWeb();
  const errors = [...edge.errors];

  const aliasNames = new Set(Object.values(edge.aliases).flat());
  for (const [n, files] of edge.reads) {
    if (aliasNames.has(n)) continue;
    if (!(n in EDGE)) errors.push(`${n} is read by ${[...files].sort().join(', ')} but is not documented. Add it to EDGE in scripts/check-edge-secrets.mjs, then run node scripts/check-edge-secrets.mjs --write.`);
  }
  for (const n of Object.keys(EDGE)) {
    if (!edge.reads.has(n)) errors.push(`EDGE documents ${n}, but no edge function reads it. Remove the entry and regenerate.`);
  }
  for (const c of Object.keys(edge.aliases)) {
    if (!(c in EDGE)) errors.push(`${c} is a canonical name in ENV_ALIASES but has no EDGE entry.`);
  }

  const webRead = new Set([...web.src.keys(), ...web.build]);
  for (const n of webRead) {
    if (!(n in WEB)) errors.push(`${n} is read by the web build but is not in WEB in scripts/check-edge-secrets.mjs.`);
  }
  for (const n of Object.keys(WEB)) {
    if (!webRead.has(n)) errors.push(`WEB documents ${n}, but neither src/ nor vite.config.ts reads it.`);
  }
  for (const n of web.src.keys()) {
    if (!web.example.has(n)) errors.push(`env.example is missing ${n}, which ${[...web.src.get(n)].sort().join(', ')} reads.`);
  }
  for (const n of web.example) {
    if (!web.src.has(n) && !web.build.has(n)) errors.push(`env.example lists ${n}, which nothing in src/ or vite.config.ts reads.`);
  }

  const doc = render({ edge, web });
  const current = existsSync(DOC) ? readFileSync(DOC, 'utf8') : '';
  if (WRITE) {
    if (current !== doc) writeFileSync(DOC, doc);
    console.log(`check-edge-secrets: wrote ${posix(relative(root, DOC))}`);
  } else if (current !== doc) {
    errors.push(`${posix(relative(root, DOC))} is out of date. Run: node scripts/check-edge-secrets.mjs --write`);
  }

  if (errors.length) {
    console.error(`check-edge-secrets: ${errors.length} problem(s)\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const edgeCount = [...edge.reads.keys()].filter((n) => !aliasNames.has(n)).length;
  console.log(`check-edge-secrets: OK (${edgeCount} edge names + ${aliasNames.size} aliases, ${webRead.size} web build names documented)`);
}

main();
