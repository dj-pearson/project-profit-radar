/**
 * US-336: an embed must name a foreign key that relates its two tables.
 *
 * PostgREST lets you disambiguate an embedded resource by naming the
 * constraint. If the named constraint does not relate the two tables, it
 * returns an error rather than rows, and a caller doing `if (error) throw
 * error` fails outright.
 *
 * Three screens did exactly that, all through the same misunderstanding:
 * time_entries.user_id, task_comments.user_id and
 * timesheet_approval_history.performed_by all reference auth.users(id), and
 * user_profiles.id references auth.users(id) too. Siblings, with no
 * relationship between them to embed across.
 *
 * Found by a completed typecheck flagging the crew panel; the other two were
 * invisible to it, because a select written as a template literal containing
 * `*` degrades the inferred type enough to hide the problem.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

const runGuard = () =>
  spawnSync('node', ['scripts/check-embed-constraints.mjs'], { encoding: 'utf8' });

describe('the guard (US-336)', () => {
  it('passes on the current tree', () => {
    const r = runGuard();
    expect(r.stdout + r.stderr).toMatch(/Every constraint-hinted embed names a foreign key/);
    expect(r.status).toBe(0);
  });

  it('is wired into pre-commit and CI', () => {
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain('check-embed-constraints.mjs');
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('check-embed-constraints.mjs');
  });

  it('catches an embed across a constraint that points somewhere else', () => {
    // The exact shape of all three bugs: user_profiles embedded across a
    // constraint that references auth.users.
    const victim = 'src/lib/__tests__/__embed_fixture.ts';
    writeFileSync(victim, [
      "import { supabase } from '@/integrations/supabase/client';",
      'export const q = () => supabase',
      "  .from('task_comments')",
      "  .select('*, user_profiles!task_comments_user_id_fkey(first_name)');",
      '',
    ].join('\n'));

    try {
      const r = runGuard();
      expect(r.status).toBe(1);
      expect(r.stdout + r.stderr).toMatch(/task_comments_user_id_fkey/);
      expect(r.stdout + r.stderr).toMatch(/it references users, not user_profiles/);
    } finally {
      spawnSync('rm', ['-f', victim]);
    }
  });

  it('does not flag an embed across a real foreign key', () => {
    // projects.company_id genuinely references companies, so this must pass.
    const victim = 'src/lib/__tests__/__embed_fixture.ts';
    writeFileSync(victim, [
      "import { supabase } from '@/integrations/supabase/client';",
      'export const q = () => supabase',
      "  .from('projects')",
      "  .select('*, companies!projects_company_id_fkey(name)');",
      '',
    ].join('\n'));

    try {
      const r = runGuard();
      expect(r.status).toBe(0);
    } finally {
      spawnSync('rm', ['-f', victim]);
    }
  });

  it('treats an unverifiable constraint as a pass, not a failure', () => {
    // types.ts is incomplete and migrations do not describe every constraint.
    // Failing on "we cannot tell" would make the guard unusable, and a guard
    // people disable protects nothing.
    const src = readFileSync('scripts/check-embed-constraints.mjs', 'utf8');
    expect(src).toMatch(/if \(targets\.size === 0\) \{[\s\S]{0,200}continue;/);
  });
});

describe('the three broken embeds are gone (US-336)', () => {
  it('the crew panel fetches names separately', () => {
    const panel = strip('src/components/daily-reports/DailyReportCrewPanel.tsx');
    expect(panel).not.toMatch(/user_profiles[!(]/);
    expect(panel).toMatch(/from\('user_profiles'\)/);
  });

  it('timesheet detail and its history fetch names separately', () => {
    const hook = strip('src/hooks/useTimesheetApproval.ts');
    expect(hook).not.toMatch(/user_profiles!time_entries_user_id_fkey/);
    expect(hook).not.toMatch(/user_profiles!time_entries_approved_by_fkey/);
    expect(hook).not.toMatch(/user_profiles!timesheet_approval_history_performed_by_fkey/);
    expect(hook).toMatch(/from\('user_profiles'\)/);
  });

  it('task comments fetch their authors separately', () => {
    const svc = strip('src/services/taskService.ts');
    expect(svc).not.toMatch(/user_profiles!task_comments_user_id_fkey/);
    expect(svc).toMatch(/withCommentAuthors/);
  });

  it('all three degrade rather than throw when the names fail', () => {
    // The hours, the history and the comments are the point of those screens.
    // A missing name must not close them - which is what the embed did, since
    // each caller throws on error.
    for (const [file, marker] of [
      ['src/hooks/useTimesheetApproval.ts', 'Timesheet detail loaded without the names on it'],
      ['src/hooks/useTimesheetApproval.ts', 'Approval history loaded without the names on it'],
      ['src/services/taskService.ts', 'Task comments loaded without their authors'],
      ['src/components/daily-reports/DailyReportCrewPanel.tsx', 'Could not load crew names'],
    ] as const) {
      expect(readFileSync(file, 'utf8'), `${file} should degrade`).toContain(marker);
    }
  });

  it('keeps the embeds that are real foreign keys', () => {
    // project and cost_code on a time entry are genuine relationships and
    // should not have been collateral damage.
    const hook = strip('src/hooks/useTimesheetApproval.ts');
    expect(hook).toMatch(/project:projects\(/);
    expect(hook).toMatch(/cost_code:cost_codes\(/);
  });
});
