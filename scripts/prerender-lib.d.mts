// Types for scripts/prerender-lib.mjs, so src/lib/seo/__tests__/prerender.test.ts
// type-checks under tsconfig.app.json (noImplicitAny, no allowJs).

export const SITE_ORIGIN: string;
export const PRERENDER_MARKER_PREFIX: string;
export const REQUIRED_ROUTES: string[];
export const NEVER_PRERENDER_PREFIXES: string[];

export function isPrerenderable(route: string): boolean;
export function routesFromSitemap(xml: string): string[];
export function outputFileFor(route: string): string;

export interface PrerenderHtmlInfo {
  title: string | null;
  description: string | null;
  canonicals: string[];
  canonicalFromHelmet: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogUrl: string | null;
  ogImage: string | null;
  jsonLdCount: number;
  jsonLdValid: number;
  prerendered: boolean;
  hasH1: boolean;
  suspenseFallback: boolean;
}

export function inspectHtml(html: string): PrerenderHtmlInfo;

export function validateRenderedHtml(
  route: string,
  html: string,
  options?: { shellTitle?: string; finalPath?: string },
): { ok: boolean; problems: string[]; info: PrerenderHtmlInfo };

export function shellScriptKeys(shellHtml: string): string[];
