import React, { useState, useEffect } from 'react';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TASK_CATEGORIES,
  buildEditTaskUpdate,
  editTaskDefaults,
  editTaskFormSchema,
  taskCategoryLabel,
  type EditTaskFormValues,
} from '@/lib/validations/tasks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  category: string;
  priority: string;
  due_date?: string;
  estimated_hours?: number;
  assigned_to?: string;
  company_id: string;
  project_id: string;
}

interface EditTaskDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

export const EditTaskDialog: React.FC<EditTaskDialogProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskFormSchema),
    defaultValues: editTaskDefaults(task),
  });

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      loadUsers();
      form.reset(editTaskDefaults(task));
    }
  }, [isOpen, task]);

  // Set assigned_to after users load
  useEffect(() => {
    if (users.length > 0 && task.assigned_to) {
      const userExists = users.some(user => user.id === task.assigned_to);
      form.setValue('assigned_to', userExists ? task.assigned_to : 'unassigned');
    }
  }, [users, task.assigned_to, form]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadUsers = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('company_id', userProfile.company_id)
        .order('first_name');

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (values: EditTaskFormValues) => {
    setLoading(true);

    try {
      const taskData = buildEditTaskUpdate(values);

      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', task.id)
        .select()
        .single();

      if (error) throw error;

      onTaskUpdated({ ...task, ...data });
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      description="Update task details and settings below."
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" form="edit-task-form" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      {task && (
        <div className="text-xs text-muted-foreground mb-2">
          Editing: {task.name} (ID: {task.id})
        </div>
      )}

      <Form {...form}>
      <form id="edit-task-form" onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4" aria-label="Edit task form">
        <InputFormField control={form.control} name="name" label="Task Name *" placeholder="Enter task name" aria-required="true" />

        <TextareaFormField control={form.control} name="description" label="Description" placeholder="Task description (optional)" rows={3} />

        <div className="grid grid-cols-2 gap-4">
          <SelectFormField
            control={form.control}
            name="category"
            label="Category"
            options={TASK_CATEGORIES.map((c) => ({ value: c, label: taskCategoryLabel(c) }))}
          />
          <SelectFormField
            control={form.control}
            name="priority"
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
        </div>

        <SelectFormField
          control={form.control}
          name="status"
          label="Status"
          options={[
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'on_hold', label: 'On Hold' },
          ]}
        />

        <SelectFormField
          control={form.control}
          name="project_id"
          label="Project *"
          placeholder="Select a project"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />

        <SelectFormField
          control={form.control}
          name="assigned_to"
          label="Assigned To"
          placeholder="Assign to..."
          options={[
            { value: 'unassigned', label: 'Unassigned' },
            ...users.map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputFormField control={form.control} name="due_date" label="Due Date" type="date" />
          <InputFormField control={form.control} name="estimated_hours" label="Estimated Hours" type="number" step="0.5" min="0" placeholder="0" />
        </div>
      </form>
      </Form>
    </AccessibleModal>
  );
};