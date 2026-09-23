import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  equipmentAssignmentFormSchema,
  type EquipmentAssignmentFormValues,
} from '@/lib/validations/equipment';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useEquipmentAssignmentForm } from '@/hooks/useEquipmentAssignmentForm';
import type { TablesInsert } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EquipmentAssignmentFormProps {
  assignment?: any;
  equipmentId?: string;
  projectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const EquipmentAssignmentForm: React.FC<EquipmentAssignmentFormProps> = ({
  assignment,
  equipmentId,
  projectId,
  onSuccess,
  onCancel
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const { projects, equipment, optionsLoading, optionsError, refetchOptions, save } = useEquipmentAssignmentForm();
  const loading = save.isPending;
  
  const form = useForm<EquipmentAssignmentFormValues>({
    resolver: zodResolver(equipmentAssignmentFormSchema),
    defaultValues: {
      equipment_id: equipmentId || assignment?.equipment_id || '',
      project_id: projectId || assignment?.project_id || '',
      assigned_quantity: assignment?.assigned_quantity || 1,
      start_date: assignment?.start_date ? new Date(assignment.start_date) : undefined,
      end_date: assignment?.end_date ? new Date(assignment.end_date) : undefined,
      assignment_status: assignment?.assignment_status || 'planned',
      notes: assignment?.notes || '',
    },
  });

  const handleSubmit = async (formData: EquipmentAssignmentFormValues) => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const assignmentData = {
        company_id: userProfile.company_id,
        equipment_id: formData.equipment_id,
        project_id: formData.project_id,
        assigned_quantity: formData.assigned_quantity,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd'),
        assignment_status: formData.assignment_status,
        notes: formData.notes,
        assigned_by: userProfile.id
      };

      await save.mutateAsync({
        assignmentId: assignment ? assignment.assignment_id : undefined,
        row: assignmentData as TablesInsert<'equipment_assignments'>,
      });

      toast({
        title: "Success",
        description: assignment
          ? "Equipment assignment updated successfully"
          : "Equipment assignment created successfully"
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save equipment assignment",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4" aria-label="Equipment assignment form">
      {optionsError && (
        <p role="alert" className="text-sm text-destructive">
          Equipment and projects could not be loaded.{' '}
          <button type="button" className="underline" onClick={() => { void refetchOptions(); }}>Try again</button>
        </p>
      )}
      {!optionsLoading && !optionsError && equipment.length === 0 && !equipmentId && (
        <p className="text-sm text-muted-foreground">
          No equipment has been added yet. Add a machine on the Equipment page, then assign it here.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <SelectFormField
          control={form.control}
          name="equipment_id"
          label="Equipment"
          placeholder="Select equipment"
          disabled={!!equipmentId}
          options={equipment.map((item) => ({ value: item.id, label: `${item.name} (${item.type})` }))}
        />
        <SelectFormField
          control={form.control}
          name="project_id"
          label="Project"
          placeholder="Select project"
          disabled={!!projectId}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="assigned_quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SelectFormField
          control={form.control}
          name="assignment_status"
          label="Status"
          options={[
            { value: 'planned', label: 'Planned' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(['start_date', 'end_date'] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{name === 'start_date' ? 'Start Date' : 'End Date'}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, "PPP")
                          : name === 'start_date' ? "Pick start date" : "Pick end date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <TextareaFormField
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="Additional notes about this assignment..."
        rows={3}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {assignment ? 'Update Assignment' : 'Create Assignment'}
        </Button>
      </div>
    </form>
    </Form>
  );
};

export default EquipmentAssignmentForm;