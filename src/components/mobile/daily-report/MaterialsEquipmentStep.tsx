import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Wrench, Truck } from 'lucide-react';
import React from 'react';
import type { DailyReportData, EquipmentUsage, MaterialUsage } from './types';
import { getEquipmentConditionColor } from './reportColors';

interface MaterialsEquipmentStepProps {
  newMaterial: MaterialUsage;
  setNewMaterial: React.Dispatch<React.SetStateAction<MaterialUsage>>;
  addMaterial: () => void;
  removeMaterial: (index: number) => void;
  newEquipment: EquipmentUsage;
  setNewEquipment: React.Dispatch<React.SetStateAction<EquipmentUsage>>;
  addEquipment: () => void;
  removeEquipment: (index: number) => void;
  reportData: DailyReportData;
}

/** Step 4 of the mobile daily report: materials used and equipment on site. */
export function MaterialsEquipmentStep({ newMaterial, setNewMaterial, addMaterial, removeMaterial, newEquipment, setNewEquipment, addEquipment, removeEquipment, reportData }: MaterialsEquipmentStepProps) {
  return (
    <div className="space-y-4">
      {/* Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Materials Used
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Material</Label>
                <Input
                  value={newMaterial.material_name}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, material_name: e.target.value }))}
                  placeholder="Material name"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="lbs, yards, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity Used</Label>
                <Input
                  type="number"
                  min="0"
                  value={newMaterial.quantity_used}
                  onChange={(e) => setNewMaterial(prev => ({ 
                    ...prev, 
                    quantity_used: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <Label>Waste (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newMaterial.waste_percentage || 0}
                  onChange={(e) => setNewMaterial(prev => ({ 
                    ...prev, 
                    waste_percentage: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>
            <Button
              onClick={addMaterial}
              disabled={!newMaterial.material_name || !newMaterial.unit}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </div>

          {reportData.material_usage.map((material, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-background border rounded">
              <div className="flex-1">
                <div className="font-medium">{material.material_name}</div>
                <div className="text-sm text-muted-foreground">
                  {material.quantity_used} {material.unit}
                  {material.waste_percentage ? ` • ${material.waste_percentage}% waste` : ''}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMaterial(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Equipment Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
            <div>
              <Label>Equipment</Label>
              <Input
                value={newEquipment.equipment_name}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, equipment_name: e.target.value }))}
                placeholder="Equipment name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hours Used</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newEquipment.hours_used}
                  onChange={(e) => setNewEquipment(prev => ({ 
                    ...prev, 
                    hours_used: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={newEquipment.condition} onValueChange={(value) => 
                  setNewEquipment(prev => ({ ...prev, condition: value as EquipmentUsage['condition'] }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="needs_repair">Needs Repair</SelectItem>
                    <SelectItem value="down">Down/Broken</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newEquipment.notes || ''}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Equipment notes..."
                rows={2}
              />
            </div>
            <Button
              onClick={addEquipment}
              disabled={!newEquipment.equipment_name}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </div>

          {reportData.equipment_usage.map((equipment, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-background border rounded">
              <div className="flex-1">
                <div className="font-medium">{equipment.equipment_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getEquipmentConditionColor(equipment.condition)}>
                    {equipment.condition.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {equipment.hours_used}h used
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEquipment(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
