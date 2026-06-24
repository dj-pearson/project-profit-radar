import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeError,
  sanitizeErrorMessage,
  classifyError,
  containsSensitiveContent,
  SENSITIVE_PATTERNS,
  SafeErrorBoundary,
} from '../errorSanitizer';

// Mock Sentry to prevent actual error reporting during tests
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('Security / Error Sanitizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // SENSITIVE_PATTERNS
  // ===========================================================================

  describe('SENSITIVE_PATTERNS', () => {
    it('should have at least 10 patterns', () => {
      expect(SENSITIVE_PATTERNS.length).toBeGreaterThanOrEqual(10);
    });

    it('should detect Unix file paths', () => {
      expect(containsSensitiveContent('/home/user/app/src/index.ts')).toBe(true);
      expect(containsSensitiveContent('/usr/local/bin/node')).toBe(true);
      expect(containsSensitiveContent('/var/log/postgres.log')).toBe(true);
    });

    it('should detect Windows file paths', () => {
      expect(containsSensitiveContent('C:\\Users\\admin\\project\\src\\app.ts')).toBe(true);
      expect(containsSensitiveContent('D:\\Projects\\brikly\\dist\\index.js')).toBe(true);
    });

    it('should detect stack trace frames', () => {
      expect(containsSensitiveContent('at Object.<anonymous> (/app/src/server.ts:42:13)')).toBe(true);
      expect(containsSensitiveContent('at processTicksAndRejections (node:internal/process/task_queues:95:5)')).toBe(true);
    });

    it('should detect SQL fragments', () => {
      expect(containsSensitiveContent('SELECT * FROM users WHERE email = $1')).toBe(true);
      expect(containsSensitiveContent('INSERT INTO projects (name, budget) VALUES ($1, $2)')).toBe(true);
      expect(containsSensitiveContent('DELETE FROM time_entries WHERE id = $1')).toBe(true);
      expect(containsSensitiveContent('DROP TABLE users')).toBe(true);
    });

    it('should detect database schema references', () => {
      expect(containsSensitiveContent('public.projects.budget')).toBe(true);
      expect(containsSensitiveContent('pg_catalog.pg_class')).toBe(true);
    });

    it('should detect connection strings', () => {
      expect(containsSensitiveContent('postgresql://user:pass@db.example.com:5432/brikly')).toBe(true);
      expect(containsSensitiveContent('redis://default:secret@redis.internal:6379')).toBe(true);
    });

    it('should detect IPv4 addresses', () => {
      expect(containsSensitiveContent('Connection refused to 192.168.1.100:5432')).toBe(true);
      expect(containsSensitiveContent('Request from 10.0.0.1')).toBe(true);
    });

    it('should detect environment variable references', () => {
      expect(containsSensitiveContent('SUPABASE_URL=https://xyz.supabase.co')).toBe(true);
      expect(containsSensitiveContent('process.env.DATABASE_URL is undefined')).toBe(true);
      expect(containsSensitiveContent('Missing STRIPE_SECRET_KEY')).toBe(true);
    });

    it('should detect node_modules paths', () => {
      expect(containsSensitiveContent('Error in node_modules/@supabase/supabase-js/dist/main.js')).toBe(true);
    });

    it('should detect JWT tokens', () => {
      expect(containsSensitiveContent('Invalid token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')).toBe(true);
    });

    it('should detect PostgreSQL error context lines', () => {
      expect(containsSensitiveContent('DETAIL: Key (email)=(admin@test.com) already exists.')).toBe(true);
      expect(containsSensitiveContent('HINT: No operator matches the given name and argument types.')).toBe(true);
    });

    it('should detect internal hostnames', () => {
      expect(containsSensitiveContent('Connection to localhost:5432 refused')).toBe(true);
      expect(containsSensitiveContent('host.docker.internal:3000')).toBe(true);
    });

    it('should not flag normal user-facing text', () => {
      expect(containsSensitiveContent('Please check your email and try again.')).toBe(false);
      expect(containsSensitiveContent('Project "Office Renovation" was saved.')).toBe(false);
      expect(containsSensitiveContent('Invalid email format.')).toBe(false);
    });
  });

  // ===========================================================================
  // classifyError
  // ===========================================================================

  describe('classifyError()', () => {
    // PostgreSQL error codes
    describe('PostgreSQL error codes', () => {
      it('should classify unique_violation (23505) as validation_error', () => {
        const error = { code: '23505', message: 'duplicate key value violates unique constraint' };
        expect(classifyError(error)).toBe('validation_error');
      });

      it('should classify not_null_violation (23502) as validation_error', () => {
        const error = { code: '23502', message: 'null value in column "name" violates not-null constraint' };
        expect(classifyError(error)).toBe('validation_error');
      });

      it('should classify foreign_key_violation (23503) as validation_error', () => {
        const error = { code: '23503', message: 'insert or update on table "invoices" violates foreign key constraint' };
        expect(classifyError(error)).toBe('validation_error');
      });

      it('should classify invalid_text_representation (22P02) as validation_error', () => {
        const error = { code: '22P02', message: 'invalid input syntax for type uuid: "not-a-uuid"' };
        expect(classifyError(error)).toBe('validation_error');
      });

      it('should classify insufficient_privilege (42501) as auth_error', () => {
        const error = { code: '42501', message: 'permission denied for table projects' };
        expect(classifyError(error)).toBe('auth_error');
      });

      it('should classify invalid_password (28P01) as auth_error', () => {
        const error = { code: '28P01', message: 'password authentication failed for user "brikly"' };
        expect(classifyError(error)).toBe('auth_error');
      });

      it('should classify too_many_connections (53300) as rate_limited', () => {
        const error = { code: '53300', message: 'too many connections for role "brikly"' };
        expect(classifyError(error)).toBe('rate_limited');
      });

      it('should classify system_error (58000) as server_error', () => {
        const error = { code: '58000', message: 'system error' };
        expect(classifyError(error)).toBe('server_error');
      });

      it('should classify unknown PG class 22 codes as validation_error', () => {
        const error = { code: '22999', message: 'some data exception' };
        expect(classifyError(error)).toBe('validation_error');
      });
    });

    // HTTP status codes
    describe('HTTP status codes', () => {
      it('should classify 400 as validation_error', () => {
        expect(classifyError({ status: 400, message: 'Bad Request' })).toBe('validation_error');
      });

      it('should classify 401 as auth_error', () => {
        expect(classifyError({ status: 401, message: 'Unauthorized' })).toBe('auth_error');
      });

      it('should classify 403 as auth_error', () => {
        expect(classifyError({ status: 403, message: 'Forbidden' })).toBe('auth_error');
      });

      it('should classify 404 as not_found', () => {
        expect(classifyError({ status: 404, message: 'Not Found' })).toBe('not_found');
      });

      it('should classify 409 as validation_error', () => {
        expect(classifyError({ status: 409, message: 'Conflict' })).toBe('validation_error');
      });

      it('should classify 422 as validation_error', () => {
        expect(classifyError({ statusCode: 422, message: 'Unprocessable Entity' })).toBe('validation_error');
      });

      it('should classify 429 as rate_limited', () => {
        expect(classifyError({ status: 429, message: 'Too Many Requests' })).toBe('rate_limited');
      });

      it('should classify 500 as server_error', () => {
        expect(classifyError({ status: 500, message: 'Internal Server Error' })).toBe('server_error');
      });

      it('should classify 503 as server_error', () => {
        expect(classifyError({ status: 503, message: 'Service Unavailable' })).toBe('server_error');
      });
    });

    // Supabase-specific errors
    describe('Supabase error messages', () => {
      it('should classify JWT expired as auth_error', () => {
        expect(classifyError(new Error('JWT expired'))).toBe('auth_error');
      });

      it('should classify invalid login credentials as auth_error', () => {
        expect(classifyError({ message: 'Invalid login credentials' })).toBe('auth_error');
      });

      it('should classify email not confirmed as auth_error', () => {
        expect(classifyError({ message: 'Email not confirmed' })).toBe('auth_error');
      });

      it('should classify invalid refresh token as auth_error', () => {
        expect(classifyError({ message: 'Invalid Refresh Token: Already Used' })).toBe('auth_error');
      });

      it('should classify RLS violation as auth_error', () => {
        expect(classifyError({ message: 'new row violates row-level security policy for table "projects"' })).toBe('auth_error');
      });

      it('should classify PGRST116 (no rows) as not_found', () => {
        expect(classifyError({ message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' })).toBe('not_found');
      });

      it('should classify "not found" messages as not_found', () => {
        expect(classifyError(new Error('Project not found'))).toBe('not_found');
      });

      it('should classify duplicate key as validation_error', () => {
        expect(classifyError({ message: 'duplicate key value violates unique constraint "projects_name_company_id_key"' })).toBe('validation_error');
      });
    });

    // Edge cases
    describe('edge cases', () => {
      it('should classify null as server_error', () => {
        expect(classifyError(null)).toBe('server_error');
      });

      it('should classify undefined as server_error', () => {
        expect(classifyError(undefined)).toBe('server_error');
      });

      it('should classify empty string as server_error', () => {
        expect(classifyError('')).toBe('server_error');
      });

      it('should classify unknown objects as server_error', () => {
        expect(classifyError({ foo: 'bar' })).toBe('server_error');
      });

      it('should classify plain Error without useful message as server_error', () => {
        expect(classifyError(new Error('something broke'))).toBe('server_error');
      });

      it('should classify rate limit messages as rate_limited', () => {
        expect(classifyError(new Error('Rate limit exceeded, please try again later'))).toBe('rate_limited');
      });

      it('should handle error_description field from OAuth errors', () => {
        expect(classifyError({ error: 'invalid_grant', error_description: 'Invalid login credentials' })).toBe('auth_error');
      });
    });

    // Priority: PG code > HTTP status > message
    describe('classification priority', () => {
      it('should prioritize PG code over HTTP status', () => {
        const error = { code: '23505', status: 500, message: 'duplicate key' };
        expect(classifyError(error)).toBe('validation_error');
      });

      it('should prioritize HTTP status over message pattern', () => {
        // status says 404, message says rate limit - status wins
        const error = { status: 404, message: 'rate limit hit but resource not found' };
        expect(classifyError(error)).toBe('not_found');
      });
    });
  });

  // ===========================================================================
  // sanitizeError
  // ===========================================================================

  describe('sanitizeError()', () => {
    it('should return a SanitizedError with safe message for PostgreSQL errors', () => {
      const pgError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "projects_name_company_id_key" DETAIL: Key (name, company_id)=(Test, abc-123) already exists.',
      };
      const result = sanitizeError(pgError);

      expect(result.category).toBe('validation_error');
      expect(result.message).toBe('The provided data is invalid. Please check your input and try again.');
      expect(result.code).toBe('ERR_VALIDATION');
      expect(result.statusCode).toBe(400);
      // Must NOT contain internal details
      expect(result.message).not.toContain('projects_name_company_id_key');
      expect(result.message).not.toContain('company_id');
      expect(result.message).not.toContain('abc-123');
    });

    it('should return safe message for Supabase auth errors', () => {
      const authError = new Error('JWT expired: token is expired by 30m0s');
      const result = sanitizeError(authError);

      expect(result.category).toBe('auth_error');
      expect(result.message).toBe('Authentication failed. Please sign in and try again.');
      expect(result.code).toBe('ERR_AUTH');
      expect(result.statusCode).toBe(401);
    });

    it('should return safe message for Node.js ECONNREFUSED errors', () => {
      const nodeError = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      (nodeError as any).code = 'ECONNREFUSED';
      const result = sanitizeError(nodeError);

      expect(result.category).toBe('server_error');
      expect(result.message).not.toContain('127.0.0.1');
      expect(result.message).not.toContain('5432');
      expect(result.message).not.toContain('ECONNREFUSED');
    });

    it('should return safe message for errors with stack traces', () => {
      const error = new Error('Something failed');
      error.stack = `Error: Something failed
    at Object.<anonymous> (/home/user/project-profit-radar/src/services/projectService.ts:42:13)
    at Module._compile (node:internal/modules/cjs/loader:1275:14)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;

      const result = sanitizeError(error);
      expect(result.message).not.toContain('projectService.ts');
      expect(result.message).not.toContain('/home/user');
      expect(result.message).not.toContain('node:internal');
    });

    it('should return safe message for SQL injection attempt errors', () => {
      const error = new Error("syntax error at or near \"DROP\" in SELECT * FROM projects WHERE id = '1'; DROP TABLE users; --");
      const result = sanitizeError(error);

      expect(result.message).not.toContain('SELECT');
      expect(result.message).not.toContain('DROP TABLE');
      expect(result.message).not.toContain('projects');
    });

    it('should return safe message for connection string leaks', () => {
      const error = new Error('Connection failed: postgresql://brikly:s3cret@db.internal.com:5432/production');
      const result = sanitizeError(error);

      expect(result.message).not.toContain('postgresql://');
      expect(result.message).not.toContain('s3cret');
      expect(result.message).not.toContain('db.internal.com');
    });

    it('should report error to Sentry', async () => {
      const Sentry = await import('@sentry/react');
      const error = new Error('test error');
      sanitizeError(error);
      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should report non-Error values to Sentry as messages', async () => {
      const Sentry = await import('@sentry/react');
      sanitizeError('string error');
      expect(Sentry.captureMessage).toHaveBeenCalled();
    });

    it('should handle null and undefined errors gracefully', () => {
      expect(() => sanitizeError(null)).not.toThrow();
      expect(() => sanitizeError(undefined)).not.toThrow();

      const nullResult = sanitizeError(null);
      expect(nullResult.category).toBe('server_error');
      expect(nullResult.message).toBeTruthy();
    });
  });

  // ===========================================================================
  // sanitizeErrorMessage
  // ===========================================================================

  describe('sanitizeErrorMessage()', () => {
    it('should strip file paths from error messages', () => {
      const message = 'Error loading module at /home/user/app/src/components/Dashboard.tsx:45:12';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('/home/user/app');
      expect(result).not.toContain('Dashboard.tsx');
    });

    it('should strip SQL fragments from error messages', () => {
      const message = 'Failed to execute: SELECT budget, total_spent FROM projects WHERE company_id = $1';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('SELECT');
      expect(result).not.toContain('company_id');
    });

    it('should strip connection strings', () => {
      const message = 'Cannot connect to postgres://admin:password123@10.0.0.5:5432/brikly_prod';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('password123');
      expect(result).not.toContain('10.0.0.5');
      expect(result).not.toContain('postgres://');
    });

    it('should strip IP addresses', () => {
      const message = 'Request from 192.168.1.50 was blocked by firewall at 10.0.0.1:8080';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('192.168.1.50');
      expect(result).not.toContain('10.0.0.1');
    });

    it('should strip stack trace frames', () => {
      const message = 'TypeError: Cannot read property "id" at getUserProfile (/app/src/auth.ts:23:8)';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('/app/src/auth.ts');
      expect(result).not.toContain('23:8');
    });

    it('should strip environment variable references', () => {
      const message = 'Missing required config: process.env.SUPABASE_URL is undefined';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('process.env.SUPABASE_URL');
    });

    it('should strip JWT tokens', () => {
      const message = 'Token validation failed for eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiI');
    });

    it('should strip PostgreSQL DETAIL lines', () => {
      const message = 'Insert failed DETAIL: Key (email)=(admin@brikly.net) already exists.';
      const result = sanitizeErrorMessage(message);
      expect(result).not.toContain('admin@brikly.net');
    });

    it('should return generic message when everything is redacted', () => {
      const message = '/home/user/app/src/secret.ts';
      const result = sanitizeErrorMessage(message);
      expect(result).toBe('An error occurred.');
    });

    it('should handle empty string', () => {
      expect(sanitizeErrorMessage('')).toBe('');
    });

    it('should preserve non-sensitive content', () => {
      const message = 'Failed to save project because the name is too long';
      const result = sanitizeErrorMessage(message);
      expect(result).toContain('Failed to save project');
    });
  });

  // ===========================================================================
  // Real-world error scenarios
  // ===========================================================================

  describe('real-world error scenarios', () => {
    it('should sanitize a full PostgreSQL constraint error', () => {
      const pgError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "user_profiles_email_key"',
        detail: 'Key (email)=(john@example.com) already exists.',
        schema: 'public',
        table: 'user_profiles',
        constraint: 'user_profiles_email_key',
      };
      const result = sanitizeError(pgError);
      expect(result.category).toBe('validation_error');
      expect(result.message).not.toContain('user_profiles');
      expect(result.message).not.toContain('john@example.com');
      expect(result.message).not.toContain('email_key');
    });

    it('should sanitize a Supabase RLS policy error', () => {
      const rlsError = {
        code: '42501',
        message: 'new row violates row-level security policy for table "projects"',
        details: null,
        hint: null,
      };
      const result = sanitizeError(rlsError);
      expect(result.category).toBe('auth_error');
      expect(result.message).not.toContain('row-level security');
      expect(result.message).not.toContain('projects');
    });

    it('should sanitize a Supabase function invocation error', () => {
      const fnError = {
        message: 'Edge Function returned a non-2xx status code',
        status: 500,
        context: {
          functionName: 'stripe-webhooks',
          requestId: 'req_abc123',
        },
      };
      const result = sanitizeError(fnError);
      expect(result.category).toBe('server_error');
      expect(result.message).not.toContain('stripe-webhooks');
      expect(result.message).not.toContain('req_abc123');
    });

    it('should sanitize a Node.js unhandled rejection with full stack', () => {
      const error = new Error('Cannot read properties of undefined (reading "company_id")');
      error.stack = `TypeError: Cannot read properties of undefined (reading 'company_id')
    at getCompanyProjects (/home/user/project-profit-radar/src/hooks/useProjects.ts:34:22)
    at async Object.queryFn (/home/user/project-profit-radar/node_modules/@tanstack/react-query/build/lib/query.js:112:15)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;
      const result = sanitizeError(error);
      expect(result.message).not.toContain('company_id');
      expect(result.message).not.toContain('useProjects.ts');
      expect(result.message).not.toContain('/home/user');
      expect(result.message).not.toContain('tanstack');
    });

    it('should sanitize a Stripe API error', () => {
      const stripeError = {
        status: 402,
        message: 'Your card was declined. Your request was in live mode, but used a known test card: pm_card_visa.',
        type: 'card_error',
        code: 'card_declined',
      };
      const result = sanitizeError(stripeError);
      // 402 is not in our HTTP map, so falls to message-based
      expect(result.message).toBeTruthy();
    });

    it('should sanitize a network timeout error', () => {
      const error = new Error('request to https://ilhzuvemiuyfuxfegtlv.supabase.co/rest/v1/projects?select=* failed, reason: connect ETIMEDOUT 172.31.128.45:443');
      const result = sanitizeError(error);
      expect(result.message).not.toContain('ilhzuvemiuyfuxfegtlv');
      expect(result.message).not.toContain('172.31.128.45');
      expect(result.message).not.toContain('443');
    });

    it('should sanitize multiple sensitive patterns in one message', () => {
      const complexMessage = 'Error at /home/user/app/src/db.ts: SELECT * FROM users failed connecting to postgres://admin:secret@localhost:5432/db';
      const result = sanitizeErrorMessage(complexMessage);
      expect(result).not.toContain('/home/user');
      expect(result).not.toContain('SELECT');
      expect(result).not.toContain('postgres://');
      expect(result).not.toContain('admin:secret');
      expect(result).not.toContain('localhost');
    });
  });

  // ===========================================================================
  // SafeErrorBoundary
  // ===========================================================================

  describe('SafeErrorBoundary', () => {
    it('should be a React component class', () => {
      expect(SafeErrorBoundary).toBeDefined();
      expect(SafeErrorBoundary.prototype).toHaveProperty('render');
      expect(SafeErrorBoundary.prototype).toHaveProperty('componentDidCatch');
    });

    it('should have getDerivedStateFromError static method', () => {
      expect(SafeErrorBoundary.getDerivedStateFromError).toBeDefined();
    });

    it('should set hasError to true when getDerivedStateFromError is called', () => {
      const state = SafeErrorBoundary.getDerivedStateFromError(new Error('test'));
      expect(state.hasError).toBe(true);
      expect(state.errorCategory).toBeDefined();
    });

    it('should classify the error category in state', () => {
      const authState = SafeErrorBoundary.getDerivedStateFromError(new Error('JWT expired'));
      expect(authState.errorCategory).toBe('auth_error');

      const serverState = SafeErrorBoundary.getDerivedStateFromError(new Error('something broke'));
      expect(serverState.errorCategory).toBe('server_error');
    });
  });

  // ===========================================================================
  // containsSensitiveContent
  // ===========================================================================

  describe('containsSensitiveContent()', () => {
    it('should return true for messages with sensitive content', () => {
      expect(containsSensitiveContent('Error at /home/user/app/index.ts')).toBe(true);
      expect(containsSensitiveContent('SELECT * FROM projects')).toBe(true);
      expect(containsSensitiveContent('redis://admin:pass@cache.internal:6379')).toBe(true);
    });

    it('should return false for safe messages', () => {
      expect(containsSensitiveContent('The project name is required.')).toBe(false);
      expect(containsSensitiveContent('Please try again later.')).toBe(false);
      expect(containsSensitiveContent('')).toBe(false);
    });
  });
});
