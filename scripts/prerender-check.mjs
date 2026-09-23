/**
 * Guard for the prerendered build output (US-222): the built HTML for / and
 * /pricing must carry the page's own title, meta description, canonical,
 * OpenGraph and JSON-LD without running any JS.
 *
 *   node scripts/prerender-check.mjs          # after npm run build
 *
 * If dist/ was built without prerendering (no Chromium in the build image),
 * this reports that and exits 0, or exits 1 with --strict (PRERENDER_STRICT=1), the same
 * contract as scripts/prerender.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_ROUTES, inspectHtml, outputFileFor, validateRenderedHtml } from './prerender-lib.mjs';

const DIST = path.resolve(process.env.PRERENDER_DIST
  || path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist'));
const STRICT = process.env.PRERENDER_STRICT === '1' || process.argv.includes('--strict');

const shellPath = path.join(DIST, '404.html');
const shellTitle = fs.existsSync(shellPath)
  ? (fs.readFileSync(shellPath, 'utf8').match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
  : undefined;

let failed = 0;
let notPrerendered = 0;
for (const route of REQUIRED_ROUTES) {
  const file = path.join(DIST, outputFileFor(route));
  if (!fs.existsSync(file)) {
    console.error(`[prerender-check] ${route}: ${path.relative(process.cwd(), file)} missing`);
    failed++;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  if (!inspectHtml(html).prerendered) {
    notPrerendered++;
    console.warn(`[prerender-check] ${route}: not prerendered (static shell only)`);
    continue;
  }
  const { ok, problems, info } = validateRenderedHtml(route, html, { shellTitle });
  if (ok) {
    console.log(`[prerender-check] ${route}: ok - "${info.title}", canonical ${info.canonicals[0]}, ${info.jsonLdValid} JSON-LD block(s)`);
  } else {
    failed++;
    console.error(`[prerender-check] ${route}: ${problems.join('; ')}`);
  }
}

if (failed) process.exit(1);
if (notPrerendered && STRICT) {
  console.error('[prerender-check] PRERENDER_STRICT=1 and the build was not prerendered.');
  process.exit(1);
}
