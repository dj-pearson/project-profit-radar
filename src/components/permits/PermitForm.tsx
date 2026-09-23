import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { CheckboxFormField, InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildPermitData, permitFormDefaults, permitFormSchema, type PermitFormValues } from '@/lib/validations/permits';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PermitFormProps {
  permit?: any;
  projectId?: string;
  onClose: () => void;
  onSave: () => void;
}

interface Project {
  id: string;
  name: string;
}

export const PermitForm: React.FC<PermitFormProps> = ({ permit, projectId, onClose, onSave }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const form = useForm<PermitFormValues>({
    resolver: zodResolver(permitFormSchema),
    defaultValues: permitFormDefaults(permit, projectId),
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmit = async (values: PermitFormValues) => {
    setLoading(true);

    try {
      const permitData = buildPermitData(values, userProfile);

      if (permit) {
        const { error } = await supabase
          .from('permits')
          .update(permitData)
          .eq('id', permit.id);

        if (error) throw error;

        toast({
          title: "Permit Updated",
          description: "The permit has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('permits')
          .insert(permitData);

        if (error) throw error;

        toast({
          title: "Permit Created",
          description: "The permit has been created successfully"
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving permit:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save permit"
      });
    } finally {
      setLoading(false);
    }
  };

  const permitTypes = [
    'Building Permit',
    'Electrical Permit',
    'Plumbing Permit',
    'HVAC Permit',
    'Demolition Permit',
    'Excavation Permit',
    'Roofing Permit',
    'Mechanical Permit',
    'Fire Safety Permit',
    'Environmental Permit',
    'Other'
  ];

  const applicationStatuses = [
    { value: 'not_applied', label: 'Not Applied' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  return (
    <AccessibleModal
      isOpen={true}
      onClose={onClose}
      title={permit ? 'Edit Permit' : 'Add New Permit'}
      description={permit ? 'Update permit information' : 'Add a new permit to track'}
      size="xl"
    >
      <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6" aria-label="Permit form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectFormField
            control={form.control}
            name="project_id"
            label="Project *"
            placeholder="Select project"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
          <SelectFormField
            control={form.control}
            name="permit_type"
            label="Permit Type *"
            placeholder="Select permit type"
            options={permitTypes.map((t) => ({ value: t, label: t }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputFormField control={form.control} name="permit_name" label="Permit Name *" placeholder="Descriptive name for the permit" aria-required="true" />
          <InputFormField control={form.control} name="permit_number" label="Permit Number" placeholder="Official permit number" />
        </div>

        <TextareaFormField control={form.control} name="description" label="Description" placeholder="Detailed description of the permit" rows={3} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputFormField control={form.control} name="issuing_authority" label="Issuing Authority *" placeholder="City, county, or state agency" aria-required="true" />
          <SelectFormField control={form.control} name="application_status" label="Application Status" placeholder="Select status" options={applicationStatuses} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputFormField control={form.control} name="application_date" label="Application Date" type="date" />
          <InputFormField control={form.control} name="approval_date" label="Approval Date" type="date" />
          <SelectFormField control={form.control} name="priority" label="Priority" placeholder="Select priority" options={priorityLevels} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputFormField control={form.control} name="permit_start_date" label="Permit Start Date" type="date" />
          <InputFormField control={form.control} name="permit_expiry_date" label="Permit Expiry Date" type="date" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputFormField control={form.control} name="application_fee" label="Application Fee" type="number" step="0.01" min="0" placeholder="0.00" />
          <InputFormField control={form.control} name="permit_fee" label="Permit Fee" type="number" step="0.01" min="0" placeholder="0.00" />
          <InputFormField control={form.control} name="bond_amount" label="Bond Amount" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputFormField control={form.control} name="contact_name" label="Contact Name" placeholder="Authority contact person" />
          <InputFormField control={form.control} name="contact_phone" label="Contact Phone" placeholder="Phone number" />
          <InputFormField control={form.control} name="contact_email" label="Contact Email" type="email" placeholder="Email address" />
        </div>

        <TextareaFormField control={form.control} name="conditions" label="Permit Conditions" placeholder="Special conditions or requirements for this permit" rows={3} />

        <div className="flex items-center space-x-6">
          <CheckboxFormField control={form.control} name="inspection_required" label="Inspection Required" />
          <CheckboxFormField control={form.control} name="bond_required" label="Bond Required" />
        </div>

        <TextareaFormField control={form.control} name="notes" label="Notes" placeholder="Additional notes or comments" rows={3} />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : permit ? 'Update Permit' : 'Add Permit'}
          </Button>
        </div>
      </form>
      </Form>
    </AccessibleModal>
  );
};