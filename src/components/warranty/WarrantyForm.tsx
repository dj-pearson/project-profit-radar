import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface WarrantyFormProps {
  warranty?: any;
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

export const WarrantyForm: React.FC<WarrantyFormProps> = ({ warranty, onClose, onSave }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showInstallDatePicker, setShowInstallDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    warranty_type: warranty?.warranty_type || 'material',
    item_name: warranty?.item_name || '',
    item_description: warranty?.item_description || '',
    manufacturer: warranty?.manufacturer || '',
    model_number: warranty?.model_number || '',
    serial_number: warranty?.serial_number || '',
    project_id: warranty?.project_id || '',
    vendor_id: warranty?.vendor_id || '',
    purchase_order_id: warranty?.purchase_order_id || '',
    warranty_duration_months: warranty?.warranty_duration_months || 12,
    warranty_start_date: warranty?.warranty_start_date || new Date().toISOString().split('T')[0],
    installation_date: warranty?.installation_date || '',
    coverage_details: warranty?.coverage_details || '',
    coverage_limitations: warranty?.coverage_limitations || '',
    is_transferable: warranty?.is_transferable || false,
    warranty_contact_name: warranty?.warranty_contact_name || '',
    warranty_contact_phone: warranty?.warranty_contact_phone || '',
    warranty_contact_email: warranty?.warranty_contact_email || '',
    notes: warranty?.notes || ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const warrantyData = {
        ...formData,
        company_id: userProfile?.company_id,
        created_by: userProfile?.id
      };

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warranty_type">Warranty Type *</Label>
              <Select
                value={formData.warranty_type}
                onValueChange={(value) => handleInputChange('warranty_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warranty type" />
                </SelectTrigger>
                <SelectContent>
                  {warrantyTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => handleInputChange('item_name', e.target.value)}
                placeholder="e.g., Kitchen Sink, HVAC System"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                placeholder="e.g., Kohler, Trane"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model_number">Model Number</Label>
              <Input
                id="model_number"
                value={formData.model_number}
                onChange={(e) => handleInputChange('model_number', e.target.value)}
                placeholder="Model/Part Number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => handleInputChange('serial_number', e.target.value)}
                placeholder="Serial Number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => handleInputChange('project_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_id">Vendor/Supplier</Label>
              <Select
                value={formData.vendor_id}
                onValueChange={(value) => handleInputChange('vendor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_order_id">Purchase Order</Label>
              <Select
                value={formData.purchase_order_id}
                onValueChange={(value) => handleInputChange('purchase_order_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase order" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map(po => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warranty_duration_months">Warranty Duration *</Label>
              <Select
                value={formData.warranty_duration_months.toString()}
                onValueChange={(value) => handleInputChange('warranty_duration_months', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_start_date">Start Date *</Label>
              <Input
                id="warranty_start_date"
                type="date"
                value={formData.warranty_start_date}
                onChange={(e) => handleInputChange('warranty_start_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="installation_date">Installation Date</Label>
              <Input
                id="installation_date"
                type="date"
                value={formData.installation_date}
                onChange={(e) => handleInputChange('installation_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item_description">Item Description</Label>
            <Textarea
              id="item_description"
              value={formData.item_description}
              onChange={(e) => handleInputChange('item_description', e.target.value)}
              placeholder="Detailed description of the item"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coverage_details">Coverage Details</Label>
              <Textarea
                id="coverage_details"
                value={formData.coverage_details}
                onChange={(e) => handleInputChange('coverage_details', e.target.value)}
                placeholder="What is covered under this warranty"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverage_limitations">Coverage Limitations</Label>
              <Textarea
                id="coverage_limitations"
                value={formData.coverage_limitations}
                onChange={(e) => handleInputChange('coverage_limitations', e.target.value)}
                placeholder="What is NOT covered or limitations"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warranty_contact_name">Warranty Contact Name</Label>
              <Input
                id="warranty_contact_name"
                value={formData.warranty_contact_name}
                onChange={(e) => handleInputChange('warranty_contact_name', e.target.value)}
                placeholder="Contact person for warranty claims"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_contact_phone">Contact Phone</Label>
              <Input
                id="warranty_contact_phone"
                value={formData.warranty_contact_phone}
                onChange={(e) => handleInputChange('warranty_contact_phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_contact_email">Contact Email</Label>
              <Input
                id="warranty_contact_email"
                type="email"
                value={formData.warranty_contact_email}
                onChange={(e) => handleInputChange('warranty_contact_email', e.target.value)}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_transferable"
              checked={formData.is_transferable}
              onCheckedChange={(checked) => handleInputChange('is_transferable', checked)}
            />
            <Label htmlFor="is_transferable">
              This warranty can be transferred to the customer
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes or comments"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : warranty ? 'Update Warranty' : 'Create Warranty'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};