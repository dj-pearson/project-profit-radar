import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Form } from '@/components/ui/form';
import { InputFormField, SelectFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  buildLeadUpdates,
  leadEditDefaults,
  leadEditFormSchema,
  type LeadEditFormValues,
} from '@/lib/validations/crm';
import { Save } from 'lucide-react';
import type { Lead } from '@/pages/CRMDashboard';

const PROJECT_TYPES = [
  { value: 'residential_new', label: 'Residential New' },
  { value: 'residential_remodel', label: 'Residential Remodel' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'civil', label: 'Civil' },
];
const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];
const LEAD_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
const LEAD_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'direct_mail', label: 'Direct Mail' },
  { value: 'other', label: 'Other' },
];

interface LeadEditDialogProps {
  lead: Lead;
  onUpdate: (leadId: string, updates: Partial<Lead>) => void;
  children: React.ReactNode;
}

export const LeadEditDialog: React.FC<LeadEditDialogProps> = ({ lead, onUpdate, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<LeadEditFormValues>({
    resolver: zodResolver(leadEditFormSchema),
    defaultValues: leadEditDefaults(lead),
  });

  const handleSubmit = (values: LeadEditFormValues) => {
    onUpdate(lead.id, buildLeadUpdates(values));
    setIsOpen(false);
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveDialogTrigger asChild>
        {children}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="edit-lead-description">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit Lead: {lead.first_name} {lead.last_name}</ResponsiveDialogTitle>
          <p id="edit-lead-description" className="sr-only">Form to edit lead contact information and status</p>
        </ResponsiveDialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4" aria-label="Edit lead form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputFormField control={form.control} name="first_name" label="First Name" aria-required="true" />
            <InputFormField control={form.control} name="last_name" label="Last Name" aria-required="true" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputFormField control={form.control} name="email" label="Email" type="email" aria-required="true" />
            <InputFormField control={form.control} name="phone" label="Phone" aria-required="true" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputFormField control={form.control} name="company_name" label="Company" />
            <InputFormField control={form.control} name="project_name" label="Project Name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectFormField
              control={form.control}
              name="project_type"
              label="Project Type"
              placeholder="Select project type"
              options={PROJECT_TYPES}
            />
            <InputFormField control={form.control} name="estimated_budget" label="Estimated Budget" type="number" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SelectFormField control={form.control} name="status" label="Status" options={LEAD_STATUSES} />
            <SelectFormField control={form.control} name="priority" label="Priority" options={LEAD_PRIORITIES} />
            <SelectFormField control={form.control} name="lead_source" label="Lead Source" options={LEAD_SOURCES} />
          </div>

          <InputFormField control={form.control} name="next_follow_up_date" label="Next Follow-up Date" type="date" />

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" aria-hidden="true" />
              Save Changes
            </Button>
          </div>
        </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
