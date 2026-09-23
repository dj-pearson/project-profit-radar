/**
 * Refuses to run the suite against the production backend.
 *
 * src/integrations/supabase/client.ts falls back to https://api.brikly.net when
 * VITE_SUPABASE_URL is unset, and the auth specs sign in for real when
 * TEST_USER_EMAIL/TEST_USER_PASSWORD are set. So an E2E run with no Supabase
 * env is a run against the live database. In CI that is never acceptable, and
 * the job pins a placeholder or a non-production project (ci.yml); this makes
 * the pin enforced rather than remembered.
 *
 * Locally, `npm run dev` gets its env from Infisical, which this process cannot
 * see, so an unset variable is only refused when CI is set. A value that names
 * production is refused everywhere.
 */
const PRODUCTION_BACKENDS = [/(^|\/\/)api\.brikly\.net/i, /(^|\/\/)functions\.brikly\.net/i, /ilhzuvemiuyfuxfegtlv\.supabase\.co/i];

export default function globalSetup(): void {
  // An externally served app was built elsewhere; its target is baked in and
  // not visible from here.
  if (process.env.PLAYWRIGHT_BASE_URL) return;

  const url = process.env.VITE_SUPABASE_URL?.trim();
  const fns = process.env.VITE_EDGE_FUNCTIONS_URL?.trim();

  for (const value of [url, fns]) {
    if (value && PRODUCTION_BACKENDS.some((re) => re.test(value))) {
      throw new Error(
        `[e2e] Refusing to run against the production backend (${value}). ` +
          'Point VITE_SUPABASE_URL at a placeholder or a staging project.',
      );
    }
  }

  if (process.env.CI && !url) {
    throw new Error(
      '[e2e] VITE_SUPABASE_URL is unset, so the app would fall back to ' +
        'https://api.brikly.net (production). Set it to a placeholder or a ' +
        'staging project; ci.yml does this for the e2e job.',
    );
  }
}
