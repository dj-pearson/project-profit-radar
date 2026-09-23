import { z } from 'zod';
import { optionalNumericString, requiredDateField, requiredText } from './common';

const baseProjectSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  client_name: z.string()
    .trim()
    .min(1, 'Client name is required')
    .max(200, 'Client name must be less than 200 characters'),
  client_email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  client_phone: z.string()
    .regex(/^[\d\s\-()+]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  project_address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  budget: z.number()
    .positive('Budget must be greater than 0')
    .max(100000000, 'Budget cannot exceed $100,000,000')
    .optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid project status' }),
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Invalid priority level' }),
  }).optional(),
});

export const projectSchema = baseProjectSchema.refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

export const projectUpdateSchema = baseProjectSchema.partial().extend({
  id: z.string().uuid('Invalid project ID'),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

/**
 * The Projects page "Edit Project" dialog (US-268). Every field is the string
 * the input holds; buildProjectEditUpdates turns them into the same update the
 * FormData version sent, parseInt/parseFloat included.
 */
export const projectEditFormSchema = z
  .object({
    name: requiredText('Project name is required', 200),
    client_name: z.string()
      .refine((v) => v.trim().length > 0, { message: 'Client name is required' })
      .refine((v) => v.length <= 200, { message: 'Must be 200 characters or fewer' }),
    site_address: z.string(),
    status: z.string(),
    completion_percentage: optionalNumericString({
      min: 0,
      max: 100,
      integer: true,
      message: 'Enter a whole number from 0 to 100',
    }),
    budget: optionalNumericString({ min: 0, message: 'Enter a budget of 0 or more' }),
    start_date: requiredDateField('Start date is required'),
    end_date: requiredDateField('End date is required'),
    description: z.string(),
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date'],
  });

export type ProjectEditFormValues = z.infer<typeof projectEditFormSchema>;

interface EditableProject {
  name?: string | null;
  client_name?: string | null;
  site_address?: string | null;
  status?: string | null;
  completion_percentage?: number | null;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
}

const PROJECT_EDIT_FIELDS = [
  'name',
  'client_name',
  'site_address',
  'status',
  'completion_percentage',
  'budget',
  'start_date',
  'end_date',
  'description',
] as const satisfies ReadonlyArray<keyof ProjectEditFormValues>;

/**
 * Form defaults from a project row. A null column becomes an empty input,
 * which is what the uncontrolled defaultValue inputs submitted before.
 */
export function projectEditDefaults(p: EditableProject): ProjectEditFormValues {
  const out = {} as ProjectEditFormValues;
  for (const key of PROJECT_EDIT_FIELDS) {
    const v = p[key];
    out[key] = v === null || v === undefined ? '' : String(v);
  }
  return out;
}

/** The update the edit dialog sends. Same keys and conversions as before. */
export function buildProjectEditUpdates(v: ProjectEditFormValues) {
  return {
    name: v.name,
    client_name: v.client_name,
    site_address: v.site_address,
    status: v.status,
    completion_percentage: parseInt(v.completion_percentage),
    budget: parseFloat(v.budget),
    start_date: v.start_date,
    end_date: v.end_date,
    description: v.description,
  };
}

/**
 * The Create Project page (US-268). Strings as the inputs hold them; the page
 * builds the same insert it always did (parseFloat budget, parseInt hours,
 * blanks as undefined). Dates stay optional, but an end before the start is
 * caught here instead of landing in the schedule.
 */
export const createProjectFormSchema = z
  .object({
    projectName: requiredText('Project name is required', 200),
    description: z.string(),
    projectType: z.string(),
    status: z.string(),
    siteAddress: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    budget: optionalNumericString({ min: 0, message: 'Enter a budget of 0 or more' }),
    estimatedHours: optionalNumericString({ min: 0, integer: true, message: 'Enter a whole number of hours, 0 or more' }),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

export const CREATE_PROJECT_DEFAULTS: CreateProjectFormValues = {
  projectName: '',
  description: '',
  projectType: '',
  status: 'planning',
  siteAddress: '',
  startDate: '',
  endDate: '',
  budget: '',
  estimatedHours: '',
};
