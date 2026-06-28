import { useCallback, useEffect, useState } from 'react';
import { Check, ListChecks } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  fetchSelectionBoard,
  chooseOption,
} from '@/services/clientSelectionsService';
import {
  computeOverAllowanceDelta,
  isOverAllowance,
  SELECTION_STATUS_LABELS,
  summarizeSelections,
  type SelectionBoardRow,
  type SelectionOption,
  type SelectionCategory,
} from '@/lib/client-selections';

interface ClientPortalSelectionsProps {
  projectId: string;
  companyId: string;
  userId?: string;
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
};

/**
 * US-226: client-facing selections flow. Clients pick one option per category;
 * over-allowance choices show the extra cost. Picks are saved as "pending" for
 * the builder to approve (which generates a change order + budget update).
 */
export function ClientPortalSelections({ projectId, companyId, userId }: ClientPortalSelectionsProps) {
  const [rows, setRows] = useState<SelectionBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRows(await fetchSelectionBoard(projectId, companyId));
    } catch (err) {
      logger.error('Failed to load client selections', err as Error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePick = async (category: SelectionCategory, option: SelectionOption) => {
    setSaving(category.id);
    try {
      await chooseOption({ companyId, projectId, category, option, userId });
      const delta = computeOverAllowanceDelta(category.allowance, option.price);
      toast({
        title: 'Selection saved',
        description:
          delta > 0
            ? `${option.name} is ${currency(delta)} over the allowance — your builder will review it.`
            : `${option.name} selected.`,
      });
      await load();
    } catch (err) {
      logger.error('Failed to save selection', err as Error);
      toast({ title: 'Could not save selection', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Couldn't load selections. Please refresh and try again.
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <ListChecks className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
          No selections have been set up for this project yet.
        </CardContent>
      </Card>
    );
  }

  const summary = summarizeSelections(rows);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" aria-hidden="true" /> Your Selections
          </CardTitle>
          <CardDescription>
            Choose your finishes and fixtures. Picks above the allowance add to your contract once approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            <span className="text-muted-foreground">Total allowances: </span>
            <span className="font-semibold">{currency(summary.totalAllowance)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Selected: </span>
            <span className="font-semibold">
              {summary.selected}/{summary.categories}
            </span>
          </span>
          {summary.totalOverage > 0 && (
            <span>
              <span className="text-muted-foreground">Over allowance: </span>
              <span className="font-semibold text-amber-600">{currency(summary.totalOverage)}</span>
            </span>
          )}
        </CardContent>
      </Card>

      {rows.map(({ category, options, selection }) => {
        const locked = selection?.status === 'approved';
        return (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Allowance {currency(category.allowance)}</Badge>
                  {selection && (
                    <Badge variant={STATUS_VARIANT[selection.status] ?? 'secondary'}>
                      {SELECTION_STATUS_LABELS[selection.status]}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">No options available yet.</p>
              ) : (
                <RadioGroup
                  value={selection?.option_id ?? ''}
                  onValueChange={(optionId) => {
                    if (locked || saving) return;
                    const option = options.find((o) => o.id === optionId);
                    if (option) handlePick(category, option);
                  }}
                  className="space-y-2"
                  aria-label={`${category.name} options`}
                >
                  {options.map((option) => {
                    const delta = computeOverAllowanceDelta(category.allowance, option.price);
                    const over = isOverAllowance(category.allowance, option.price);
                    const checked = selection?.option_id === option.id;
                    return (
                      <Label
                        key={option.id}
                        htmlFor={`opt-${option.id}`}
                        className={`flex cursor-pointer items-center justify-between rounded-md border p-3 ${
                          checked ? 'border-primary bg-primary/5' : ''
                        } ${locked ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem id={`opt-${option.id}`} value={option.id} disabled={locked || saving === category.id} />
                          <div>
                            <span className="font-medium">{option.name}</span>
                            {option.supplier && (
                              <span className="ml-2 text-xs text-muted-foreground">{option.supplier}</span>
                            )}
                            {option.description && (
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{currency(option.price)}</div>
                          {over ? (
                            <div className="text-xs text-amber-600">+{currency(delta)} over</div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 text-xs text-green-600">
                              <Check className="h-3 w-3" aria-hidden="true" /> within allowance
                            </div>
                          )}
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              )}
              {locked && (
                <p className="mt-2 text-xs text-muted-foreground">
                  This selection has been approved and can no longer be changed.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default ClientPortalSelections;
