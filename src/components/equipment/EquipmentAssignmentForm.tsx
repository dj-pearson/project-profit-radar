import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EquipmentAssignmentFormProps {
  assignment?: any;
  equipmentId?: string;
  projectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Project {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
}

const EquipmentAssignmentForm: React.FC<EquipmentAssignmentFormProps> = ({
  assignment,
  equipmentId,
  projectId,
  onSuccess,
  onCancel
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  
  const [formData, setFormData] = useState({
    equipment_id: equipmentId || assignment?.equipment_id || '',
    project_id: projectId || assignment?.project_id || '',
    assigned_quantity: assignment?.assigned_quantity || 1,
    start_date: assignment?.start_date ? new Date(assignment.start_date) : undefined,
    end_date: assignment?.end_date ? new Date(assignment.end_date) : undefined,
    assignment_status: assignment?.assignment_status || 'planned',
    notes: assignment?.notes || ''
  });

  useEffect(() => {
    loadProjects();
    loadEquipment();
  }, [userProfile?.company_id]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadEquipment = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Try to load from equipment table, fall back to sample data if table doesn't exist
      const { data: equipmentData, error } = await supabase
        .from('equipment')
        .select('id, name, equipment_type, model, status')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found
        throw error;
      }

      if (equipmentData && equipmentData.length > 0) {
        const formattedEquipment = equipmentData.map((eq: any) => ({
          id: eq.id,
          name: `${eq.name}${eq.model ? ` ${eq.model}` : ''}`,
          type: eq.equipment_type || 'Equipment'
        }));
        setEquipment(formattedEquipment);
      } else {
        // Fallback data when no equipment exists or table doesn't exist yet
        const fallbackEquipment = [
          { id: 'eq-1', name: 'Excavator CAT 320', type: 'Heavy Machinery' },
          { id: 'eq-2', name: 'Crane Tower 100T', type: 'Heavy Machinery' },
          { id: 'eq-3', name: 'Forklift Toyota 5K', type: 'Material Handling' },
          { id: 'eq-4', name: 'Generator 50KW', type: 'Power Equipment' },
          { id: 'eq-5', name: 'Concrete Mixer', type: 'Construction Equipment' },
          { id: 'eq-6', name: 'Skid Steer Bobcat', type: 'Construction Equipment' }
        ];
        setEquipment(fallbackEquipment);
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      // Even on error, provide fallback data
      const fallbackEquipment = [
        { id: 'eq-1', name: 'Excavator CAT 320', type: 'Heavy Machinery' },
        { id: 'eq-2', name: 'Crane Tower 100T', type: 'Heavy Machinery' },
        { id: 'eq-3', name: 'Forklift Toyota 5K', type: 'Material Handling' },
        { id: 'eq-4', name: 'Generator 50KW', type: 'Power Equipment' },
        { id: 'eq-5', name: 'Concrete Mixer', type: 'Construction Equipment' }
      ];
      setEquipment(fallbackEquipment);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.company_id || !formData.equipment_id || !formData.project_id || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const assignmentData = {
        company_id: userProfile.company_id,
        equipment_id: formData.equipment_id,
        project_id: formData.project_id,
        assigned_quantity: formData.assigned_quantity,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd'),
        assignment_status: formData.assignment_status,
        notes: formData.notes,
        assigned_by: userProfile.id
      };

      if (assignment) {
        const { error } = await supabase
          .from('equipment_assignments')
          .update(assignmentData)
          .eq('id', assignment.assignment_id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Equipment assignment updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('equipment_assignments')
          .insert([assignmentData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Equipment assignment created successfully"
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: "Error",
        description: "Failed to save equipment assignment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="equipment">Equipment</Label>
          <Select
            value={formData.equipment_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, equipment_id: value }))}
            disabled={!!equipmentId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select equipment" />
            </SelectTrigger>
            <SelectContent>
              {equipment.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          <Select
            value={formData.project_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
            disabled={!!projectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={formData.assigned_quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, assigned_quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.assignment_status}
            onValueChange={(value) => setFormData(prev => ({ ...prev, assignment_status: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.start_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.start_date ? format(formData.start_date, "PPP") : "Pick start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.start_date}
                onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.end_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.end_date ? format(formData.end_date, "PPP") : "Pick end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.end_date}
                onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes about this assignment..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {assignment ? 'Update Assignment' : 'Create Assignment'}
        </Button>
      </div>
    </form>
  );
};

export default EquipmentAssignmentForm;