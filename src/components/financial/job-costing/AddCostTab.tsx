import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CostCode, JobCostForm, Project } from './types';

interface AddCostTabProps {
  projects: Project[];
  newCostForm: JobCostForm;
  updateFormField: (field: string, value: string) => void;
  costCodes: CostCode[];
  addJobCost: () => void;
  addingCost: boolean;
}

/** Add Cost tab: the new job cost entry form. */
export function AddCostTab({ projects, newCostForm, updateFormField, costCodes, addJobCost, addingCost }: AddCostTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Job Cost</CardTitle>
        <CardDescription>
          Record costs for labor, materials, equipment, and other expenses
        </CardDescription>
      </CardHeader>
       <CardContent className="space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="space-y-2">
             <Label>Project *</Label>
             <Select 
               value={newCostForm.project_id} 
               onValueChange={(value) => updateFormField('project_id', value)}
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

           <div className="space-y-2">
             <Label>Cost Code *</Label>
             <Select 
               value={newCostForm.cost_code_id} 
               onValueChange={(value) => updateFormField('cost_code_id', value)}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Select cost code" />
               </SelectTrigger>
               <SelectContent>
                 {costCodes.map((code) => (
                   <SelectItem key={code.id} value={code.id}>
                     {code.code} - {code.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           <div className="space-y-2">
             <Label>Date</Label>
             <Input
               type="date"
               value={newCostForm.date}
               onChange={(e) => updateFormField('date', e.target.value)}
             />
           </div>
         </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Labor Hours</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={newCostForm.labor_hours}
              onChange={(e) => updateFormField('labor_hours', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Labor Cost</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newCostForm.labor_cost}
              onChange={(e) => updateFormField('labor_cost', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Material Cost</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newCostForm.material_cost}
              onChange={(e) => updateFormField('material_cost', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Equipment Cost</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newCostForm.equipment_cost}
              onChange={(e) => updateFormField('equipment_cost', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Other Cost</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newCostForm.other_cost}
              onChange={(e) => updateFormField('other_cost', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Total Cost</Label>
            <Input
              type="number"
              step="0.01"
              value={
                (parseFloat(newCostForm.labor_cost) || 0) +
                (parseFloat(newCostForm.material_cost) || 0) +
                (parseFloat(newCostForm.equipment_cost) || 0) +
                (parseFloat(newCostForm.other_cost) || 0)
              }
              readOnly
              className="bg-muted"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={newCostForm.description}
            onChange={(e) => updateFormField('description', e.target.value)}
            placeholder="Describe the work performed or materials used..."
            rows={3}
          />
        </div>

         <Button 
           onClick={addJobCost}
           disabled={addingCost || !newCostForm.project_id || !newCostForm.cost_code_id}
           className="w-full"
         >
           {addingCost ? 'Adding...' : 'Add Job Cost'}
         </Button>
      </CardContent>
    </Card>
  );
}
