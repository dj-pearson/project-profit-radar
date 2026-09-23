import { z } from 'zod';
import { emailField, requiredText } from './common';

/**
 * Auth form schemas (US-268). The sign-in, sign-up and password-reset forms
 * on /auth validate through these, and the Auth page's password-requirement
 * checklist uses passwordRuleErrors, so the rules live in one place.
 */

/** The special characters a new password may use to meet the symbol rule. */
export const PASSWORD_SPECIAL_CHAR = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/** The unmet new-password rules, in the order the Auth page lists them. */
export function passwordRuleErrors(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(pwd)) errors.push('Must contain uppercase letter');
  if (!/[a-z]/.test(pwd)) errors.push('Must contain lowercase letter');
  if (!/\d/.test(pwd)) errors.push('Must contain a number');
  if (!PASSWORD_SPECIAL_CHAR.test(pwd)) errors.push('Must contain special character');
  return errors;
}

/** A password being set: signup and reset. Reports the first unmet rule. */
export const newPasswordField = z
  .string()
  .max(128, 'Password must be 128 characters or fewer')
  .superRefine((pwd, ctx) => {
    const [first] = passwordRuleErrors(pwd);
    if (first) ctx.addIssue({ code: z.ZodIssueCode.custom, message: first });
  });

/** A password being checked at sign-in: any non-empty value up to the input's limit. */
export const currentPasswordField = z
  .string()
  .min(1, 'Password is required')
  .max(128, 'Password must be 128 characters or fewer');

export const signInSchema = z.object({
  email: emailField,
  password: currentPasswordField,
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  firstName: requiredText('First name is required', 50),
  lastName: requiredText('Last name is required', 50),
  email: emailField,
  password: newPasswordField,
  termsAccepted: z.boolean().refine((v) => v, {
    message: 'Accept the Terms of Service and Privacy Policy to continue',
  }),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const passwordResetRequestSchema = z.object({
  email: emailField,
});
export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;

export const newPasswordSchema = z
  .object({
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
