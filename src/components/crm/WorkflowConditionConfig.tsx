import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface WorkflowConditionConfigProps {
  config: {
    conditions: Condition[];
    logic_operator: 'AND' | 'OR';
  };
  onChange: (config: any) => void;
}

export function WorkflowConditionConfig({ config, onChange }: WorkflowConditionConfigProps) {
  const [conditions, setConditions] = useState<Condition[]>(config.conditions || []);
  const [logicOperator, setLogicOperator] = useState<'AND' | 'OR'>(config.logic_operator || 'AND');

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'contains', label: 'Contains' },
    { value: 'exists', label: 'Exists' },
  ];

  const commonFields = [
    { value: 'status', label: 'Status' },
    { value: 'lead_score', label: 'Lead Score' },
    { value: 'estimated_budget', label: 'Estimated Budget' },
    { value: 'source', label: 'Source' },
    { value: 'created_at', label: 'Created Date' },
    { value: 'last_activity_at', label: 'Last Activity' },
    { value: 'tags', label: 'Tags' },
    { value: 'assigned_to', label: 'Assigned To' },
  ];

  const addCondition = () => {
    const newConditions = [...conditions, { field: '', operator: 'equals', value: '' }];
    setConditions(newConditions);
    onChange({ conditions: newConditions, logic_operator: logicOperator });
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    onChange({ conditions: newConditions, logic_operator: logicOperator });
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
    onChange({ conditions: newConditions, logic_operator: logicOperator });
  };

  const updateLogicOperator = (operator: 'AND' | 'OR') => {
    setLogicOperator(operator);
    onChange({ conditions, logic_operator: operator });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Condition Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Logic Operator</Label>
          <RadioGroup value={logicOperator} onValueChange={(val) => updateLogicOperator(val as 'AND' | 'OR')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="AND" id="and" />
              <Label htmlFor="and">AND - All conditions must be true</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OR" id="or" />
              <Label htmlFor="or">OR - At least one condition must be true</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Conditions</Label>
            <Button onClick={addCondition} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Condition
            </Button>
          </div>

          {conditions.length === 0 && (
            <p className="text-sm text-muted-foreground">No conditions added yet</p>
          )}

          {conditions.map((condition, index) => (
            <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={condition.field}
                      onValueChange={(val) => updateCondition(index, 'field', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(val) => updateCondition(index, 'operator', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      placeholder="Enter value"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => removeCondition(index)}
                size="sm"
                variant="ghost"
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            When this condition evaluates to <strong>true</strong>, the workflow will continue along the "true" path.
            Otherwise, it will follow the "false" path.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
