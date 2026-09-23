/**
 * One name per URL (US-392).
 *
 * The web app's public URL was read under three names (SITE_URL, FRONTEND_URL,
 * APP_URL) and the public edge-functions base under two (FUNCTIONS_URL,
 * PUBLIC_FUNCTIONS_BASE_URL). A deploy that set one of them left the functions
 * reading the others on their hardcoded default, and nothing said which.
 *
 * The canonical names are SITE_URL and PUBLIC_FUNCTIONS_BASE_URL. The old names
 * are still read, after the canonical one, for one release so a deployment that
 * only has the old secret keeps working; reading one logs a deprecation line
 * naming the secret to set. Remove the aliases once the dashboard has the
 * canonical names (see docs/EDGE_SECRETS.md, "Renames in progress").
 *
 * Pure apart from the injected env getter, so vitest can load it.
 */

export type EnvGet = (name: string) => string | undefined;

const denoGet: EnvGet = (name) =>
  (globalThis as unknown as { Deno?: { env: { get(n: string): string | undefined } } })
    .Deno?.env.get(name);

/**
 * Canonical name -> deprecated aliases, in the order they are tried.
 * scripts/check-edge-secrets.mjs reads this table, so every name here is
 * documented even though no Deno.env.get literal names it.
 */
export const ENV_ALIASES: Record<string, readonly string[]> = {
  SITE_URL: ['FRONTEND_URL', 'APP_URL'],
  PUBLIC_FUNCTIONS_BASE_URL: ['FUNCTIONS_URL'],
};

export const DEFAULT_SITE_URL = 'https://brikly.net';

const warned = new Set<string>();
const warnOnce = (key: string, message: string) => {
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console -- a deprecation notice, not an error to alert on
  console.warn(message);
};

/** Test hook: forget which deprecation lines were already logged. */
export function resetEnvAliasWarnings(): void {
  warned.clear();
}

/**
 * Read `canonical`, falling back to its deprecated aliases. Empty strings
 * count as unset, matching the `Deno.env.get(x) || default` idiom this replaces.
 */
export function readEnvWithAliases(
  canonical: string,
  get: EnvGet = denoGet,
): { value: string | undefined; name: string | undefined } {
  const aliases = ENV_ALIASES[canonical] ?? [];
  const own = get(canonical) || undefined;
  if (own) {
    for (const alias of aliases) {
      const other = get(alias);
      if (other && other !== own) {
        warnOnce(
          `${canonical}!=${alias}`,
          `[env] ${canonical} and deprecated ${alias} are both set and differ; using ${canonical}. Delete ${alias}.`,
        );
      }
    }
    return { value: own, name: canonical };
  }
  for (const alias of aliases) {
    const value = get(alias) || undefined;
    if (value) {
      warnOnce(alias, `[env] ${alias} is deprecated; set ${canonical} to the same value.`);
      return { value, name: alias };
    }
  }
  return { value: undefined, name: undefined };
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

/**
 * The web app's public origin, without a trailing slash.
 *
 * APP_URL was only ever read by send-renewal-notification, as the full
 * subscription-page URL (its default was https://brikly.net/subscription), so
 * when it is the source only its origin is used.
 */
export function siteUrl(get: EnvGet = denoGet): string {
  const { value, name } = readEnvWithAliases('SITE_URL', get);
  if (!value) return DEFAULT_SITE_URL;
  if (name === 'APP_URL') {
    try {
      return new URL(value).origin;
    } catch {
      return DEFAULT_SITE_URL;
    }
  }
  return trimSlash(value);
}

/**
 * The public base URL under which function `x` is served at `${base}/x`,
 * without a trailing slash. `fallback` is what the caller used before a
 * variable was set; callers differ, so it stays theirs.
 */
export function functionsBaseUrl(fallback: string, get: EnvGet = denoGet): string {
  const { value } = readEnvWithAliases('PUBLIC_FUNCTIONS_BASE_URL', get);
  return trimSlash(value ?? fallback);
}
