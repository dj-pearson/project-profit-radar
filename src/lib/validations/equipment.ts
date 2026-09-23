import { z } from 'zod';

/** Equipment assignment create/edit form (US-268). Dates are Date objects from the calendar picker. */
export const equipmentAssignmentFormSchema = z
  .object({
    equipment_id: z.string().min(1, 'Select equipment'),
    project_id: z.string().min(1, 'Select a project'),
    assigned_quantity: z.number().int('Enter a whole number').min(1, 'Quantity must be at least 1'),
    start_date: z.date({ required_error: 'Pick a start date', invalid_type_error: 'Pick a start date' }),
    end_date: z.date({ required_error: 'Pick an end date', invalid_type_error: 'Pick an end date' }),
    assignment_status: z.string(),
    notes: z.string(),
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date cannot be before the start date',
    path: ['end_date'],
  });
export type EquipmentAssignmentFormValues = z.infer<typeof equipmentAssignmentFormSchema>;
