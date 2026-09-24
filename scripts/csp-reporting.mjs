/**
 * CSP violation reporting (US-202).
 *
 * public/_headers is static, but where violation reports go depends on the
 * Sentry project, which is per-environment config (VITE_SENTRY_DSN, see
 * docs/DEPLOYMENT_ENV.md). So the policy in public/_headers carries no
 * report-uri, and vite.config.ts calls addCspReporting() on dist/_headers after
 * the build, when a DSN is set. With no DSN the file is left exactly as it is.
 *
 * Sentry accepts browser CSP reports on its "security" endpoint:
 *   DSN       https://<key>@o<org>.ingest.<region>.sentry.io/<project>
 *   endpoint  https://o<org>.ingest.<region>.sentry.io/api/<project>/security/?sentry_key=<key>
 * The key is the DSN's public key, which already ships in the JS bundle.
 *
 * Both report-uri (Firefox, Safari) and report-to + Reporting-Endpoints
 * (Chromium) are emitted; a browser that knows report-to ignores report-uri.
 */

export const REPORT_GROUP = 'csp';

/** Sentry security endpoint for a DSN, or null if the DSN does not parse. */
export function sentrySecurityEndpoint(dsn, environment) {
  let u;
  try {
    u = new URL(String(dsn || '').trim());
  } catch {
    return null;
  }
  const key = u.username;
  const project = u.pathname.replace(/^\/+|\/+$/g, '');
  if (u.protocol !== 'https:' || !key || !/^\d+$/.test(project)) return null;
  const q = new URLSearchParams({ sentry_key: key });
  if (environment) q.set('sentry_environment', environment);
  return `https://${u.host}/api/${project}/security/?${q.toString()}`;
}

/**
 * Returns headersText with report-uri/report-to appended to every
 * Content-Security-Policy line and a Reporting-Endpoints header added after it.
 * Idempotent: a line that already has report-uri is left alone.
 */
export function addCspReporting(headersText, endpoint) {
  if (!endpoint) return headersText;
  if (/[\s;,"]/.test(endpoint)) throw new Error(`refusing CSP report endpoint with separator characters: ${endpoint}`);
  return headersText
    .split('\n')
    .flatMap((line) => {
      const m = line.match(/^(\s+)Content-Security-Policy:\s*(.*?)\s*;?\s*$/);
      if (!m || /\breport-uri\b/.test(m[2])) return [line];
      const [, indent, policy] = m;
      return [
        `${indent}Content-Security-Policy: ${policy}; report-uri ${endpoint}; report-to ${REPORT_GROUP}`,
        `${indent}Reporting-Endpoints: ${REPORT_GROUP}="${endpoint}"`,
      ];
    })
    .join('\n');
}
