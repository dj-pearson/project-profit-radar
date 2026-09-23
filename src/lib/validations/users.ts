import { z } from 'zod';
import { emailField, optionalPhoneField, requiredText } from './common';

export const profileUpdateSchema = z.object({
  first_name: z.string()
    .trim()
    .min(1, 'First name must be at least 1 character')
    .max(50, 'First name must be less than 50 characters')
    .optional(),
  last_name: z.string()
    .trim()
    .min(1, 'Last name must be at least 1 character')
    .max(50, 'Last name must be less than 50 characters')
    .optional(),
  full_name: z.string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  phone: z.string()
    .regex(/^[\d\s\-()+]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  job_title: z.string()
    .max(100, 'Job title must be less than 100 characters')
    .optional(),
  department: z.string()
    .max(100, 'Department must be less than 100 characters')
    .optional(),
  hourly_rate: z.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(1000, 'Hourly rate cannot exceed $1000')
    .optional(),
  avatar_url: z.string()
    .url('Invalid avatar URL')
    .max(2048, 'URL too long')
    .optional()
    .or(z.literal('')),
});

export const passwordChangeSchema = z.object({
  current_password: z.string()
    .min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirm_password: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const emailUpdateSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
});

/**
 * Roles a team manager can invite someone into, in the order the invite
 * dialog lists them. The invite-team-member edge function enforces RBAC; this
 * only keeps the form from sending a role that is not on the list.
 */
export const INVITE_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'quality_inspector', label: 'Quality Inspector' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'field_supervisor', label: 'Field Supervisor' },
  { value: 'technician', label: 'Technician' },
  { value: 'equipment_operator', label: 'Equipment Operator' },
  { value: 'journeyman', label: 'Journeyman' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'apprentice', label: 'Apprentice' },
  { value: 'laborer', label: 'Laborer' },
] as const;

const INVITE_ROLE_VALUES = INVITE_ROLE_OPTIONS.map((r) => r.value) as [string, ...string[]];

/** The Team Management "Invite Team Member" dialog (US-268). */
export const teamInviteSchema = z.object({
  first_name: requiredText('First name is required', 50),
  last_name: requiredText('Last name is required', 50),
  email: emailField,
  role: z.string().refine((v) => INVITE_ROLE_VALUES.includes(v), { message: 'Select a role' }),
  phone: optionalPhoneField,
});

export type TeamInviteValues = z.infer<typeof teamInviteSchema>;

export const EMPTY_TEAM_INVITE: TeamInviteValues = {
  first_name: '',
  last_name: '',
  email: '',
  role: '',
  phone: '',
};

/** The body sent to invite-team-member. Same shape the useState form sent. */
export function buildTeamInviteBody(values: TeamInviteValues) {
  return {
    email: values.email,
    first_name: values.first_name,
    last_name: values.last_name,
    role: values.role,
    phone: values.phone || null,
  };
}

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type EmailUpdateInput = z.infer<typeof emailUpdateSchema>;

/**
 * Project "Invite your client" form (US-268). The handler trims name and
 * email before sending, as the useState version did, so the checks here run
 * on the trimmed value.
 */
export const clientInviteFormSchema = z.object({
  firstName: z.string().refine((v) => v.trim().length > 0, { message: 'First name is required' }),
  lastName: z.string().max(100, 'Must be 100 characters or fewer'),
  email: z
    .string()
    .refine((v) => v.trim().length > 0, { message: 'Email is required' })
    .refine((v) => v.trim() === '' || z.string().email().safeParse(v.trim()).success, {
      message: 'Enter a valid email address',
    }),
  accessLevel: z.string(),
});
export type ClientInviteFormValues = z.infer<typeof clientInviteFormSchema>;

export const CLIENT_INVITE_DEFAULTS: ClientInviteFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  accessLevel: 'read_only',
};

/** The invite-client edge function body. */
export const buildClientInviteBody = (projectId: string, v: ClientInviteFormValues) => ({
  project_id: projectId,
  email: v.email.trim(),
  first_name: v.firstName.trim(),
  last_name: v.lastName.trim() || null,
  access_level: v.accessLevel,
});
