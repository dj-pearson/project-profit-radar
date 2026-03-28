import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  User,
  Shield,
  DollarSign,
  Settings,
  CheckCircle,
  XCircle,
  Circle,
} from 'lucide-react';

type EntityType =
  | 'change_order'
  | 'purchase_order'
  | 'invoice'
  | 'expense'
  | 'timesheet';

type ApproverType = 'role' | 'user';

type ConditionField = 'amount' | 'project_type';

type ConditionOperator = 'greater_than' | 'less_than' | 'equals';

interface WorkflowStep {
  id: string;
  order: number;
  approverType: ApproverType;
  approverValue: string;
  approverLabel: string;
}

interface WorkflowCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

interface Workflow {
  id: string;
  name: string;
  entityType: EntityType;
  description: string;
  isActive: boolean;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  change_order: 'Change Order',
  purchase_order: 'Purchase Order',
  invoice: 'Invoice',
  expense: 'Expense',
  timesheet: 'Timesheet',
};

const ENTITY_TYPE_OPTIONS: EntityType[] = [
  'change_order',
  'purchase_order',
  'invoice',
  'expense',
  'timesheet',
];

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  greater_than: 'Greater than',
  less_than: 'Less than',
  equals: 'Equals',
};

const ROLE_OPTIONS = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'field_supervisor', label: 'Field Supervisor' },
  { value: 'office_staff', label: 'Office Staff' },
];

const USER_OPTIONS = [
  { value: 'user-1', label: 'John Smith' },
  { value: 'user-2', label: 'Sarah Johnson' },
  { value: 'user-3', label: 'Mike Williams' },
];

const INITIAL_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Change Order Approval',
    entityType: 'change_order',
    description: 'Requires PM and admin approval for all change orders',
    isActive: true,
    steps: [
      {
        id: 'step-1',
        order: 1,
        approverType: 'role',
        approverValue: 'project_manager',
        approverLabel: 'Project Manager',
      },
      {
        id: 'step-2',
        order: 2,
        approverType: 'role',
        approverValue: 'admin',
        approverLabel: 'Admin',
      },
    ],
    conditions: [
      {
        id: 'cond-1',
        field: 'amount',
        operator: 'greater_than',
        value: '5000',
      },
    ],
  },
  {
    id: 'wf-2',
    name: 'Expense Report Review',
    entityType: 'expense',
    description: 'Auto-route expense reports based on amount',
    isActive: true,
    steps: [
      {
        id: 'step-3',
        order: 1,
        approverType: 'role',
        approverValue: 'field_supervisor',
        approverLabel: 'Field Supervisor',
      },
      {
        id: 'step-4',
        order: 2,
        approverType: 'role',
        approverValue: 'accounting',
        approverLabel: 'Accounting',
      },
      {
        id: 'step-5',
        order: 3,
        approverType: 'user',
        approverValue: 'user-2',
        approverLabel: 'Sarah Johnson',
      },
    ],
    conditions: [
      {
        id: 'cond-2',
        field: 'amount',
        operator: 'greater_than',
        value: '1000',
      },
    ],
  },
  {
    id: 'wf-3',
    name: 'Timesheet Approval',
    entityType: 'timesheet',
    description: 'Weekly timesheet approval by supervisor',
    isActive: false,
    steps: [
      {
        id: 'step-6',
        order: 1,
        approverType: 'role',
        approverValue: 'field_supervisor',
        approverLabel: 'Field Supervisor',
      },
    ],
    conditions: [
      {
        id: 'cond-3',
        field: 'project_type',
        operator: 'equals',
        value: 'commercial',
      },
    ],
  },
];

interface WorkflowFormState {
  name: string;
  entityType: EntityType;
  description: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
}

const createEmptyForm = (): WorkflowFormState => ({
  name: '',
  entityType: 'change_order',
  description: '',
  steps: [],
  conditions: [],
});

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// -- Sub-components --

