import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-320: an invited team member has to actually receive something.
 *
 * invite-team-member was the best-built function in the repo - RBAC, a
 * server-side seat check, company_id derived from the caller, an audit row -
 * and it ended by generating a password, creating the user with it, and then
 * neither sending nor returning it. The inviter got "User Invited
 * Successfully". The invitee was never told an account existed. Nobody but the
 * very first user of a company could ever sign in.
 *
 * Read the tree rather than run it: this is a Deno module with remote imports,
 * the same reason moneyPathWrites.test.ts reads source. What is asserted here
 * is narrow and mechanical - a mailed credential is a security regression, and
 * an unscoped resend is a cross-tenant one - so both are worth a guard that
 * cannot be satisfied by a comment.
 */

const PATH = 'supabase/functions/invite-team-member/index.ts';

/** Comments stripped, so a file that *describes* the old shape does not match. */
function code(path: string): string {
  const raw = readFileSync(path, 'utf8');
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

describe('invite-team-member delivers the invite (US-320)', () => {
  const source = code(PATH);

  it('does not mint a password for the invitee', () => {
    // The exact regression: a random password created server-side, which the
    // recipient can never learn and which is therefore either useless or, if
    // mailed, a credential sitting in an inbox forever.
    expect(source).not.toMatch(/generatePassword/);
    expect(source).not.toMatch(/password:\s*generate/i);
    // createUser must not be handed a password at all.
    const createUserCall = source.slice(
      source.indexOf('createUser({'),
      source.indexOf('createUser({') + 400
    );
    expect(createUserCall).not.toMatch(/\bpassword\s*:/);
  });

  it('sends the invite through the shared SES helper', () => {
    expect(source).toMatch(/from ['"]\.\.\/_shared\/ses-email-service\.ts['"]/);
    expect(source).toMatch(/sendEmail\(/);
  });

  it('emails a set-password link rather than a credential', () => {
    expect(source).toMatch(/generateLink\(/);
    expect(source).toMatch(/type:\s*["']recovery["']/);
    expect(source).toMatch(/action_link/);
  });

  it('tells the caller whether the email was actually sent', () => {
    // Reporting success for an invite nobody received is the bug itself. The
    // response carries the delivery outcome so the UI can offer a resend.
    expect(source).toMatch(/emailSent/);
  });

  it('records delivery on the audit row', () => {
    expect(source).toMatch(/email_sent:/);
  });

  it('scopes a resend to the caller\'s own company', () => {
    // Without this a project_manager could mail a password-reset link to any
    // user id they could guess, in any tenant.
    expect(source).toMatch(/action:\s*z\.literal\(["']resend["']\)/);
    expect(source).toMatch(/target\.company_id\s*!==\s*inviter\.company_id/);
  });

  it('escapes user-supplied names in the HTML body', () => {
    // Company and inviter names reach the template from the database and land
    // in an HTML email.
    expect(source).toMatch(/escapeHtml/);
    expect(source).toMatch(/escapeHtml\(args\.companyName\)/);
  });
});
