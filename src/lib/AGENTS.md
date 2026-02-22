# src/lib/ - Core Utilities & Services

## Purpose
Low-level utilities, services, and helpers used across the entire application. This is the foundation layer — most app code imports from here.

## Key Files
- **logger.ts** - Production-safe logging (`import { logger } from '@/lib/logger'`). Use instead of bare `console.*`.
- **utils.ts** - General utilities including `cn()` for Tailwind class merging.
- **envValidation.ts** - Environment variable validation. No hardcoded secrets allowed.
- **queryClient.ts** - TanStack Query client configuration.
- **sentry.ts** - Sentry error tracking initialization.
- **pdfGenerator.ts** - jsPDF-based PDF generation.
- **safeStorage.ts** - localStorage wrapper with error handling.
- **secureLogger.ts** - Structured security event logging.
- **profitabilityCalculations.ts** - Financial math used by dashboards.

## Subdirectories
- **security/** - Sanitization (`sanitize.ts`), login protection, security service, types.
- **validation/** - Zod form schemas (`schemas.ts`).
- **csv-import/** - CSV parsing utilities.
- **__tests__/** - Unit tests for lib modules.

## Conventions
- **Always use `logger`** instead of `console.log/error/warn` in catch blocks and debug output.
- **No hardcoded tokens or secrets** — use `import.meta.env.*` variables.
- **Sanitize user input** using `sanitize.ts` helpers (`sanitizeHtml`, `sanitizeInput`, `sanitizeSqlInput`).
- **Validate with Zod** using schemas from `validation/schemas.ts`.
- Web fallback files (`capacitor-web-fallback.ts`, `react-native-web-fallback.ts`, `storage-web-fallback.ts`) provide stubs so native-only APIs don't crash in the browser.

## Pitfalls
- Don't import `logger` inside `supabase/client.ts` — it creates a circular dependency. Those files use guarded `console.*` calls.
- The `*-web-fallback.ts` files are mapped via Vite aliases in `vite.config.ts`. Don't move or rename without updating the config.