const WorkflowDiagram: React.FC<{ steps: WorkflowStep[] }> = ({ steps }) => {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No approval steps configured
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      <div className="flex items-center gap-1 rounded-md border bg-muted/50 px-3 py-2 text-xs font-medium shrink-0">
        <Circle className="h-3 w-3 text-blue-500" />
        Start
      </div>
      {sorted.map((step, index) => (
        <React.Fragment key={step.id}>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs font-medium shadow-sm shrink-0">
            {step.approverType === 'role' ? (
              <Shield className="h-3 w-3 text-indigo-500" />
            ) : (
              <User className="h-3 w-3 text-emerald-500" />
            )}
            <span>
              Step {index + 1}: {step.approverLabel}
            </span>
          </div>
        </React.Fragment>
      ))}
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-1 rounded-md border bg-green-50 px-3 py-2 text-xs font-medium text-green-700 shrink-0">
        <CheckCircle className="h-3 w-3" />
        Approved
      </div>
    </div>
  );
};

const ConditionBadges: React.FC<{ conditions: WorkflowCondition[] }> = ({
  conditions,
}) => {
  if (conditions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {conditions.map((cond) => (
        <Badge key={cond.id} variant="outline" className="text-xs gap-1">
          {cond.field === 'amount' ? (
            <DollarSign className="h-3 w-3" />
          ) : (
            <Settings className="h-3 w-3" />
          )}
          {cond.field === 'amount' ? 'Amount' : 'Project type'}{' '}
          {OPERATOR_LABELS[cond.operator].toLowerCase()} {cond.value}
        </Badge>
      ))}
    </div>
  );
};

// -- Step editor inside dialog --

