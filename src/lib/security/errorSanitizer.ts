import React from 'react';
import * as Sentry from '@sentry/react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Safe error categories exposed to end users.
 * Maps internal errors to user-friendly categories without leaking details.
 */
export type SafeErrorCategory =
  | 'validation_error'
  | 'auth_error'
  | 'not_found'
  | 'rate_limited'
  | 'server_error';

/**
 * A sanitized error safe to display to end users or transmit to the client.
 * Contains no stack traces, file paths, SQL fragments, or internal details.
 */
export interface SanitizedError {
  category: SafeErrorCategory;
  message: string;
  /** A stable error code for programmatic handling (e.g. 'ERR_VALIDATION') */
  code: string;
  /** HTTP-equivalent status code */
  statusCode: number;
}

// =============================================================================
// SENSITIVE PATTERNS
// =============================================================================

/**
 * Regex patterns that detect information leakage in error messages.
 * Used by sanitizeError to strip sensitive content before it reaches the client.
 *
 * Each entry has a descriptive key for maintainability and a regex pattern.
 */
export const SENSITIVE_PATTERNS: ReadonlyArray<{
  name: string;
  pattern: RegExp;
}> = [
  // 1. Absolute file paths (Unix and Windows)
  {
    name: 'unix_file_path',
    pattern: /\/(?:home|usr|var|etc|opt|tmp|srv|app|src|node_modules)\/[\w./-]+/gi,
  },
  // 2. Windows file paths
  {
    name: 'windows_file_path',
    pattern: /[A-Z]:\\[\w\\.-]+/gi,
  },
  // 3. Stack trace frames (e.g. "at functionName (file:line:col)")
  {
    name: 'stack_frame',
    pattern: /\bat\s+[\w.<>]+\s*\([^)]*:\d+:\d+\)/g,
  },
  // 4. SQL keywords and fragments (SELECT, INSERT, UPDATE, DELETE, DROP, ALTER, etc.)
  {
    name: 'sql_fragment',
    pattern: /\b(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+(?:TABLE|DATABASE|INDEX)|ALTER\s+TABLE|CREATE\s+(?:TABLE|INDEX|DATABASE)|TRUNCATE|GRANT|REVOKE)\b[^"']*/gi,
  },
  // 5. Database column/table references (schema.table.column patterns)
  {
    name: 'db_column_ref',
    pattern: /\b(?:public|pg_catalog|information_schema)\.\w+(?:\.\w+)?/g,
  },
  // 6. Connection strings (postgres://, mysql://, redis://, mongodb://, etc.)
  {
    name: 'connection_string',
    pattern: /(?:postgres(?:ql)?|mysql|redis|mongodb|amqp|mssql):\/\/[^\s"']+/gi,
  },
  // 7. IPv4 addresses
  {
    name: 'ipv4_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g,
  },
  // 8. IPv6 addresses
  {
    name: 'ipv6_address',
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g,
  },
  // 9. Environment variable references and secrets
  {
    name: 'env_variable',
    pattern: /(?:process\.env\.\w+|(?:SUPABASE|STRIPE|DATABASE|API|SECRET|PRIVATE)_\w*(?:KEY|URL|SECRET|PASSWORD|TOKEN)\b\s*=?\s*['"]?[\w./-]*['"]?)/gi,
  },
  // 10. Internal module/package paths (node_modules, dist, .next, etc.)
  {
    name: 'module_path',
    pattern: /(?:node_modules|dist|\.next|\.nuxt|__webpack_require__)\/[\w@./-]+/g,
  },
  // 11. JWT tokens and bearer tokens
  {
    name: 'jwt_token',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  },
  // 12. Supabase internal references
  {
    name: 'supabase_internal',
    pattern: /\b(?:supabase_\w+_schema|auth\.users|storage\.objects|realtime\.\w+)\b/g,
  },
  // 13. PostgreSQL error detail context (DETAIL:, HINT:, CONTEXT: lines)
  {
    name: 'pg_error_context',
    pattern: /\b(?:DETAIL|HINT|CONTEXT|WHERE):\s*.+/gi,
  },
  // 14. Internal hostnames and ports
  {
    name: 'internal_hostname',
    pattern: /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal)(?::\d+)?\b/g,
  },
] as const;

// =============================================================================
// POSTGRESQL ERROR CODE MAPPING
// =============================================================================

/**
 * Maps PostgreSQL SQLSTATE error codes to safe categories.
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_CODE_MAP: Record<string, SafeErrorCategory> = {
  // Class 22 - Data Exception
  '22000': 'validation_error',
  '22001': 'validation_error', // string_data_right_truncation
  '22003': 'validation_error', // numeric_value_out_of_range
  '22007': 'validation_error', // invalid_datetime_format
  '22008': 'validation_error', // datetime_field_overflow
  '22012': 'validation_error', // division_by_zero
  '22023': 'validation_error', // invalid_parameter_value
  '22P02': 'validation_error', // invalid_text_representation
  // Class 23 - Integrity Constraint Violation
  '23000': 'validation_error', // integrity_constraint_violation
  '23502': 'validation_error', // not_null_violation
  '23503': 'validation_error', // foreign_key_violation
  '23505': 'validation_error', // unique_violation
  '23514': 'validation_error', // check_violation
  // Class 28 - Invalid Authorization
  '28000': 'auth_error',       // invalid_authorization_specification
  '28P01': 'auth_error',       // invalid_password
  // Class 42 - Syntax Error or Access Rule Violation
  '42501': 'auth_error',       // insufficient_privilege
  '42P01': 'not_found',        // undefined_table (treated as not_found)
  // Class 53 - Insufficient Resources
  '53000': 'rate_limited',     // insufficient_resources
  '53100': 'rate_limited',     // disk_full
  '53200': 'rate_limited',     // out_of_memory
  '53300': 'rate_limited',     // too_many_connections
  // Class 57 - Operator Intervention
  '57000': 'server_error',     // operator_intervention
  '57014': 'server_error',     // query_canceled (timeout)
  // Class 58 - System Error
  '58000': 'server_error',     // system_error
  '58030': 'server_error',     // io_error
};

/**
 * Maps HTTP status codes to safe categories.
 */
const HTTP_STATUS_MAP: Record<number, SafeErrorCategory> = {
  400: 'validation_error',
  401: 'auth_error',
  403: 'auth_error',
  404: 'not_found',
  409: 'validation_error',
  422: 'validation_error',
  429: 'rate_limited',
  500: 'server_error',
  502: 'server_error',
  503: 'server_error',
  504: 'server_error',
};

/**
 * User-facing messages for each category.
 * These are intentionally generic to avoid leaking any internal details.
 */
const SAFE_MESSAGES: Record<SafeErrorCategory, string> = {
  validation_error: 'The provided data is invalid. Please check your input and try again.',
  auth_error: 'Authentication failed. Please sign in and try again.',
  not_found: 'The requested resource could not be found.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  server_error: 'An unexpected error occurred. Please try again later.',
};

const SAFE_CODES: Record<SafeErrorCategory, string> = {
  validation_error: 'ERR_VALIDATION',
  auth_error: 'ERR_AUTH',
  not_found: 'ERR_NOT_FOUND',
  rate_limited: 'ERR_RATE_LIMITED',
  server_error: 'ERR_SERVER',
};

const SAFE_STATUS_CODES: Record<SafeErrorCategory, number> = {
  validation_error: 400,
  auth_error: 401,
  not_found: 404,
  rate_limited: 429,
  server_error: 500,
};

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Extracts a raw message string from an unknown error value.
 */
function extractErrorMessage(error: unknown): string {
  if (error === null || error === undefined) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    // OAuth-style: prefer the human-readable error_description over the
    // machine-readable error code, since classification scans the text.
    if (typeof obj.error_description === 'string') return obj.error_description;
    if (typeof obj.error === 'string') return obj.error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

/**
 * Extracts a PostgreSQL error code from an error object, if present.
 */
function extractPgCode(error: unknown): string | null {
  // SQLSTATE codes are 5 chars total: 2-char class + 3-char subclass.
  // Both segments may include letters (e.g. 28P01, 22P02, 42P01), so we
  // accept any alphanumeric.
  const SQLSTATE = /^[A-Z0-9]{5}$/i;
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.code === 'string' && SQLSTATE.test(obj.code)) {
      return obj.code.toUpperCase();
    }
    // Supabase wraps PG errors
    if (obj.details && typeof obj.details === 'object') {
      const details = obj.details as Record<string, unknown>;
      if (typeof details.code === 'string' && SQLSTATE.test(details.code)) {
        return details.code.toUpperCase();
      }
    }
  }
  return null;
}

/**
 * Extracts a PostgREST error code from an error object, if present.
 * PostgREST codes are formatted as "PGRST" + 3 digits (e.g. PGRST116).
 */
function extractPostgRESTCode(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.code === 'string' && /^PGRST\d{3,}$/i.test(obj.code)) {
      return obj.code.toUpperCase();
    }
  }
  return null;
}

