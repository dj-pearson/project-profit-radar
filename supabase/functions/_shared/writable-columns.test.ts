import { describe, it, expect } from 'vitest';
import {
  WRITABLE_PROJECT_COLUMNS,
  WRITABLE_TIME_ENTRY_COLUMNS,
  WRITABLE_ALERT_RULE_COLUMNS,
  WRITABLE_SCHEDULE_COLUMNS,
  pickAllowed,
  SELF_SIGNUP_ROLE,
  ASSIGNABLE_INVITE_ROLES,
  safeInviteRole,
} from './writable-columns';

// These lists are a security control, not a convenience. They exist because
// handlers used to spread a request body straight into insert()/update(), which
// let a caller set any writable column — tenancy, provenance, and on
// time_entries the approval columns that gate payroll review (US-241, US-297).
// A column silently reappearing in one of these lists reopens that hole, so
// assert on what must be ABSENT rather than only on what is present.

const TENANCY_AND_PROVENANCE = [
  'id', 'company_id', 'site_id', 'tenant_id',
  'created_by', 'created_at', 'updated_at',
];

const TIME_ENTRY_APPROVAL_COLUMNS = [
  'approval_status', 'approved_by', 'approved_at', 'approval_notes',
  'rejection_reason', 'submitted_at',
];

describe('writable-column allowlists', () => {
  const lists = {
    projects: WRITABLE_PROJECT_COLUMNS,
    time_entries: WRITABLE_TIME_ENTRY_COLUMNS,
    seo_alert_rules: WRITABLE_ALERT_RULE_COLUMNS,
    seo_monitoring_schedules: WRITABLE_SCHEDULE_COLUMNS,
  };

  for (const [table, columns] of Object.entries(lists)) {
    it(`never lets a caller set tenancy or provenance on ${table}`, () => {
      for (const forbidden of TENANCY_AND_PROVENANCE) {
        expect(columns as readonly string[]).not.toContain(forbidden);
      }
    });

    it(`${table} has no duplicate entries`, () => {
      expect(new Set(columns).size).toBe(columns.length);
    });
  }

  it('never lets a worker set their own timesheet approval state', () => {
    // The clock-in handler used to spread the body, so a worker could post
    // approval_status: 'approved' and skip review entirely.
    for (const forbidden of TIME_ENTRY_APPROVAL_COLUMNS) {
      expect(WRITABLE_TIME_ENTRY_COLUMNS as readonly string[]).not.toContain(forbidden);
    }
  });

  it('never lets a caller set derived totals on time_entries', () => {
    // total_hours is computed from start/end by the stop handler.
    expect(WRITABLE_TIME_ENTRY_COLUMNS as readonly string[]).not.toContain('total_hours');
  });
});

describe('pickAllowed', () => {
  it('keeps only allowlisted keys', () => {
    const out = pickAllowed(
      { name: 'Roof', company_id: 'other-tenant', created_by: 'someone-else' },
      WRITABLE_PROJECT_COLUMNS,
    );
    expect(out).toEqual({ name: 'Roof' });
  });

  it('drops every key when nothing is allowlisted', () => {
    expect(pickAllowed({ a: 1, b: 2 }, [])).toEqual({});
  });

  it('omits absent keys rather than writing undefined over them', () => {
    // { status: undefined } in a Supabase update would null the column.
    const out = pickAllowed({ name: 'Roof' }, WRITABLE_PROJECT_COLUMNS);
    expect(Object.keys(out)).toEqual(['name']);
    expect('status' in out).toBe(false);
  });

  it('preserves a legitimately null value', () => {
    const out = pickAllowed({ description: null }, WRITABLE_PROJECT_COLUMNS);
    expect(out).toEqual({ description: null });
  });

  it('does not mutate the input body', () => {
    const body = { name: 'Roof', company_id: 'other-tenant' };
    pickAllowed(body, WRITABLE_PROJECT_COLUMNS);
    expect(body).toEqual({ name: 'Roof', company_id: 'other-tenant' });
  });
});

/**
 * US-338. The same class of hole one level up: not a column the caller should
 * not be writing, a VALUE the caller should not be choosing. signup-with-otp
 * declared `role: z.string().optional().default('admin')` and passed it into a
 * service-role insert on user_profiles, so an UNAUTHENTICATED POST of
 * {"role":"root_admin"} created a root admin.
 */
describe('role assignment is not caller-controlled', () => {
  it('gives a self-signup a workspace role, never a platform one', () => {
    expect(SELF_SIGNUP_ROLE).toBe('admin');
    expect(SELF_SIGNUP_ROLE).not.toBe('root_admin');
  });

  it('never lets an invite mint a root_admin', () => {
    expect(ASSIGNABLE_INVITE_ROLES).not.toContain('root_admin');
  });

  it('falls back to the least-privileged role for anything unrecognised', () => {
    for (const bad of ['root_admin', 'superuser', '', 'ADMIN', null, undefined, 42, {}]) {
      expect(safeInviteRole(bad), `${JSON.stringify(bad)} must not pass through`).toBe(
        'office_staff'
      );
    }
  });

  it('passes the real workspace roles through unchanged', () => {
    for (const role of ASSIGNABLE_INVITE_ROLES) {
      expect(safeInviteRole(role)).toBe(role);
    }
  });

  it('signup-with-otp accepts no role from the request body', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('supabase/functions/signup-with-otp/index.ts', 'utf8');
    // The schema is what an unauthenticated caller reaches. A `role` key here
    // in any form is the bug.
    const schema = /const signupSchema = z\.object\(\{([\s\S]*?)\n\}\);/.exec(src);
    expect(schema, 'signupSchema not found').toBeTruthy();
    const body = schema![1]
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//'))
      .join('\n');
    expect(body, 'signup schema takes a role again').not.toMatch(/\brole\s*:/);
    expect(src).toContain('role: SELF_SIGNUP_ROLE');
  });

  it('verify-auth-otp clamps the role it reads from invite metadata', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('supabase/functions/verify-auth-otp/index.ts', 'utf8');
    expect(src).toContain('role: safeInviteRole(');
    expect(src, 'raw metadata role is being trusted again').not.toMatch(
      /role:\s*result\.metadata\?\.role\s*\|\|/
    );
  });

  it('the browser sends no role at signup', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/contexts/AuthContext.tsx', 'utf8');
    expect(src, 'AuthContext forwards a caller-chosen role again').not.toMatch(
      /role:\s*userData\?\.role/
    );
  });
});
