import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import type { Opportunity } from '@/pages/CRMDashboard';

interface OpportunityEditDialogProps {
  opportunity: Opportunity;
  onUpdate: (opportunityId: string, updates: Partial<Opportunity>) => void;
  children: React.ReactNode;
}

export const OpportunityEditDialog: React.FC<OpportunityEditDialogProps> = ({ opportunity, onUpdate, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: opportunity.name,
    estimated_value: opportunity.estimated_value,
    probability_percent: opportunity.probability_percent,
    stage: opportunity.stage,
    expected_close_date: opportunity.expected_close_date || '',
    account_manager: opportunity.account_manager || '',
    project_type: opportunity.project_type || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(opportunity.id, formData);
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
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Edit opportunity form">
          <div className="space-y-2">
            <Label htmlFor="name">Opportunity Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_value">Estimated Value</Label>
              <Input
                id="estimated_value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability_percent">Probability (%)</Label>
              <Input
                id="probability_percent"
                type="number"
                min="0"
                max="100"
                value={formData.probability_percent}
                onChange={(e) => setFormData({ ...formData, probability_percent: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type</Label>
              <Select value={formData.project_type} onValueChange={(value) => setFormData({ ...formData, project_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential_new">Residential New</SelectItem>
                  <SelectItem value="residential_remodel">Residential Remodel</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_manager">Account Manager</Label>
              <Input
                id="account_manager"
                value={formData.account_manager}
                onChange={(e) => setFormData({ ...formData, account_manager: e.target.value })}
              />
            </div>
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
      </DialogContent>
    </Dialog>
  );
};
