import { describe, it, expect } from 'vitest';
import {
  WRITABLE_PROJECT_COLUMNS,
  WRITABLE_TIME_ENTRY_COLUMNS,
  WRITABLE_ALERT_RULE_COLUMNS,
  WRITABLE_SCHEDULE_COLUMNS,
  pickAllowed,
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
