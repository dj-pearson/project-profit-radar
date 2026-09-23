import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckboxFormField, InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  buildInsuranceData,
  insuranceFormDefaults,
  insuranceFormSchema,
  type InsuranceFormValues,
} from '@/lib/validations/bonds';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InsuranceFormProps {
  insurance?: any;
  onClose: () => void;
  onSave: () => void;
}

export const InsuranceForm: React.FC<InsuranceFormProps> = ({ insurance, onClose, onSave }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<InsuranceFormValues>({
    resolver: zodResolver(insuranceFormSchema),
    defaultValues: insuranceFormDefaults(insurance),
  });

  const handleSubmit = async (values: InsuranceFormValues) => {
    setLoading(true);

    try {
      const insuranceData = buildInsuranceData(values, userProfile);

      if (insurance) {
        const { error } = await supabase
          .from('insurance_policies')
          .update(insuranceData)
          .eq('id', insurance.id);

        if (error) throw error;

        toast({
          title: "Insurance Policy Updated",
          description: "The insurance policy has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('insurance_policies')
          .insert(insuranceData);

        if (error) throw error;

        toast({
          title: "Insurance Policy Created",
          description: "The insurance policy has been created successfully"
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving insurance policy:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save insurance policy"
      });
    } finally {
      setLoading(false);
    }
  };

  const policyTypes = [
    { value: 'general_liability', label: 'General Liability' },
    { value: 'workers_compensation', label: 'Workers Compensation' },
    { value: 'professional_liability', label: 'Professional Liability' },
    { value: 'commercial_auto', label: 'Commercial Auto' },
    { value: 'builders_risk', label: 'Builders Risk' },
    { value: 'umbrella', label: 'Umbrella' },
    { value: 'cyber_liability', label: 'Cyber Liability' },
    { value: 'employment_practices', label: 'Employment Practices' },
    { value: 'directors_officers', label: 'Directors & Officers' },
    { value: 'other', label: 'Other' }
  ];

  const statuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'suspended', label: 'Suspended' }
  ];

  const ratings = [
    { value: 'A++', label: 'A++ (Superior)' },
    { value: 'A+', label: 'A+ (Superior)' },
    { value: 'A', label: 'A (Excellent)' },
    { value: 'A-', label: 'A- (Excellent)' },
    { value: 'B++', label: 'B++ (Good)' },
    { value: 'B+', label: 'B+ (Good)' },
    { value: 'B', label: 'B (Fair)' },
    { value: 'B-', label: 'B- (Fair)' },
    { value: 'C++', label: 'C++ (Marginal)' },
    { value: 'C+', label: 'C+ (Marginal)' },
    { value: 'C', label: 'C (Weak)' },
    { value: 'C-', label: 'C- (Weak)' },
    { value: 'D', label: 'D (Poor)' },
    { value: 'E', label: 'E (Under Regulatory Supervision)' },
    { value: 'F', label: 'F (In Liquidation)' },
    { value: 'S', label: 'S (Suspended)' }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{insurance ? 'Edit Insurance Policy' : 'Add New Insurance Policy'}</DialogTitle>
          <DialogDescription>
            {insurance ? 'Update insurance policy information' : 'Add a new insurance policy for tracking'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6" aria-label="Insurance policy form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectFormField control={form.control} name="policy_type" label="Policy Type *" placeholder="Select policy type" options={policyTypes} />
            <InputFormField control={form.control} name="policy_number" label="Policy Number *" placeholder="Policy number" aria-required="true" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputFormField control={form.control} name="policy_name" label="Policy Name *" placeholder="Descriptive name for the policy" aria-required="true" />
            <InputFormField control={form.control} name="insurance_company" label="Insurance Company *" placeholder="Insurance carrier name" aria-required="true" />
          </div>

          <TextareaFormField control={form.control} name="description" label="Description" placeholder="Detailed description of the policy coverage" rows={3} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputFormField control={form.control} name="coverage_limit" label="Coverage Limit *" type="number" step="0.01" min="0" placeholder="0.00" aria-required="true" />
            <InputFormField control={form.control} name="aggregate_limit" label="Aggregate Limit" type="number" step="0.01" min="0" placeholder="0.00" />
            <InputFormField control={form.control} name="per_occurrence_limit" label="Per Occurrence Limit" type="number" step="0.01" min="0" placeholder="0.00" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputFormField control={form.control} name="deductible" label="Deductible" type="number" step="0.01" min="0" placeholder="0.00" />
            <InputFormField control={form.control} name="premium_amount" label="Premium Amount" type="number" step="0.01" min="0" placeholder="0.00" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectFormField control={form.control} name="insurance_company_rating" label="Company Rating (AM Best)" placeholder="Select rating" options={ratings} />
            <SelectFormField control={form.control} name="status" label="Status" placeholder="Select status" options={statuses} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputFormField control={form.control} name="effective_date" label="Effective Date *" type="date" aria-required="true" />
            <InputFormField control={form.control} name="expiry_date" label="Expiry Date *" type="date" aria-required="true" />
            <InputFormField control={form.control} name="issued_date" label="Issued Date" type="date" />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Special Requirements</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CheckboxFormField control={form.control} name="additional_insured_required" label="Additional Insured Required" />
              <CheckboxFormField control={form.control} name="waiver_of_subrogation" label="Waiver of Subrogation" />
              <CheckboxFormField control={form.control} name="primary_non_contributory" label="Primary Non-Contributory" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputFormField control={form.control} name="carrier_contact_name" label="Carrier Contact Name" placeholder="Contact person at carrier" />
            <InputFormField control={form.control} name="carrier_contact_phone" label="Carrier Phone" placeholder="Phone number" />
            <InputFormField control={form.control} name="carrier_contact_email" label="Carrier Email" type="email" placeholder="Email address" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InputFormField control={form.control} name="agent_company" label="Agent Company" placeholder="Insurance agency name" />
            <InputFormField control={form.control} name="agent_name" label="Agent Name" placeholder="Agent name" />
            <InputFormField control={form.control} name="agent_phone" label="Agent Phone" placeholder="Phone number" />
            <InputFormField control={form.control} name="agent_email" label="Agent Email" type="email" placeholder="Email address" />
          </div>

          <TextareaFormField control={form.control} name="notes" label="Notes" placeholder="Additional notes or comments" rows={3} />

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : insurance ? 'Update Policy' : 'Add Policy'}
            </Button>
          </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};