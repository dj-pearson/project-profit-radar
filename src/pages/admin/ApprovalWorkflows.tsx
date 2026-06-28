import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, GitBranch, X } from 'lucide-react';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkflowDiagram } from '@/components/settings/WorkflowDiagram';
import {
  ENTITY_TYPES,
  OPERATOR_LABELS,
  CONDITION_FIELD_LABELS,
  describeCondition,
  nextStepOrder,
  renumberSteps,
  validateWorkflow,
  type ApprovalWorkflow,
  type ApprovalStep,
  type ApprovalCondition,
  type ApprovalEntityType,
  type ConditionField,
  type ConditionOperator,
} from '@/lib/approval-workflows';

const APPROVER_ROLES: { value: string; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'field_supervisor', label: 'Field Supervisor' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'accounting', label: 'Accounting' },
];

interface CompanyUser {
  id: string;
  name: string;
}

interface DraftState {
  name: string;
  description: string;
  entity_type: ApprovalEntityType | '';
  is_active: boolean;
  steps: ApprovalStep[];
  conditions: ApprovalCondition[];
}

const emptyDraft: DraftState = {
  name: '',
  description: '',
  entity_type: '',
  is_active: true,
  steps: [],
  conditions: [],
};

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tmp-${Date.now()}-${Math.random()}`;

/** Coerce a DB row (JSONB columns typed as Json) into the typed workflow shape. */
function toWorkflow(row: Record<string, unknown>): ApprovalWorkflow {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    entity_type: row.entity_type as ApprovalEntityType,
    steps: Array.isArray(row.steps) ? (row.steps as ApprovalStep[]) : [],
    conditions: Array.isArray(row.conditions) ? (row.conditions as ApprovalCondition[]) : [],
    is_active: Boolean(row.is_active),
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

const ApprovalWorkflows = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalWorkflow | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadWorkflows();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadWorkflows = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWorkflows((data ?? []).map((r) => toWorkflow(r as Record<string, unknown>)));
    } catch (err) {
      console.error('Error loading approval workflows:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load approval workflows.' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('company_id', companyId);
    setUsers(
      (data ?? []).map((u) => ({
        id: u.id,
        name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Unnamed user',
      }))
    );
  };

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };

  const openEdit = (wf: ApprovalWorkflow) => {
    setEditing(wf);
    setDraft({
      name: wf.name,
      description: wf.description ?? '',
      entity_type: wf.entity_type,
      is_active: wf.is_active,
      steps: wf.steps,
      conditions: wf.conditions,
    });
    setDialogOpen(true);
  };

  // ---- Step editing ----
  const addStep = () => {
    setDraft((d) => ({
      ...d,
      steps: [
        ...d.steps,
        { id: newId(), order: nextStepOrder(d.steps), approverType: 'role', approverRole: '', approverUserId: null },
      ],
    }));
  };

  const updateStep = (id: string, patch: Partial<ApprovalStep>) => {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeStep = (id: string) => {
    setDraft((d) => ({ ...d, steps: renumberSteps(d.steps.filter((s) => s.id !== id)) }));
  };

  // ---- Condition editing ----
  const addCondition = () => {
    setDraft((d) => ({
      ...d,
      conditions: [...d.conditions, { id: newId(), field: 'amount', operator: 'gt', value: '' }],
    }));
  };

  const updateCondition = (id: string, patch: Partial<ApprovalCondition>) => {
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeCondition = (id: string) => {
    setDraft((d) => ({ ...d, conditions: d.conditions.filter((c) => c.id !== id) }));
  };

  const setStepApproverLabel = (step: ApprovalStep): ApprovalStep => {
    if (step.approverType === 'role') {
      const label = APPROVER_ROLES.find((r) => r.value === step.approverRole)?.label ?? step.approverRole ?? null;
      return { ...step, approverUserId: null, approverLabel: label };
    }
    const label = users.find((u) => u.id === step.approverUserId)?.name ?? null;
    return { ...step, approverRole: null, approverLabel: label };
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
      return;
    }
    const errors = validateWorkflow(draft);
    if (errors.length) {
      toast({ variant: 'destructive', title: 'Please fix the following', description: errors.join(' ') });
      return;
    }

    const normalizedSteps = renumberSteps(draft.steps).map(setStepApproverLabel);
    const payload = {
      company_id: companyId,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      entity_type: draft.entity_type as ApprovalEntityType,
      is_active: draft.is_active,
      steps: normalizedSteps as unknown as Json,
      conditions: draft.conditions as unknown as Json,
    };

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('approval_workflows')
          .update(payload)
          .eq('id', editing.id)
          .eq('company_id', companyId);
        if (error) throw error;
        toast({ title: 'Saved', description: 'Workflow updated.' });
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('approval_workflows')
          .insert([{ ...payload, created_by: authData.user?.id ?? null }]);
        if (error) throw error;
        toast({ title: 'Created', description: 'Workflow created.' });
      }
      setDialogOpen(false);
      loadWorkflows();
    } catch (err) {
      console.error('Error saving approval workflow:', err);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (wf: ApprovalWorkflow) => {
    if (!companyId) return;
    // Optimistic toggle.
    setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? { ...w, is_active: !w.is_active } : w)));
    const { error } = await supabase
      .from('approval_workflows')
      .update({ is_active: !wf.is_active })
      .eq('id', wf.id)
      .eq('company_id', companyId);
    if (error) {
      setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? { ...w, is_active: wf.is_active } : w)));
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  const handleDelete = async (wf: ApprovalWorkflow) => {
    if (!companyId) return;
    if (!confirm(`Delete workflow "${wf.name}"?`)) return;
    const { error } = await supabase
      .from('approval_workflows')
      .delete()
      .eq('id', wf.id)
      .eq('company_id', companyId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete workflow.' });
      return;
    }
    toast({ title: 'Deleted', description: 'Workflow removed.' });
    setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
  };

  const entityLabel = (value: string) => ENTITY_TYPES.find((e) => e.value === value)?.label ?? value;

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ADMINS}>
      <div className="container mx-auto space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/settings')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <GitBranch className="h-6 w-6" aria-hidden="true" /> Approval Workflows
              </h1>
              <p className="text-sm text-muted-foreground">
                Define approval chains for timesheets, change orders, invoices, and expenses.
              </p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Create Workflow
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No approval workflows configured yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {workflows.map((wf) => (
              <Card key={wf.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {wf.name}
                        <Badge variant="secondary">{entityLabel(wf.entity_type)}</Badge>
                        {!wf.is_active && <Badge variant="outline">Disabled</Badge>}
                      </CardTitle>
                      {wf.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{wf.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={wf.is_active}
                          onCheckedChange={() => toggleActive(wf)}
                          aria-label={`${wf.is_active ? 'Disable' : 'Enable'} ${wf.name}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {wf.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openEdit(wf)}>
                        <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(wf)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {wf.conditions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Applies when:</span>
                      {wf.conditions.map((c) => (
                        <Badge key={c.id} variant="outline">{describeCondition(c)}</Badge>
                      ))}
                    </div>
                  )}
                  <WorkflowDiagram steps={wf.steps} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Workflow' : 'Create Workflow'}</DialogTitle>
              <DialogDescription>
                Configure the entity, approval steps, and conditional rules for this workflow.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="wf-name">Name</Label>
                  <Input
                    id="wf-name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. Large change orders"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wf-entity">Entity type</Label>
                  <Select
                    value={draft.entity_type}
                    onValueChange={(v) => setDraft((d) => ({ ...d, entity_type: v as ApprovalEntityType }))}
                  >
                    <SelectTrigger id="wf-entity">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="wf-desc">Description</Label>
                <Textarea
                  id="wf-desc"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Optional notes about when this workflow is used"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="wf-active"
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
                />
                <Label htmlFor="wf-active">Enabled</Label>
              </div>

              {/* Steps */}
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Approval steps</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add step
                  </Button>
                </div>
                {draft.steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No steps yet. Add at least one approver.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.steps.map((step, i) => (
                      <div key={step.id} className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 p-2">
                        <Badge variant="secondary">Step {i + 1}</Badge>
                        <Select
                          value={step.approverType}
                          onValueChange={(v) =>
                            updateStep(step.id, {
                              approverType: v as ApprovalStep['approverType'],
                              approverRole: v === 'role' ? '' : null,
                              approverUserId: v === 'user' ? '' : null,
                            })
                          }
                        >
                          <SelectTrigger className="w-[8rem]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="role">By role</SelectItem>
                            <SelectItem value="user">Specific user</SelectItem>
                          </SelectContent>
                        </Select>
                        {step.approverType === 'role' ? (
                          <Select
                            value={step.approverRole ?? ''}
                            onValueChange={(v) => updateStep(step.id, { approverRole: v })}
                          >
                            <SelectTrigger className="min-w-[10rem] flex-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              {APPROVER_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={step.approverUserId ?? ''}
                            onValueChange={(v) => updateStep(step.id, { approverUserId: v })}
                          >
                            <SelectTrigger className="min-w-[10rem] flex-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                            <SelectContent>
                              {users.length === 0 ? (
                                <SelectItem value="none" disabled>No users found</SelectItem>
                              ) : (
                                users.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(step.id)}
                          aria-label={`Remove step ${i + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conditions */}
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Conditional rules</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add condition
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  All conditions must match for the workflow to apply. Leave empty to always apply.
                </p>
                {draft.conditions.map((c, i) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 p-2">
                    <Select
                      value={c.field}
                      onValueChange={(v) =>
                        updateCondition(c.id, {
                          field: v as ConditionField,
                          operator: v === 'project_type' ? 'eq' : c.operator,
                          value: '',
                        })
                      }
                    >
                      <SelectTrigger className="w-[9rem]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CONDITION_FIELD_LABELS) as ConditionField[]).map((f) => (
                          <SelectItem key={f} value={f}>{CONDITION_FIELD_LABELS[f]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={c.operator}
                      onValueChange={(v) => updateCondition(c.id, { operator: v as ConditionOperator })}
                      disabled={c.field === 'project_type'}
                    >
                      <SelectTrigger className="w-[5rem]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(OPERATOR_LABELS) as ConditionOperator[]).map((op) => (
                          <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="min-w-[8rem] flex-1"
                      type={c.field === 'amount' ? 'number' : 'text'}
                      value={String(c.value)}
                      onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                      placeholder={c.field === 'amount' ? '5000' : 'Commercial'}
                      aria-label={`Condition ${i + 1} value`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(c.id)}
                      aria-label={`Remove condition ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Live diagram preview */}
              <div className="space-y-2 rounded-md border p-3">
                <h3 className="text-sm font-semibold">Preview</h3>
                <WorkflowDiagram steps={draft.steps} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create workflow'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
};

export default ApprovalWorkflows;
