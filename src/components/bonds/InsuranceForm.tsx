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

interface InsuranceFormProps {
  insurance?: any;
  onClose: () => void;
  onSave: () => void;
}

export const InsuranceForm: React.FC<InsuranceFormProps> = ({ insurance, onClose, onSave }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    policy_type: insurance?.policy_type || 'general_liability',
    policy_number: insurance?.policy_number || '',
    policy_name: insurance?.policy_name || '',
    description: insurance?.description || '',
    coverage_limit: insurance?.coverage_limit || 0,
    deductible: insurance?.deductible || 0,
    aggregate_limit: insurance?.aggregate_limit || 0,
    per_occurrence_limit: insurance?.per_occurrence_limit || 0,
    premium_amount: insurance?.premium_amount || 0,
    insurance_company: insurance?.insurance_company || '',
    insurance_company_rating: insurance?.insurance_company_rating || '',
    carrier_contact_name: insurance?.carrier_contact_name || '',
    carrier_contact_phone: insurance?.carrier_contact_phone || '',
    carrier_contact_email: insurance?.carrier_contact_email || '',
    agent_company: insurance?.agent_company || '',
    agent_name: insurance?.agent_name || '',
    agent_phone: insurance?.agent_phone || '',
    agent_email: insurance?.agent_email || '',
    effective_date: insurance?.effective_date || '',
    expiry_date: insurance?.expiry_date || '',
    issued_date: insurance?.issued_date || '',
    status: insurance?.status || 'pending',
    additional_insured_required: insurance?.additional_insured_required || false,
    waiver_of_subrogation: insurance?.waiver_of_subrogation || false,
    primary_non_contributory: insurance?.primary_non_contributory || false,
    notes: insurance?.notes || '',
    claims_made: insurance?.claims_made || false,
    total_claims_amount: insurance?.total_claims_amount || 0,
    claims_count: insurance?.claims_count || 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const insuranceData = {
        ...formData,
        company_id: userProfile?.company_id,
        created_by: userProfile?.id,
        coverage_limit: parseFloat(formData.coverage_limit.toString()) || 0,
        deductible: parseFloat(formData.deductible.toString()) || 0,
        aggregate_limit: parseFloat(formData.aggregate_limit.toString()) || 0,
        per_occurrence_limit: parseFloat(formData.per_occurrence_limit.toString()) || 0,
        premium_amount: parseFloat(formData.premium_amount.toString()) || 0,
        total_claims_amount: parseFloat(formData.total_claims_amount.toString()) || 0,
        claims_count: parseInt(formData.claims_count.toString()) || 0
      };

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="policy_type">Policy Type *</Label>
              <Select
                value={formData.policy_type}
                onValueChange={(value) => handleInputChange('policy_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  {policyTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy_number">Policy Number *</Label>
              <Input
                id="policy_number"
                value={formData.policy_number}
                onChange={(e) => handleInputChange('policy_number', e.target.value)}
                placeholder="Policy number"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="policy_name">Policy Name *</Label>
              <Input
                id="policy_name"
                value={formData.policy_name}
                onChange={(e) => handleInputChange('policy_name', e.target.value)}
                placeholder="Descriptive name for the policy"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance_company">Insurance Company *</Label>
              <Input
                id="insurance_company"
                value={formData.insurance_company}
                onChange={(e) => handleInputChange('insurance_company', e.target.value)}
                placeholder="Insurance carrier name"
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
              placeholder="Detailed description of the policy coverage"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coverage_limit">Coverage Limit *</Label>
              <Input
                id="coverage_limit"
                type="number"
                step="0.01"
                min="0"
                value={formData.coverage_limit}
                onChange={(e) => handleInputChange('coverage_limit', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aggregate_limit">Aggregate Limit</Label>
              <Input
                id="aggregate_limit"
                type="number"
                step="0.01"
                min="0"
                value={formData.aggregate_limit}
                onChange={(e) => handleInputChange('aggregate_limit', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="per_occurrence_limit">Per Occurrence Limit</Label>
              <Input
                id="per_occurrence_limit"
                type="number"
                step="0.01"
                min="0"
                value={formData.per_occurrence_limit}
                onChange={(e) => handleInputChange('per_occurrence_limit', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deductible">Deductible</Label>
              <Input
                id="deductible"
                type="number"
                step="0.01"
                min="0"
                value={formData.deductible}
                onChange={(e) => handleInputChange('deductible', e.target.value)}
                placeholder="0.00"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insurance_company_rating">Company Rating (AM Best)</Label>
              <Select
                value={formData.insurance_company_rating}
                onValueChange={(value) => handleInputChange('insurance_company_rating', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  {ratings.map(rating => (
                    <SelectItem key={rating.value} value={rating.value}>
                      {rating.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="issued_date">Issued Date</Label>
              <Input
                id="issued_date"
                type="date"
                value={formData.issued_date}
                onChange={(e) => handleInputChange('issued_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Special Requirements</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="additional_insured_required"
                  checked={formData.additional_insured_required}
                  onCheckedChange={(checked) => handleInputChange('additional_insured_required', checked)}
                />
                <Label htmlFor="additional_insured_required">Additional Insured Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="waiver_of_subrogation"
                  checked={formData.waiver_of_subrogation}
                  onCheckedChange={(checked) => handleInputChange('waiver_of_subrogation', checked)}
                />
                <Label htmlFor="waiver_of_subrogation">Waiver of Subrogation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="primary_non_contributory"
                  checked={formData.primary_non_contributory}
                  onCheckedChange={(checked) => handleInputChange('primary_non_contributory', checked)}
                />
                <Label htmlFor="primary_non_contributory">Primary Non-Contributory</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier_contact_name">Carrier Contact Name</Label>
              <Input
                id="carrier_contact_name"
                value={formData.carrier_contact_name}
                onChange={(e) => handleInputChange('carrier_contact_name', e.target.value)}
                placeholder="Contact person at carrier"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier_contact_phone">Carrier Phone</Label>
              <Input
                id="carrier_contact_phone"
                value={formData.carrier_contact_phone}
                onChange={(e) => handleInputChange('carrier_contact_phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier_contact_email">Carrier Email</Label>
              <Input
                id="carrier_contact_email"
                type="email"
                value={formData.carrier_contact_email}
                onChange={(e) => handleInputChange('carrier_contact_email', e.target.value)}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent_company">Agent Company</Label>
              <Input
                id="agent_company"
                value={formData.agent_company}
                onChange={(e) => handleInputChange('agent_company', e.target.value)}
                placeholder="Insurance agency name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_name">Agent Name</Label>
              <Input
                id="agent_name"
                value={formData.agent_name}
                onChange={(e) => handleInputChange('agent_name', e.target.value)}
                placeholder="Agent name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_phone">Agent Phone</Label>
              <Input
                id="agent_phone"
                value={formData.agent_phone}
                onChange={(e) => handleInputChange('agent_phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_email">Agent Email</Label>
              <Input
                id="agent_email"
                type="email"
                value={formData.agent_email}
                onChange={(e) => handleInputChange('agent_email', e.target.value)}
                placeholder="Email address"
              />
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
              {loading ? 'Saving...' : insurance ? 'Update Policy' : 'Add Policy'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};