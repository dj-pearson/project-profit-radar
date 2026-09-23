import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { CheckboxFormField, InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bondFormDefaults, bondFormSchema, buildBondData, type BondFormValues } from '@/lib/validations/bonds';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BondFormProps {
  bond?: any;
  onClose: () => void;
  onSave: () => void;
}

interface Project {
  id: string;
  name: string;
}

export const BondForm: React.FC<BondFormProps> = ({ bond, onClose, onSave }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const form = useForm<BondFormValues>({
    resolver: zodResolver(bondFormSchema),
    defaultValues: bondFormDefaults(bond),
  });
  const claimMade = form.watch('claim_made');

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

  const handleSubmit = async (values: BondFormValues) => {
    setLoading(true);

    try {
      const bondData = buildBondData(values, userProfile);

      if (bond) {
        const { error } = await supabase
          .from('bonds')
          .update(bondData)
          .eq('id', bond.id);

        if (error) throw error;

        toast({
          title: "Bond Updated",
          description: "The bond has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('bonds')
          .insert(bondData);

        if (error) throw error;

        toast({
          title: "Bond Created",
          description: "The bond has been created successfully"
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving bond:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save bond"
      });
    } finally {
      setLoading(false);
    }
  };

  const bondTypes = [
    { value: 'performance', label: 'Performance Bond' },
    { value: 'payment', label: 'Payment Bond' },
    { value: 'bid', label: 'Bid Bond' },
    { value: 'maintenance', label: 'Maintenance Bond' },
    { value: 'supply', label: 'Supply Bond' },
    { value: 'subdivision', label: 'Subdivision Bond' },
    { value: 'license', label: 'License Bond' },
    { value: 'court', label: 'Court Bond' },
    { value: 'fidelity', label: 'Fidelity Bond' },
    { value: 'other', label: 'Other' }
  ];

  const statuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'claimed', label: 'Claimed' },
    { value: 'released', label: 'Released' }
  ];

  const claimStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'settled', label: 'Settled' }
  ];

  return (
    <AccessibleModal
      isOpen={true}
      onClose={onClose}
      title={bond ? 'Edit Bond' : 'Add New Bond'}
      description={bond ? 'Update bond information' : 'Add a new bond for tracking'}
      size="xl"
    >
      <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6" aria-label="Bond form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectFormField
            control={form.control}
            name="project_id"
            label="Project"
            placeholder="Select project (optional)"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
          <SelectFormField control={form.control} name="bond_type" label="Bond Type *" placeholder="Select bond type" options={bondTypes} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputFormField control={form.control} name="bond_number" label="Bond Number *" placeholder="Bond number" aria-required="true" />
          <InputFormField control={form.control} name="bond_name" label="Bond Name *" placeholder="Descriptive name for the bond" aria-required="true" />
        </div>

        <TextareaFormField control={form.control} name="description" label="Description" placeholder="Detailed description of the bond" rows={3} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputFormField control={form.control} name="bond_amount" label="Bond Amount *" type="number" step="0.01" min="0" placeholder="0.00" aria-required="true" />
          <InputFormField control={form.control} name="premium_amount" label="Premium Amount" type="number" step="0.01" min="0" placeholder="0.00" />
          <InputFormField control={form.control} name="bond_percentage" label="Coverage Percentage" type="number" step="0.01" min="0" max="100" placeholder="100.00" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputFormField control={form.control} name="principal_name" label="Principal (Contractor) *" placeholder="The contractor name" aria-required="true" />
          <InputFormField control={form.control} name="obligee_name" label="Obligee (Project Owner) *" placeholder="The project owner/beneficiary" aria-required="true" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputFormField control={form.control} name="surety_company" label="Surety Company *" placeholder="Insurance/surety company name" aria-required="true" />
          <InputFormField control={form.control} name="surety_contact_name" label="Surety Contact" placeholder="Contact person at surety company" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputFormField control={form.control} name="surety_contact_phone" label="Surety Phone" placeholder="Phone number" />
          <InputFormField control={form.control} name="surety_contact_email" label="Surety Email" type="email" placeholder="Email address" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputFormField control={form.control} name="effective_date" label="Effective Date *" type="date" aria-required="true" />
          <InputFormField control={form.control} name="expiry_date" label="Expiry Date *" type="date" aria-required="true" />
          <SelectFormField control={form.control} name="status" label="Status" placeholder="Select status" options={statuses} />
        </div>

        <div className="space-y-4">
          <CheckboxFormField control={form.control} name="claim_made" label="Claim Made Against This Bond" />

          {claimMade && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <InputFormField control={form.control} name="claim_amount" label="Claim Amount" type="number" step="0.01" min="0" placeholder="0.00" />
              <InputFormField control={form.control} name="claim_date" label="Claim Date" type="date" />
              <SelectFormField control={form.control} name="claim_status" label="Claim Status" placeholder="Select claim status" options={claimStatuses} />
              <TextareaFormField control={form.control} name="claim_notes" label="Claim Notes" placeholder="Notes about the claim" rows={3} className="md:col-span-3" />
            </div>
          )}
        </div>

        <TextareaFormField control={form.control} name="notes" label="Notes" placeholder="Additional notes or comments" rows={3} />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : bond ? 'Update Bond' : 'Add Bond'}
          </Button>
        </div>
      </form>
      </Form>
    </AccessibleModal>
  );
};