const StepEditor: React.FC<{
  steps: WorkflowStep[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof WorkflowStep, value: string) => void;
}> = ({ steps, onAdd, onRemove, onChange }) => {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  const handleApproverTypeChange = (step: WorkflowStep, type: ApproverType) => {
    onChange(step.id, 'approverType', type);
    onChange(step.id, 'approverValue', '');
    onChange(step.id, 'approverLabel', '');
  };

  const handleApproverValueChange = (step: WorkflowStep, value: string) => {
    onChange(step.id, 'approverValue', value);
    const options =
      step.approverType === 'role' ? ROLE_OPTIONS : USER_OPTIONS;
    const match = options.find((o) => o.value === value);
    if (match) {
      onChange(step.id, 'approverLabel', match.label);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Approval Steps</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" />
          Add Step
        </Button>
      </div>
      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No steps added yet. Click "Add Step" to begin.
        </p>
      )}
      {sorted.map((step, index) => (
        <div
          key={step.id}
          className="flex items-end gap-2 rounded-md border p-3"
        >
          <span className="text-xs font-semibold text-muted-foreground pb-2">
            #{index + 1}
          </span>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Approver Type</Label>
            <Select
              value={step.approverType}
              onValueChange={(v) =>
                handleApproverTypeChange(step, v as ApproverType)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="user">Specific User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Approver</Label>
            <Select
              value={step.approverValue}
              onValueChange={(v) => handleApproverValueChange(step, v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(step.approverType === 'role'
                  ? ROLE_OPTIONS
                  : USER_OPTIONS
                ).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive shrink-0"
            onClick={() => onRemove(step.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

// -- Condition editor inside dialog --

const ConditionEditor: React.FC<{
  conditions: WorkflowCondition[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (
    id: string,
    field: keyof WorkflowCondition,
    value: string,
  ) => void;
}> = ({ conditions, onAdd, onRemove, onChange }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">Conditional Rules</Label>
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-3 w-3 mr-1" />
        Add Condition
      </Button>
    </div>
    {conditions.length === 0 && (
      <p className="text-sm text-muted-foreground">
        No conditions. Workflow will apply to all matching entities.
      </p>
    )}
    {conditions.map((cond) => (
      <div key={cond.id} className="flex items-end gap-2 rounded-md border p-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Field</Label>
          <Select
            value={cond.field}
            onValueChange={(v) => onChange(cond.id, 'field', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="project_type">Project Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Operator</Label>
          <Select
            value={cond.operator}
            onValueChange={(v) => onChange(cond.id, 'operator', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="greater_than">Greater than</SelectItem>
              <SelectItem value="less_than">Less than</SelectItem>
              <SelectItem value="equals">Equals</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Value</Label>
          <Input
            className="h-8 text-xs"
            value={cond.value}
            onChange={(e) => onChange(cond.id, 'value', e.target.value)}
            placeholder={cond.field === 'amount' ? '5000' : 'commercial'}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive shrink-0"
          onClick={() => onRemove(cond.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ))}
  </div>
);

// -- Main component --

export const ApprovalWorkflowBuilder: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>(INITIAL_WORKFLOWS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkflowFormState>(createEmptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setDialogOpen(true);
  };

  const openEdit = (workflow: Workflow) => {
    setEditingId(workflow.id);
    setForm({
      name: workflow.name,
      entityType: workflow.entityType,
      description: workflow.description,
      steps: workflow.steps.map((s) => ({ ...s })),
      conditions: workflow.conditions.map((c) => ({ ...c })),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;

    if (editingId) {
      setWorkflows((prev) =>
        prev.map((wf) =>
          wf.id === editingId
            ? {
                ...wf,
                name: form.name,
                entityType: form.entityType,
                description: form.description,
                steps: form.steps,
                conditions: form.conditions,
              }
            : wf,
        ),
      );
    } else {
      const newWorkflow: Workflow = {
        id: generateId('wf'),
        name: form.name,
        entityType: form.entityType,
        description: form.description,
        isActive: true,
        steps: form.steps,
        conditions: form.conditions,
      };
      setWorkflows((prev) => [...prev, newWorkflow]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
  };

  const handleToggle = (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === id ? { ...wf, isActive: !wf.isActive } : wf,
      ),
    );
  };

  // Form step helpers
  const addStep = () => {
    const nextOrder =
      form.steps.length > 0
        ? Math.max(...form.steps.map((s) => s.order)) + 1
        : 1;
    setForm((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: generateId('step'),
          order: nextOrder,
          approverType: 'role',
          approverValue: '',
          approverLabel: '',
        },
      ],
    }));
  };

  const removeStep = (stepId: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const updateStep = (
    stepId: string,
    field: keyof WorkflowStep,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, [field]: value } : s,
      ),
    }));
  };

  // Form condition helpers
  const addCondition = () => {
    setForm((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: generateId('cond'),
          field: 'amount',
          operator: 'greater_than',
          value: '',
        },
      ],
    }));
  };

  const removeCondition = (condId: string) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== condId),
    }));
  };

  const updateCondition = (
    condId: string,
    field: keyof WorkflowCondition,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === condId ? { ...c, [field]: value } : c,
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Approval Workflows</h2>
          <Badge variant="secondary">{workflows.length}</Badge>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Create Workflow
        </Button>
      </div>

      {/* Workflow list */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{workflow.name}</CardTitle>
                    <Badge
                      variant={workflow.isActive ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {workflow.isActive ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {workflow.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ENTITY_TYPE_LABELS[workflow.entityType]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {workflow.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={() => handleToggle(workflow.id)}
                    aria-label={`Toggle ${workflow.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(workflow)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Conditions */}
              <ConditionBadges conditions={workflow.conditions} />

              {/* Visual diagram */}
              <WorkflowDiagram steps={workflow.steps} />
            </CardContent>
          </Card>
        ))}

        {workflows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <GitBranch className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No approval workflows configured. Create one to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Workflow' : 'Create Workflow'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wf-name">Workflow Name</Label>
                <Input
                  id="wf-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Change Order Approval"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wf-entity">Entity Type</Label>
                <Select
                  value={form.entityType}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      entityType: v as EntityType,
                    }))
                  }
                >
                  <SelectTrigger id="wf-entity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPE_OPTIONS.map((et) => (
                      <SelectItem key={et} value={et}>
                        {ENTITY_TYPE_LABELS[et]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wf-desc">Description</Label>
              <Input
                id="wf-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe when this workflow applies"
              />
            </div>

            {/* Steps */}
            <StepEditor
              steps={form.steps}
              onAdd={addStep}
              onRemove={removeStep}
              onChange={updateStep}
            />

            {/* Conditions */}
            <ConditionEditor
              conditions={form.conditions}
              onAdd={addCondition}
              onRemove={removeCondition}
              onChange={updateCondition}
            />

            {/* Preview */}
            {form.steps.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="rounded-md border p-3 bg-muted/30">
                  <WorkflowDiagram steps={form.steps} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!form.name.trim()}>
                {editingId ? 'Save Changes' : 'Create Workflow'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalWorkflowBuilder;