/**
 * Maps PostgREST error codes to safe categories.
 * Reference: https://postgrest.org/en/stable/references/errors.html
 */
const POSTGREST_CODE_MAP: Record<string, SafeErrorCategory> = {
  PGRST116: 'not_found',   // 0 or >1 rows when single row requested
  PGRST301: 'auth_error',  // JWT expired
  PGRST302: 'auth_error',  // anonymous access disallowed
};

/**
 * Extracts an HTTP status code from an error object, if present.
 */
function extractHttpStatus(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    for (const key of ['status', 'statusCode', 'status_code']) {
      if (typeof obj[key] === 'number' && obj[key] >= 100 && obj[key] < 600) {
        return obj[key] as number;
      }
    }
  }
  return null;
}

/**
 * Classifies a raw error into a safe, user-facing category.
 *
 * Classification priority:
 * 1. PostgreSQL SQLSTATE error codes
 * 2. HTTP status codes
 * 3. Supabase-specific error message patterns
 * 4. Generic message pattern matching
 * 5. Default: 'server_error'
 */
export function classifyError(error: unknown): SafeErrorCategory {
  // 1a. PostgREST error codes (e.g. PGRST116) — checked before SQLSTATE
  // because PostgREST codes wouldn't otherwise be recognized.
  const postgRESTCode = extractPostgRESTCode(error);
  if (postgRESTCode && POSTGREST_CODE_MAP[postgRESTCode]) {
    return POSTGREST_CODE_MAP[postgRESTCode];
  }

  // 1. PostgreSQL error codes
  const pgCode = extractPgCode(error);
  if (pgCode) {
    // Try exact match first, then class-level match (first 2 chars)
    if (PG_ERROR_CODE_MAP[pgCode]) {
      return PG_ERROR_CODE_MAP[pgCode];
    }
    const pgClass = pgCode.slice(0, 2);
    if (pgClass === '22' || pgClass === '23') return 'validation_error';
    if (pgClass === '28') return 'auth_error';
    if (pgClass === '42') return 'auth_error';
    if (pgClass === '53') return 'rate_limited';
    return 'server_error';
  }

  // 2. HTTP status codes
  const httpStatus = extractHttpStatus(error);
  if (httpStatus && HTTP_STATUS_MAP[httpStatus]) {
    return HTTP_STATUS_MAP[httpStatus];
  }

  // 3. Supabase and message-based classification
  const message = extractErrorMessage(error).toLowerCase();

  // Auth errors
  if (
    message.includes('jwt expired') ||
    message.includes('jwt') ||
    message.includes('invalid token') ||
    message.includes('not authenticated') ||
    message.includes('unauthorized') ||
    message.includes('invalid login credentials') ||
    message.includes('email not confirmed') ||
    message.includes('invalid refresh token') ||
    message.includes('session_not_found') ||
    message.includes('user not found') ||
    message.includes('invalid api key') ||
    message.includes('permission denied') ||
    message.includes('insufficient_privilege') ||
    message.includes('new row violates row-level security')
  ) {
    return 'auth_error';
  }

  // Not found errors
  if (
    message.includes('not found') ||
    message.includes('no rows returned') ||
    message.includes('pgrst116') || // PostgREST: no rows
    message.includes('does not exist') ||
    message.includes('could not find')
  ) {
    return 'not_found';
  }

  // Validation errors
  if (
    message.includes('invalid input') ||
    message.includes('validation') ||
    message.includes('violates check constraint') ||
    message.includes('violates unique constraint') ||
    message.includes('violates not-null constraint') ||
    message.includes('violates foreign key constraint') ||
    message.includes('duplicate key') ||
    message.includes('already exists') ||
    message.includes('value too long') ||
    message.includes('out of range') ||
    message.includes('invalid_parameter_value')
  ) {
    return 'validation_error';
  }

  // Rate limiting
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('throttle') ||
    message.includes('quota exceeded')
  ) {
    return 'rate_limited';
  }

  // Default to server_error for anything unrecognized
  return 'server_error';
}

