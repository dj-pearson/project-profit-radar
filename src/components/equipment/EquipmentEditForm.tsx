import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Equipment {
  id: string;
  name: string;
  type: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  last_maintenance: string;
  next_maintenance: string;
  assigned_to: string | null;
  availability: string;
  total_hours: number;
  utilization_rate: number;
  assigned_operator: string | null;
}

interface EquipmentEditFormProps {
  equipment: Equipment;
  onSuccess: (updatedEquipment: Equipment) => void;
  onCancel: () => void;
}

const EquipmentEditForm: React.FC<EquipmentEditFormProps> = ({
  equipment,
  onSuccess,
  onCancel
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Equipment>(equipment);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real app, this would update the database
      // For now, we'll just simulate the update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Success",
        description: "Equipment updated successfully"
      });
      
      onSuccess(formData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update equipment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Equipment, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Equipment Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
              <SelectItem value="Material Handling">Material Handling</SelectItem>
              <SelectItem value="Power Equipment">Power Equipment</SelectItem>
              <SelectItem value="Construction Equipment">Construction Equipment</SelectItem>
              <SelectItem value="Safety Equipment">Safety Equipment</SelectItem>
              <SelectItem value="Hand Tools">Hand Tools</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="serial_number">Serial Number</Label>
          <Input
            id="serial_number"
            value={formData.serial_number}
            onChange={(e) => handleChange('serial_number', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="out_of_service">Out of Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="last_maintenance">Last Maintenance</Label>
          <Input
            id="last_maintenance"
            type="date"
            value={formData.last_maintenance}
            onChange={(e) => handleChange('last_maintenance', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="next_maintenance">Next Maintenance</Label>
          <Input
            id="next_maintenance"
            type="date"
            value={formData.next_maintenance}
            onChange={(e) => handleChange('next_maintenance', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="total_hours">Total Hours</Label>
          <Input
            id="total_hours"
            type="number"
            step="0.1"
            value={formData.total_hours}
            onChange={(e) => handleChange('total_hours', parseFloat(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="assigned_operator">Assigned Operator</Label>
          <Input
            id="assigned_operator"
            value={formData.assigned_operator || ''}
            onChange={(e) => handleChange('assigned_operator', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Equipment'}
        </Button>
      </div>
    </form>
  );
};

export default EquipmentEditForm;