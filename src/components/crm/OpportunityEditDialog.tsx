import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { InputFormField, SelectFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  buildOpportunityUpdates,
  opportunityEditDefaults,
  opportunityEditFormSchema,
  type OpportunityEditFormValues,
} from '@/lib/validations/crm';
import { Save } from 'lucide-react';
import type { Opportunity } from '@/pages/CRMDashboard';

const STAGES = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];
const PROJECT_TYPES = [
  { value: 'residential_new', label: 'Residential New' },
  { value: 'residential_remodel', label: 'Residential Remodel' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'civil', label: 'Civil' },
];

interface OpportunityEditDialogProps {
  opportunity: Opportunity;
  onUpdate: (opportunityId: string, updates: Partial<Opportunity>) => void;
  children: React.ReactNode;
}

export const OpportunityEditDialog: React.FC<OpportunityEditDialogProps> = ({ opportunity, onUpdate, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<OpportunityEditFormValues>({
    resolver: zodResolver(opportunityEditFormSchema),
    defaultValues: opportunityEditDefaults(opportunity),
  });

  const handleSubmit = (values: OpportunityEditFormValues) => {
    onUpdate(opportunity.id, buildOpportunityUpdates(values));
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl" aria-describedby="edit-opportunity-description">
        <DialogHeader>
          <DialogTitle>Edit Opportunity: {opportunity.name}</DialogTitle>
          <p id="edit-opportunity-description" className="sr-only">Form to edit opportunity details</p>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4" aria-label="Edit opportunity form">
          <InputFormField control={form.control} name="name" label="Opportunity Name" aria-required="true" />

          <div className="grid grid-cols-2 gap-4">
            <InputFormField control={form.control} name="estimated_value" label="Estimated Value" type="number" aria-required="true" />
            <InputFormField control={form.control} name="probability_percent" label="Probability (%)" type="number" min="0" max="100" aria-required="true" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectFormField control={form.control} name="stage" label="Stage" options={STAGES} />
            <SelectFormField control={form.control} name="project_type" label="Project Type" placeholder="Select project type" options={PROJECT_TYPES} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputFormField control={form.control} name="expected_close_date" label="Expected Close Date" type="date" />
            <InputFormField control={form.control} name="account_manager" label="Account Manager" />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" aria-hidden="true" />
              Save Changes
            </Button>
          </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