// =============================================================================
// ERROR SANITIZATION
// =============================================================================

/**
 * Strips all sensitive information from an error message string.
 * Removes file paths, stack traces, SQL fragments, connection strings,
 * IP addresses, JWT tokens, and other internal details.
 */
function stripSensitiveContent(message: string): string {
  let sanitized = message;

  for (const { pattern } of SENSITIVE_PATTERNS) {
    // Create a new RegExp from the pattern to reset lastIndex
    const regex = new RegExp(pattern.source, pattern.flags);
    sanitized = sanitized.replace(regex, '[redacted]');
  }

  // Collapse multiple consecutive [redacted] markers
  sanitized = sanitized.replace(/(\[redacted\]\s*){2,}/g, '[redacted] ');

  return sanitized.trim();
}

/**
 * Determines whether a message contains any sensitive content.
 */
export function containsSensitiveContent(message: string): boolean {
  for (const { pattern } of SENSITIVE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(message)) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitizes an error for safe client-side display.
 *
 * This function:
 * 1. Classifies the error into a safe category
 * 2. Strips all sensitive information (stack traces, file paths, SQL, etc.)
 * 3. Reports the original error to Sentry for debugging
 * 4. Returns a SanitizedError with a generic, user-safe message
 *
 * @param error - Any caught error (Error, string, object, unknown)
 * @returns A SanitizedError safe to display to end users
 */
export function sanitizeError(error: unknown): SanitizedError {
  const category = classifyError(error);

  // Report the original (unsanitized) error to Sentry for debugging
  if (error instanceof Error) {
    Sentry.captureException(error, {
      tags: { error_category: category },
    });
  } else {
    Sentry.captureMessage(
      `Non-Error thrown: ${extractErrorMessage(error).slice(0, 200)}`,
      {
        level: 'error',
        tags: { error_category: category },
      }
    );
  }

  return {
    category,
    message: SAFE_MESSAGES[category],
    code: SAFE_CODES[category],
    statusCode: SAFE_STATUS_CODES[category],
  };
}

/**
 * Sanitizes an error message string, stripping sensitive content but
 * preserving non-sensitive portions. Useful when you want a partially
 * descriptive message rather than a fully generic one.
 *
 * WARNING: Prefer sanitizeError() for user-facing output. Use this only
 * for internal logging where some detail is acceptable.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return '';
  const stripped = stripSensitiveContent(message);
  // If after stripping the message is mostly redacted, return a generic message
  if (stripped.replace(/\[redacted\]/g, '').trim().length < 10) {
    return 'An error occurred.';
  }
  return stripped;
}

// =============================================================================
// SAFE ERROR BOUNDARY (React Component)
// =============================================================================

interface SafeErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI. Defaults to a generic "Something went wrong" message. */
  fallback?: React.ReactNode;
}

