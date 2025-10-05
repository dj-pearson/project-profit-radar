import { z } from 'zod';

export const timeEntrySchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  task_description: z.string()
    .trim()
    .min(1, 'Task description is required')
    .max(500, 'Task description must be less than 500 characters'),
  start_time: z.string().datetime('Invalid start time'),
  end_time: z.string().datetime('Invalid end time').optional(),
  break_duration: z.number()
    .min(0, 'Break duration cannot be negative')
    .max(480, 'Break duration cannot exceed 8 hours')
    .optional(),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  location_latitude: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .optional(),
  location_longitude: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .optional(),
  location_accuracy: z.number()
    .min(0, 'Location accuracy cannot be negative')
    .optional(),
  location_address: z.string()
    .max(500, 'Location address must be less than 500 characters')
    .optional(),
}).refine((data) => {
  if (data.end_time && data.start_time) {
    return new Date(data.end_time) > new Date(data.start_time);
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

export const quickTimeEntrySchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  hours: z.number()
    .min(0.25, 'Hours must be at least 0.25 (15 minutes)')
    .max(24, 'Hours cannot exceed 24'),
  task_description: z.string()
    .trim()
    .min(1, 'Task description is required')
    .max(500, 'Task description must be less than 500 characters'),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
export type QuickTimeEntryInput = z.infer<typeof quickTimeEntrySchema>;
