// Types for scripts/csp-reporting.mjs, so vite.config.ts type-checks under
// tsconfig.node.json (strict, no allowJs).

export const REPORT_GROUP: string;
export function sentrySecurityEndpoint(dsn: string | undefined, environment?: string): string | null;
export function addCspReporting(headersText: string, endpoint: string | null): string;
