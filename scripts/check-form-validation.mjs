#!/usr/bin/env node
/**
 * Guard: <form> elements that bypass react-hook-form + Zod (US-268).
 *
 * CLAUDE.md says forms use react-hook-form + Zod. Most of the tree predates
 * that and keeps each field in its own useState, so validation is whatever the
 * browser's `required` attribute does, errors are a toast after submit, and
 * nothing sets aria-invalid. The fix is useForm + zodResolver with a schema in
 * src/lib/validations and the shared Form components from @/components/ui/form
 * (FormControl sets aria-invalid and aria-describedby, FormMessage renders the
 * error).
 *
 * A file counts as non-compliant when it renders a JSX `<form` and does not
 * import react-hook-form. The count is held exact: up means new code added a
 * raw-state form, down means one was converted and BASELINE should be lowered
 * to lock that in. Tests are excluded.
 *
 * Usage: node scripts/check-form-validation.mjs [--list]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/**
 * Lower this as forms move to useForm + zodResolver. It never goes up.
 * Started at 38 (US-268). The first pass converted the Team invite dialog,
 * the Projects edit dialog and the Daily Reports create dialog. Next up: the
 * auth forms (SignInForm, SignUpForm, PasswordResetFlow), the public lead
 * forms (ContactSalesModal, EmailCaptureModal, PublicBookingForm) and
 * CreateProject.
 */
const BASELINE = 35;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '__tests__') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

const FORM_TAG = /<form[\s>]/;
const RHF_IMPORT = /from\s+['"]react-hook-form['"]/;

const offenders = [];
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  if (FORM_TAG.test(text) && !RHF_IMPORT.test(text)) {
    offenders.push(relative(root, file).split('\\').join('/'));
  }
}
offenders.sort();

if (process.argv.includes('--list')) {
  for (const f of offenders) console.log(f);
}

const count = offenders.length;
if (count > BASELINE) {
  console.error(
    `check-form-validation: ${count} files render a <form> without react-hook-form ` +
      `(baseline ${BASELINE}). New forms use useForm + zodResolver with a schema in ` +
      'src/lib/validations and the Form components from @/components/ui/form.',
  );
  console.error('Run with --list to see every file. Current files:');
  for (const f of offenders) console.error(`  ${f}`);
  process.exit(1);
}
if (count < BASELINE) {
  console.error(
    `check-form-validation: ${count} files render a <form> without react-hook-form, ` +
      `below the baseline of ${BASELINE}. Lower BASELINE in scripts/check-form-validation.mjs ` +
      `to ${count} so the conversion stays locked in.`,
  );
  process.exit(1);
}
console.log(`check-form-validation: ${count} raw-state form files (baseline ${BASELINE}).`);
