import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildWarrantyData, warrantyFormDefaults, warrantyFormSchema, type WarrantyFormValues } from '@/lib/validations/warranty';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WarrantyFormProps {
  warranty?: any;
  projectId?: string;
  onClose: () => void;
  onSave: () => void;
}

interface Project {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
}

export const WarrantyForm: React.FC<WarrantyFormProps> = ({ warranty, projectId, onClose, onSave }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const form = useForm<WarrantyFormValues>({
    resolver: zodResolver(warrantyFormSchema),
    defaultValues: warrantyFormDefaults(warranty, projectId),
  });

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile?.company_id);

      // Load vendors
      const { data: vendorsData } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('company_id', userProfile?.company_id);

      // Load purchase orders
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('id, po_number')
        .eq('company_id', userProfile?.company_id);

      setProjects(projectsData || []);
      setVendors(vendorsData || []);
      setPurchaseOrders(poData || []);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const handleSubmit = async (values: WarrantyFormValues) => {
    setLoading(true);

    try {
      const warrantyData = buildWarrantyData(values, userProfile);

      if (warranty) {
        const { error } = await supabase
          .from('warranties')
          .update(warrantyData)
          .eq('id', warranty.id);

        if (error) throw error;

        toast({
          title: "Warranty Updated",
          description: "The warranty has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('warranties')
          .insert([warrantyData]);

        if (error) throw error;

        toast({
          title: "Warranty Created",
          description: "The warranty has been created successfully"
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving warranty:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save warranty"
      });
    } finally {
      setLoading(false);
    }
  };

  const warrantyTypes = [
    { value: 'material', label: 'Material' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'labor', label: 'Labor' },
    { value: 'system', label: 'System' },
    { value: 'manufacturer', label: 'Manufacturer' }
  ];

  const durationOptions = [
    { value: 1, label: '1 Month' },
    { value: 3, label: '3 Months' },
    { value: 6, label: '6 Months' },
    { value: 12, label: '1 Year' },
    { value: 24, label: '2 Years' },
    { value: 36, label: '3 Years' },
    { value: 60, label: '5 Years' },
    { value: 120, label: '10 Years' }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{warranty ? 'Edit Warranty' : 'Add New Warranty'}</DialogTitle>
          <DialogDescription>
            {warranty ? 'Update warranty information' : 'Create a new warranty record'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6" aria-label="Warranty form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectFormField control={form.control} name="warranty_type" label="Warranty Type *" placeholder="Select warranty type" options={warrantyTypes} />
            <InputFormField control={form.control} name="item_name" label="Item Name *" placeholder="e.g., Kitchen Sink, HVAC System" aria-required="true" />
            <InputFormField control={form.control} name="manufacturer" label="Manufacturer" placeholder="e.g., Kohler, Trane" />
            <InputFormField control={form.control} name="model_number" label="Model Number" placeholder="Model/Part Number" />
            <InputFormField control={form.control} name="serial_number" label="Serial Number" placeholder="Serial Number" />
            <SelectFormField
              control={form.control}
              name="project_id"
              label="Project"
              placeholder="Select project"
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
            <SelectFormField
              control={form.control}
              name="vendor_id"
              label="Vendor/Supplier"
              placeholder="Select vendor"
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
            <SelectFormField
              control={form.control}
              name="purchase_order_id"
              label="Purchase Order"
              placeholder="Select purchase order"
              options={purchaseOrders.map((po) => ({ value: po.id, label: po.po_number }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectFormField
              control={form.control}
              name="warranty_duration_months"
              label="Warranty Duration *"
              placeholder="Select duration"
              options={durationOptions.map((o) => ({ value: o.value.toString(), label: o.label }))}
            />
            <InputFormField control={form.control} name="warranty_start_date" label="Start Date *" type="date" aria-required="true" />
            <InputFormField control={form.control} name="installation_date" label="Installation Date" type="date" />
          </div>

          <TextareaFormField control={form.control} name="item_description" label="Item Description" placeholder="Detailed description of the item" rows={3} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextareaFormField control={form.control} name="coverage_details" label="Coverage Details" placeholder="What is covered under this warranty" rows={3} />
            <TextareaFormField control={form.control} name="coverage_limitations" label="Coverage Limitations" placeholder="What is NOT covered or limitations" rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputFormField control={form.control} name="warranty_contact_name" label="Warranty Contact Name" placeholder="Contact person for warranty claims" />
            <InputFormField control={form.control} name="warranty_contact_phone" label="Contact Phone" placeholder="Phone number" />
            <InputFormField control={form.control} name="warranty_contact_email" label="Contact Email" type="email" placeholder="Email address" />
          </div>

          <FormField
            control={form.control}
            name="is_transferable"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">This warranty can be transferred to the customer</FormLabel>
              </FormItem>
            )}
          />

          <TextareaFormField control={form.control} name="notes" label="Notes" placeholder="Additional notes or comments" rows={3} />

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : warranty ? 'Update Warranty' : 'Create Warranty'}
            </Button>
          </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};