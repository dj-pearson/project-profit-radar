import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Plus,
  Download,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectCostCode {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  budgeted: number;
  actual: number;
  committed: number;
}

interface ProjectCostCodesProps {
  projectId: string;
}

interface AddCostCodeFormState {
  code: string;
  name: string;
  description: string;
  category: string;
  budgeted: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyPrecise = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const getPercentUsed = (costCode: ProjectCostCode): number => {
  if (costCode.budgeted <= 0) return 0;
  return ((costCode.actual + costCode.committed) / costCode.budgeted) * 100;
};

const getRemaining = (costCode: ProjectCostCode): number =>
  costCode.budgeted - costCode.actual - costCode.committed;

/**
 * Returns a colour class tuple [progressColor, badgeVariant, textColor]
 * based on percentage of budget consumed.
 */
const getBudgetStatus = (
  percent: number,
): {
  progressColor: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  textColor: string;
  label: string;
} => {
  if (percent > 100) {
    return {
      progressColor: 'bg-red-500',
      badgeVariant: 'destructive',
      textColor: 'text-red-600',
      label: 'Over Budget',
    };
  }
  if (percent >= 80) {
    return {
      progressColor: 'bg-yellow-500',
      badgeVariant: 'outline',
      textColor: 'text-yellow-600',
      label: 'At Risk',
    };
  }
  return {
    progressColor: 'bg-green-500',
    badgeVariant: 'secondary',
    textColor: 'text-green-600',
    label: 'On Track',
  };
};

const EMPTY_FORM: AddCostCodeFormState = {
  code: '',
  name: '',
  description: '',
  category: 'General',
  budgeted: '',
};

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

interface SummaryCardsProps {
  costCodes: ProjectCostCode[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ costCodes }) => {
  const totalBudgeted = costCodes.reduce((sum, cc) => sum + cc.budgeted, 0);
  const totalActual = costCodes.reduce((sum, cc) => sum + cc.actual, 0);
  const totalCommitted = costCodes.reduce((sum, cc) => sum + cc.committed, 0);
  const totalRemaining = totalBudgeted - totalActual - totalCommitted;
  const overBudgetCount = costCodes.filter((cc) => getPercentUsed(cc) > 100).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-500" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Total Budgeted</p>
              <p className="text-xl font-semibold">{formatCurrency(totalBudgeted)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Total Actual</p>
              <p className="text-xl font-semibold">{formatCurrency(totalActual)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Total Committed</p>
              <p className="text-xl font-semibold">{formatCurrency(totalCommitted)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {overBudgetCount > 0 ? (
              <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
            ) : (
              <DollarSign className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p
                className={`text-xl font-semibold ${
                  totalRemaining < 0 ? 'text-red-600' : ''
                }`}
              >
                {formatCurrency(totalRemaining)}
              </p>
              {overBudgetCount > 0 && (
                <p className="text-xs text-red-500">
                  {overBudgetCount} code{overBudgetCount > 1 ? 's' : ''} over budget
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Cost Code Row
// ---------------------------------------------------------------------------

interface CostCodeRowProps {
  costCode: ProjectCostCode;
}

const CostCodeRow: React.FC<CostCodeRowProps> = ({ costCode }) => {
  const percent = getPercentUsed(costCode);
  const remaining = getRemaining(costCode);
  const status = getBudgetStatus(percent);
  const clampedPercent = Math.min(percent, 100);

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-sm font-medium">{costCode.code}</span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm">{costCode.name}</p>
          {costCode.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{costCode.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {formatCurrencyPrecise(costCode.budgeted)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {formatCurrencyPrecise(costCode.actual)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {formatCurrencyPrecise(costCode.committed)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        <span className={remaining < 0 ? 'text-red-600 font-semibold' : ''}>
          {formatCurrencyPrecise(remaining)}
        </span>
      </td>
      <td className="px-4 py-3 min-w-[160px]">
        <div className="flex items-center gap-2">
          <div className="flex-1" role="group" aria-label={`${costCode.code} budget usage`}>
            <div className="relative w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${status.progressColor}`}
                style={{ width: `${clampedPercent}%` }}
                role="progressbar"
                aria-valuenow={Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${Math.round(percent)}% of budget used for ${costCode.code}`}
              />
            </div>
          </div>
          <Badge variant={status.badgeVariant} className="text-xs whitespace-nowrap">
            {Math.round(percent)}%
          </Badge>
        </div>
      </td>
    </tr>
  );
};

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-7 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-40 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-2 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

const EmptyState: React.FC<{ onAdd: () => void; onImport: () => void }> = ({
  onAdd,
  onImport,
}) => (
  <div className="text-center py-12">
    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
    <h3 className="text-lg font-semibold mb-2">No Cost Codes Yet</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
      Add cost codes to track budgets and expenses for this project. You can create them
      individually or import your company default codes.
    </p>
    <div className="flex items-center justify-center gap-3">
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
        Add Cost Code
      </Button>
      <Button variant="outline" onClick={onImport}>
        <Download className="h-4 w-4 mr-2" aria-hidden="true" />
        Import Default Codes
      </Button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const ProjectCostCodes: React.FC<ProjectCostCodesProps> = ({ projectId }) => {
  const { userProfile } = useAuth();
  const [costCodes, setCostCodes] = useState<ProjectCostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [companyCodes, setCompanyCodes] = useState<
    { id: string; code: string; name: string; description: string | null; category: string | null }[]
  >([]);
  const [importLoading, setImportLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AddCostCodeFormState>({ ...EMPTY_FORM });

  // -------------------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------------------

  const loadProjectCostCodes = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_cost_codes')
        .select('*')
        .eq('project_id', projectId)
        .order('code', { ascending: true });

      if (error) throw error;

      const mapped: ProjectCostCode[] = (data || []).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.description || row.code,
        description: row.description || '',
        category: row.category || 'General',
        budgeted: row.budget_amount ?? 0,
        // Actual and committed would come from a transactions table in production.
        // For now we simulate with zero so the UI is ready.
        actual: 0,
        committed: 0,
      }));

      setCostCodes(mapped);
    } catch (error: unknown) {
      console.error('Error loading project cost codes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load cost codes for this project.',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectCostCodes();
  }, [loadProjectCostCodes]);

  // -------------------------------------------------------------------------
  // Add Cost Code
  // -------------------------------------------------------------------------

  const handleFormChange = (field: keyof AddCostCodeFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCostCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Code and name are required.',
      });
      return;
    }

    const budgetAmount = parseFloat(form.budgeted) || 0;
    if (budgetAmount < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Budget amount cannot be negative.',
      });
      return;
    }

    if (!userProfile?.company_id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Company information is not available.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('project_cost_codes').insert({
        project_id: projectId,
        company_id: userProfile.company_id,
        code: form.code.trim(),
        description: form.name.trim(),
        category: form.category.trim() || 'General',
        budget_amount: budgetAmount,
      });

      if (error) throw error;

      toast({
        title: 'Cost Code Added',
        description: `Cost code ${form.code} has been added to the project.`,
      });

      setForm({ ...EMPTY_FORM });
      setAddDialogOpen(false);
      await loadProjectCostCodes();
    } catch (error: unknown) {
      console.error('Error adding cost code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add cost code. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Import Company Default Codes
  // -------------------------------------------------------------------------

  const loadCompanyCodes = useCallback(async () => {
    if (!userProfile?.company_id) return;
    try {
      setImportLoading(true);
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, description, category')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) throw error;
      setCompanyCodes(data || []);
    } catch (error: unknown) {
      console.error('Error loading company cost codes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load company cost codes.',
      });
    } finally {
      setImportLoading(false);
    }
  }, [userProfile?.company_id]);

  const handleOpenImportDialog = () => {
    setImportDialogOpen(true);
    loadCompanyCodes();
  };

  const handleImportCodes = async () => {
    if (!userProfile?.company_id || companyCodes.length === 0) return;

    // Filter out codes that are already in the project
    const existingCodes = new Set(costCodes.map((cc) => cc.code));
    const newCodes = companyCodes.filter((cc) => !existingCodes.has(cc.code));

    if (newCodes.length === 0) {
      toast({
        title: 'No New Codes',
        description: 'All company cost codes are already added to this project.',
      });
      setImportDialogOpen(false);
      return;
    }

    try {
      setSubmitting(true);
      const rows = newCodes.map((cc) => ({
        project_id: projectId,
        company_id: userProfile.company_id!,
        code: cc.code,
        description: cc.name,
        category: cc.category || 'General',
        budget_amount: 0,
      }));

      const { error } = await supabase.from('project_cost_codes').insert(rows);

      if (error) throw error;

      toast({
        title: 'Codes Imported',
        description: `${newCodes.length} cost code${newCodes.length > 1 ? 's' : ''} imported from company defaults.`,
      });

      setImportDialogOpen(false);
      await loadProjectCostCodes();
    } catch (error: unknown) {
      console.error('Error importing cost codes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to import cost codes. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Open add dialog externally (used by EmptyState)
  // -------------------------------------------------------------------------

  const openAddDialog = () => setAddDialogOpen(true);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {costCodes.length > 0 && <SummaryCards costCodes={costCodes} />}

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
            Cost Codes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenImportDialog}>
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Import Default Codes
            </Button>

            {/* Add Cost Code Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Cost Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Cost Code</DialogTitle>
                  <DialogDescription>
                    Create a new cost code with a budget for this project.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddCostCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cc-code">
                      Code <span aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </Label>
                    <Input
                      id="cc-code"
                      placeholder="e.g. 01-100"
                      value={form.code}
                      onChange={(e) => handleFormChange('code', e.target.value)}
                      required
                      aria-required="true"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cc-name">
                      Name <span aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </Label>
                    <Input
                      id="cc-name"
                      placeholder="e.g. General Conditions"
                      value={form.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      required
                      aria-required="true"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cc-description">Description</Label>
                    <Input
                      id="cc-description"
                      placeholder="Optional description"
                      value={form.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cc-category">Category</Label>
                    <Input
                      id="cc-category"
                      placeholder="e.g. Labor, Material, Equipment"
                      value={form.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cc-budget">Budget Amount ($)</Label>
                    <Input
                      id="cc-budget"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.budgeted}
                      onChange={(e) => handleFormChange('budgeted', e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddDialogOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Adding...' : 'Add Cost Code'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {costCodes.length === 0 ? (
            <EmptyState onAdd={openAddDialog} onImport={handleOpenImportDialog} />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full min-w-[800px]" role="table" aria-label="Project cost codes">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Budgeted
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actual
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Committed
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Remaining
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      % Used
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costCodes.map((costCode) => (
                    <CostCodeRow key={costCode.id} costCode={costCode} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      Totals ({costCodes.length} code{costCodes.length !== 1 ? 's' : ''})
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatCurrencyPrecise(costCodes.reduce((s, cc) => s + cc.budgeted, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatCurrencyPrecise(costCodes.reduce((s, cc) => s + cc.actual, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatCurrencyPrecise(costCodes.reduce((s, cc) => s + cc.committed, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {(() => {
                        const remaining = costCodes.reduce((s, cc) => s + getRemaining(cc), 0);
                        return (
                          <span className={remaining < 0 ? 'text-red-600' : ''}>
                            {formatCurrencyPrecise(remaining)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const totalBudgeted = costCodes.reduce((s, cc) => s + cc.budgeted, 0);
                        const totalUsed = costCodes.reduce((s, cc) => s + cc.actual + cc.committed, 0);
                        const totalPercent = totalBudgeted > 0 ? (totalUsed / totalBudgeted) * 100 : 0;
                        const status = getBudgetStatus(totalPercent);
                        return (
                          <Badge variant={status.badgeVariant} className="text-xs">
                            {Math.round(totalPercent)}%
                          </Badge>
                        );
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Company Default Codes</DialogTitle>
            <DialogDescription>
              Import cost codes from your company defaults into this project. Codes already
              present will be skipped.
            </DialogDescription>
          </DialogHeader>
          {importLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : companyCodes.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No company default cost codes found. Create cost codes in your company settings
              first.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="w-full text-sm" role="table" aria-label="Company default cost codes available for import">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Code
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companyCodes.map((cc) => {
                    const alreadyExists = costCodes.some((existing) => existing.code === cc.code);
                    return (
                      <tr
                        key={cc.id}
                        className={`border-b last:border-b-0 ${
                          alreadyExists ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-mono">{cc.code}</td>
                        <td className="px-3 py-2">
                          {cc.name}
                          {alreadyExists && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Already added
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {cc.category || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportCodes}
              disabled={submitting || importLoading || companyCodes.length === 0}
            >
              {submitting ? 'Importing...' : `Import ${companyCodes.filter((cc) => !costCodes.some((e) => e.code === cc.code)).length} Codes`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectCostCodes;