interface SafeErrorBoundaryState {
  hasError: boolean;
  errorCategory: SafeErrorCategory | null;
}

/**
 * React error boundary that catches render errors and displays a safe,
 * generic message without exposing any technical details.
 *
 * All caught errors are reported to Sentry with full context for debugging.
 *
 * Usage:
 * ```tsx
 * <SafeErrorBoundary>
 *   <MyComponent />
 * </SafeErrorBoundary>
 *
 * <SafeErrorBoundary fallback={<CustomErrorPage />}>
 *   <MyComponent />
 * </SafeErrorBoundary>
 * ```
 */
export class SafeErrorBoundary extends React.Component<
  SafeErrorBoundaryProps,
  SafeErrorBoundaryState
> {
  constructor(props: SafeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorCategory: null };
  }

  static getDerivedStateFromError(error: unknown): SafeErrorBoundaryState {
    const category = classifyError(error);
    return { hasError: true, errorCategory: category };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Report to Sentry with full stack and component tree info
    Sentry.captureException(error, {
      tags: { error_category: this.state.errorCategory || 'server_error' },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return React.createElement(
        'div',
        {
          role: 'alert',
          'aria-live': 'assertive',
          style: {
            padding: '2rem',
            textAlign: 'center' as const,
            maxWidth: '480px',
            margin: '4rem auto',
          },
        },
        React.createElement(
          'h2',
          {
            style: {
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              color: '#1a1a1a',
            },
          },
          'Something went wrong'
        ),
        React.createElement(
          'p',
          {
            style: {
              color: '#6b7280',
              marginBottom: '1rem',
              lineHeight: 1.5,
            },
          },
          'An unexpected error occurred. Please try refreshing the page. If the problem persists, contact support.'
        ),
        React.createElement(
          'button',
          {
            onClick: () => this.setState({ hasError: false, errorCategory: null }),
            style: {
              padding: '0.5rem 1.5rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            },
            'aria-label': 'Try again',
          },
          'Try again'
        )
      );
    }

    return this.props.children;
  }
}
