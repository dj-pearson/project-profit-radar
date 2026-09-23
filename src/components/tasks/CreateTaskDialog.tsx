import React, { useState, useEffect } from 'react';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CREATE_TASK_DEFAULTS,
  TASK_CATEGORIES,
  buildCreateTaskInsert,
  createTaskFormSchema,
  taskCategoryLabel,
  type CreateTaskFormValues,
} from '@/lib/validations/tasks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  projectId?: string;
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

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectId
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: CREATE_TASK_DEFAULTS,
  });
  const selectedProjectId = form.watch('project_id');

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      loadUsers();
      // Auto-select project if projectId is provided
      if (projectId && !selectedProjectId) {
        form.setValue('project_id', projectId);
      }
    }
  }, [isOpen, userProfile, projectId, selectedProjectId]);

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

  const handleSubmit = async (values: CreateTaskFormValues) => {
    if (!userProfile?.company_id) return;

    setLoading(true);

    try {
      const taskData = buildCreateTaskInsert(
        values,
        { id: userProfile.id, company_id: userProfile.company_id },
        projectId,
      );

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw error;

      onTaskCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    form.reset(CREATE_TASK_DEFAULTS);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Task"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" form="create-task-form" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </>
      }
    >
      <Form {...form}>
      <form id="create-task-form" onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4" aria-label="Create task form">
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
          options={users.map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))}
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