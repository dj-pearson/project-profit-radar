import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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

  const [formData, setFormData] = useState({
    project_id: permit?.project_id || projectId || '',
    permit_type: permit?.permit_type || '',
    permit_name: permit?.permit_name || '',
    permit_number: permit?.permit_number || '',
    description: permit?.description || '',
    issuing_authority: permit?.issuing_authority || '',
    application_date: permit?.application_date || undefined,
    application_fee: permit?.application_fee || 0,
    application_status: permit?.application_status || 'not_applied',
    approval_date: permit?.approval_date || undefined,
    permit_fee: permit?.permit_fee || 0,
    permit_start_date: permit?.permit_start_date || undefined,
    permit_expiry_date: permit?.permit_expiry_date || undefined,
    contact_name: permit?.contact_name || '',
    contact_phone: permit?.contact_phone || '',
    contact_email: permit?.contact_email || '',
    conditions: permit?.conditions || '',
    inspection_required: permit?.inspection_required || false,
    bond_required: permit?.bond_required || false,
    bond_amount: permit?.bond_amount || 0,
    priority: permit?.priority || 'medium',
    notes: permit?.notes || ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const permitData = {
        ...formData,
        company_id: userProfile?.company_id,
        created_by: userProfile?.id,
        application_fee: parseFloat(formData.application_fee.toString()) || 0,
        permit_fee: parseFloat(formData.permit_fee.toString()) || 0,
        bond_amount: parseFloat(formData.bond_amount.toString()) || 0
      };

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{permit ? 'Edit Permit' : 'Add New Permit'}</DialogTitle>
          <DialogDescription>
            {permit ? 'Update permit information' : 'Add a new permit to track'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project *</Label>
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
              <Label htmlFor="permit_type">Permit Type *</Label>
              <Select
                value={formData.permit_type}
                onValueChange={(value) => handleInputChange('permit_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select permit type" />
                </SelectTrigger>
                <SelectContent>
                  {permitTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permit_name">Permit Name *</Label>
              <Input
                id="permit_name"
                value={formData.permit_name}
                onChange={(e) => handleInputChange('permit_name', e.target.value)}
                placeholder="Descriptive name for the permit"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permit_number">Permit Number</Label>
              <Input
                id="permit_number"
                value={formData.permit_number}
                onChange={(e) => handleInputChange('permit_number', e.target.value)}
                placeholder="Official permit number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the permit"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issuing_authority">Issuing Authority *</Label>
              <Input
                id="issuing_authority"
                value={formData.issuing_authority}
                onChange={(e) => handleInputChange('issuing_authority', e.target.value)}
                placeholder="City, county, or state agency"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_status">Application Status</Label>
              <Select
                value={formData.application_status}
                onValueChange={(value) => handleInputChange('application_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {applicationStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="application_date">Application Date</Label>
              <Input
                id="application_date"
                type="date"
                value={formData.application_date || ''}
                onChange={(e) => handleInputChange('application_date', e.target.value || undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval_date">Approval Date</Label>
              <Input
                id="approval_date"
                type="date"
                value={formData.approval_date || ''}
                onChange={(e) => handleInputChange('approval_date', e.target.value || undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permit_start_date">Permit Start Date</Label>
              <Input
                id="permit_start_date"
                type="date"
                value={formData.permit_start_date || ''}
                onChange={(e) => handleInputChange('permit_start_date', e.target.value || undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permit_expiry_date">Permit Expiry Date</Label>
              <Input
                id="permit_expiry_date"
                type="date"
                value={formData.permit_expiry_date || ''}
                onChange={(e) => handleInputChange('permit_expiry_date', e.target.value || undefined)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="application_fee">Application Fee</Label>
              <Input
                id="application_fee"
                type="number"
                step="0.01"
                min="0"
                value={formData.application_fee}
                onChange={(e) => handleInputChange('application_fee', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permit_fee">Permit Fee</Label>
              <Input
                id="permit_fee"
                type="number"
                step="0.01"
                min="0"
                value={formData.permit_fee}
                onChange={(e) => handleInputChange('permit_fee', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bond_amount">Bond Amount</Label>
              <Input
                id="bond_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.bond_amount}
                onChange={(e) => handleInputChange('bond_amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleInputChange('contact_name', e.target.value)}
                placeholder="Authority contact person"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conditions">Permit Conditions</Label>
            <Textarea
              id="conditions"
              value={formData.conditions}
              onChange={(e) => handleInputChange('conditions', e.target.value)}
              placeholder="Special conditions or requirements for this permit"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="inspection_required"
                checked={formData.inspection_required}
                onCheckedChange={(checked) => handleInputChange('inspection_required', checked)}
              />
              <Label htmlFor="inspection_required">Inspection Required</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bond_required"
                checked={formData.bond_required}
                onCheckedChange={(checked) => handleInputChange('bond_required', checked)}
              />
              <Label htmlFor="bond_required">Bond Required</Label>
            </div>
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
              {loading ? 'Saving...' : permit ? 'Update Permit' : 'Add Permit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};