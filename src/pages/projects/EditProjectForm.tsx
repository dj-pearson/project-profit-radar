import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  projectEditFormSchema,
  projectEditDefaults,
  buildProjectEditUpdates,
  type ProjectEditFormValues,
} from '@/lib/validations/projects';

export const EDIT_PROJECT_FORM_ID = 'edit-project-form';

type EditProjectUpdates = ReturnType<typeof buildProjectEditUpdates>;

interface EditProjectFormProps {
  project: Parameters<typeof projectEditDefaults>[0];
  /** Receives the same update object the FormData version built. */
  onSubmit: (updates: EditProjectUpdates) => Promise<void> | void;
}

/**
 * Projects page "Edit Project" fields (US-268). The submit button lives in the
 * modal footer and points here with form={EDIT_PROJECT_FORM_ID}.
 */
export function EditProjectForm({ project, onSubmit }: EditProjectFormProps) {
  const form = useForm<ProjectEditFormValues>({
    resolver: zodResolver(projectEditFormSchema),
    defaultValues: projectEditDefaults(project),
  });

  const submit = (values: ProjectEditFormValues) => onSubmit(buildProjectEditUpdates(values));

  return (
    <Form {...form}>
      <form
        id={EDIT_PROJECT_FORM_ID}
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="space-y-4"
        aria-label="Edit project form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input {...field} aria-required="true" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="client_name"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>Client Name</FormLabel>
                <FormControl>
                  <Input {...field} aria-required="true" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="site_address"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Site Address</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="completion_percentage"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>Completion %</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" max="100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Budget</FormLabel>
              <FormControl>
                <Input {...field} type="number" step="0.01" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" aria-required="true" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" aria-required="true" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
