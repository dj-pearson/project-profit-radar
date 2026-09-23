import { z } from 'zod';
import { optionalNumericString, requiredText } from './common';

/** Task create and edit dialogs (US-268). */

export const TASK_CATEGORIES = [
  'general',
  'permit',
  'estimate',
  'inspection',
  'material_order',
  'labor',
  'safety',
  'quality_control',
  'client_communication',
  'documentation',
  'financial',
  'equipment',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

const taskFields = {
  name: requiredText('Task name is required', 200),
  description: z.string().max(5000, 'Must be 5000 characters or fewer'),
  category: z.string(),
  priority: z.string(),
  project_id: z.string().min(1, 'Select a project'),
  assigned_to: z.string(),
  due_date: z.string(),
  estimated_hours: optionalNumericString({ min: 0, message: 'Enter hours of 0 or more' }),
};

export const createTaskFormSchema = z.object(taskFields);
export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

export const CREATE_TASK_DEFAULTS: CreateTaskFormValues = {
  name: '',
  description: '',
  category: 'general',
  priority: 'medium',
  project_id: '',
  assigned_to: '',
  due_date: '',
  estimated_hours: '',
};

/** The tasks insert the useState CreateTaskDialog sent. */
export const buildCreateTaskInsert = (
  v: CreateTaskFormValues,
  profile: { id: string; company_id: string },
  projectId?: string,
) => ({
  name: v.name.trim(),
  description: v.description.trim() || null,
  category: v.category as TaskCategory,
  priority: v.priority,
  project_id: projectId || v.project_id,
  assigned_to: v.assigned_to || profile.id,
  created_by: profile.id,
  due_date: v.due_date || null,
  estimated_hours: v.estimated_hours ? parseFloat(v.estimated_hours) : null,
  status: 'todo',
  company_id: profile.company_id,
});

export const editTaskFormSchema = z.object({ ...taskFields, status: z.string() });
export type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;

interface TaskLike {
  name: string;
  description?: string;
  status: string;
  category: string;
  priority: string;
  due_date?: string;
  estimated_hours?: number;
  project_id: string;
}

export const editTaskDefaults = (task: TaskLike): EditTaskFormValues => ({
  name: task.name,
  description: task.description || '',
  category: task.category,
  priority: task.priority,
  status: task.status,
  project_id: task.project_id,
  assigned_to: 'unassigned', // Set once the user list loads
  due_date: task.due_date ? task.due_date.split('T')[0] : '',
  estimated_hours: task.estimated_hours?.toString() || '',
});

/** The tasks update the useState EditTaskDialog sent. */
export const buildEditTaskUpdate = (v: EditTaskFormValues) => ({
  name: v.name.trim(),
  description: v.description.trim() || null,
  category: v.category as TaskCategory,
  priority: v.priority,
  status: v.status,
  project_id: v.project_id,
  assigned_to: v.assigned_to === 'unassigned' ? null : v.assigned_to || null,
  due_date: v.due_date || null,
  estimated_hours: v.estimated_hours ? parseFloat(v.estimated_hours) : null,
});

export const taskCategoryLabel = (category: string) =>
  category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
