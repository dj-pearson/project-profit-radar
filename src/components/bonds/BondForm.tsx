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

  const [formData, setFormData] = useState({
    project_id: bond?.project_id || '',
    bond_type: bond?.bond_type || 'performance',
    bond_number: bond?.bond_number || '',
    bond_name: bond?.bond_name || '',
    description: bond?.description || '',
    bond_amount: bond?.bond_amount || 0,
    premium_amount: bond?.premium_amount || 0,
    bond_percentage: bond?.bond_percentage || 100,
    principal_name: bond?.principal_name || '',
    obligee_name: bond?.obligee_name || '',
    surety_company: bond?.surety_company || '',
    surety_contact_name: bond?.surety_contact_name || '',
    surety_contact_phone: bond?.surety_contact_phone || '',
    surety_contact_email: bond?.surety_contact_email || '',
    agent_company: bond?.agent_company || '',
    agent_name: bond?.agent_name || '',
    agent_phone: bond?.agent_phone || '',
    agent_email: bond?.agent_email || '',
    effective_date: bond?.effective_date || '',
    expiry_date: bond?.expiry_date || '',
    issued_date: bond?.issued_date || '',
    status: bond?.status || 'pending',
    notes: bond?.notes || '',
    claim_made: bond?.claim_made || false,
    claim_amount: bond?.claim_amount || 0,
    claim_date: bond?.claim_date || '',
    claim_status: bond?.claim_status || '',
    claim_notes: bond?.claim_notes || ''
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
      const bondData = {
        ...formData,
        company_id: userProfile?.company_id,
        created_by: userProfile?.id,
        bond_amount: parseFloat(formData.bond_amount.toString()) || 0,
        premium_amount: parseFloat(formData.premium_amount.toString()) || 0,
        bond_percentage: parseFloat(formData.bond_percentage.toString()) || 100,
        claim_amount: parseFloat(formData.claim_amount.toString()) || 0,
        // Convert empty strings to null for date fields
        effective_date: formData.effective_date || null,
        expiry_date: formData.expiry_date || null,
        issued_date: formData.issued_date || null,
        claim_date: formData.claim_date || null
      };

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bond ? 'Edit Bond' : 'Add New Bond'}</DialogTitle>
          <DialogDescription>
            {bond ? 'Update bond information' : 'Add a new bond for tracking'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => handleInputChange('project_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
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
              <Label htmlFor="bond_type">Bond Type *</Label>
              <Select
                value={formData.bond_type}
                onValueChange={(value) => handleInputChange('bond_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bond type" />
                </SelectTrigger>
                <SelectContent>
                  {bondTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bond_number">Bond Number *</Label>
              <Input
                id="bond_number"
                value={formData.bond_number}
                onChange={(e) => handleInputChange('bond_number', e.target.value)}
                placeholder="Bond number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bond_name">Bond Name *</Label>
              <Input
                id="bond_name"
                value={formData.bond_name}
                onChange={(e) => handleInputChange('bond_name', e.target.value)}
                placeholder="Descriptive name for the bond"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the bond"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bond_amount">Bond Amount *</Label>
              <Input
                id="bond_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.bond_amount}
                onChange={(e) => handleInputChange('bond_amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="premium_amount">Premium Amount</Label>
              <Input
                id="premium_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.premium_amount}
                onChange={(e) => handleInputChange('premium_amount', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bond_percentage">Coverage Percentage</Label>
              <Input
                id="bond_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.bond_percentage}
                onChange={(e) => handleInputChange('bond_percentage', e.target.value)}
                placeholder="100.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="principal_name">Principal (Contractor) *</Label>
              <Input
                id="principal_name"
                value={formData.principal_name}
                onChange={(e) => handleInputChange('principal_name', e.target.value)}
                placeholder="The contractor name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obligee_name">Obligee (Project Owner) *</Label>
              <Input
                id="obligee_name"
                value={formData.obligee_name}
                onChange={(e) => handleInputChange('obligee_name', e.target.value)}
                placeholder="The project owner/beneficiary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surety_company">Surety Company *</Label>
              <Input
                id="surety_company"
                value={formData.surety_company}
                onChange={(e) => handleInputChange('surety_company', e.target.value)}
                placeholder="Insurance/surety company name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surety_contact_name">Surety Contact</Label>
              <Input
                id="surety_contact_name"
                value={formData.surety_contact_name}
                onChange={(e) => handleInputChange('surety_contact_name', e.target.value)}
                placeholder="Contact person at surety company"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surety_contact_phone">Surety Phone</Label>
              <Input
                id="surety_contact_phone"
                value={formData.surety_contact_phone}
                onChange={(e) => handleInputChange('surety_contact_phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surety_contact_email">Surety Email</Label>
              <Input
                id="surety_contact_email"
                type="email"
                value={formData.surety_contact_email}
                onChange={(e) => handleInputChange('surety_contact_email', e.target.value)}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => handleInputChange('effective_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date *</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="claim_made"
                checked={formData.claim_made}
                onCheckedChange={(checked) => handleInputChange('claim_made', checked)}
              />
              <Label htmlFor="claim_made">Claim Made Against This Bond</Label>
            </div>

            {formData.claim_made && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="claim_amount">Claim Amount</Label>
                  <Input
                    id="claim_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.claim_amount}
                    onChange={(e) => handleInputChange('claim_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="claim_date">Claim Date</Label>
                  <Input
                    id="claim_date"
                    type="date"
                    value={formData.claim_date}
                    onChange={(e) => handleInputChange('claim_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="claim_status">Claim Status</Label>
                  <Select
                    value={formData.claim_status}
                    onValueChange={(value) => handleInputChange('claim_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select claim status" />
                    </SelectTrigger>
                    <SelectContent>
                      {claimStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="claim_notes">Claim Notes</Label>
                  <Textarea
                    id="claim_notes"
                    value={formData.claim_notes}
                    onChange={(e) => handleInputChange('claim_notes', e.target.value)}
                    placeholder="Notes about the claim"
                    rows={3}
                  />
                </div>
              </div>
            )}
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
              {loading ? 'Saving...' : bond ? 'Update Bond' : 'Add Bond'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};