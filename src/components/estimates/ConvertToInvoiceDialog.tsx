import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';
import {
  buildInvoiceLineItems, conversionSubtotal, summarizeBilled, lineBaseTotal,
  type EstimateLineItemInput,
} from '@/lib/estimates/estimateToInvoice';

interface ConvertToInvoiceDialogProps {
  estimateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EstimateRow {
  id: string;
  estimate_number: string;
  client_name: string | null;
  client_email: string | null;
  project_id: string | null;
  total_amount: number;
}

interface LinkedInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
}

export const ConvertToInvoiceDialog: React.FC<ConvertToInvoiceDialogProps> = ({
  estimateId, isOpen, onClose, onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [estimate, setEstimate] = useState<EstimateRow | null>(null);
  const [lineItems, setLineItems] = useState<EstimateLineItemInput[]>([]);
  const [linkedInvoices, setLinkedInvoices] = useState<LinkedInvoice[]>([]);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [percentage, setPercentage] = useState(100);

  useEffect(() => {
    if (!isOpen || !estimateId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setOverrides({});
        setPercentage(100);
        const [{ data: est, error: estErr }, { data: items, error: itemsErr }, { data: invs }] = await Promise.all([
          supabase.from('estimates').select('id, estimate_number, client_name, client_email, project_id, total_amount').eq('id', estimateId).single(),
          supabase.from('estimate_line_items').select('id, item_name, description, quantity, unit_cost, total_cost, cost_code_id').eq('estimate_id', estimateId).order('sort_order', { ascending: true }),
          supabase.from('invoices').select('id, invoice_number, total_amount').eq('estimate_id', estimateId),
        ]);
        if (estErr) throw estErr;
        if (itemsErr) throw itemsErr;
        if (!active) return;
        setEstimate(est as EstimateRow);
        const li = (items ?? []) as EstimateLineItemInput[];
        setLineItems(li);
        setIncluded(Object.fromEntries(li.map((l) => [l.id, true])));
        setLinkedInvoices((invs ?? []) as LinkedInvoice[]);
      } catch (error) {
        logger.error('Error loading estimate for conversion', error instanceof Error ? error : undefined);
        toast({ title: 'Error', description: 'Failed to load estimate.', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isOpen, estimateId, toast]);

  const selectedIds = useMemo(
    () => lineItems.filter((l) => included[l.id]).map((l) => l.id),
    [lineItems, included]
  );

  const drafts = useMemo(
    () => buildInvoiceLineItems(lineItems, { selectedIds, percentage, amountOverrides: overrides }),
    [lineItems, selectedIds, percentage, overrides]
  );

  const subtotal = useMemo(() => conversionSubtotal(drafts), [drafts]);

  const billed = useMemo(
    () => summarizeBilled(estimate?.total_amount ?? 0, linkedInvoices.map((i) => i.total_amount)),
    [estimate, linkedInvoices]
  );

  const handleCreate = async () => {
    if (!estimate) return;
    if (drafts.length === 0) {
      toast({ title: 'Nothing to bill', description: 'Select at least one line item.', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          client_name: estimate.client_name,
          client_email: estimate.client_email,
          project_id: estimate.project_id,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tax_rate: 0,
          discount_amount: 0,
          notes: `Converted from estimate ${estimate.estimate_number}${percentage !== 100 ? ` (${percentage}% progress billing)` : ''}`,
          terms: 'Payment is due within 30 days of invoice date.',
          line_items: drafts.map((d) => ({ description: d.description, quantity: d.quantity, unit_price: d.unit_price })),
        },
      });
      if (error) throw error;
      if (!data?.success || !data.invoice?.id) {
        throw new Error(data?.error || 'Invoice creation did not return an invoice.');
      }
      // Link the new invoice back to its source estimate (US-101).
      const { error: linkErr } = await supabase
        .from('invoices')
        .update({ estimate_id: estimate.id, reference_number: estimate.estimate_number })
        .eq('id', data.invoice.id);
      if (linkErr) logger.error('Failed to link invoice to estimate', linkErr instanceof Error ? linkErr : undefined);

      toast({ title: 'Invoice created', description: `Invoice ${data.invoice.invoice_number} created from ${estimate.estimate_number}.` });
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Estimate-to-invoice conversion failed', error instanceof Error ? error : undefined);
      toast({ title: 'Conversion failed', description: error instanceof Error ? error.message : 'Failed to create invoice.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-construction-orange" aria-hidden="true" />
            Convert Estimate to Invoice
          </DialogTitle>
          <DialogDescription>
            {estimate ? `${estimate.estimate_number} — ${estimate.client_name ?? 'No client'}` : 'Select line items and progress-billing amount.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            {linkedInvoices.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Already billed: {formatCurrency(billed.alreadyBilled)} of {formatCurrency(billed.estimateTotal)} ({billed.percentBilled}%)
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {linkedInvoices.map((inv) => (
                    <li key={inv.id} className="flex justify-between">
                      <span>{inv.invoice_number}</span>
                      <span>{formatCurrency(inv.total_amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Label htmlFor="convert-pct" className="whitespace-nowrap">Progress billing %</Label>
              <Input
                id="convert-pct"
                type="number"
                min={1}
                max={100}
                value={percentage}
                onChange={(e) => { setPercentage(Math.min(Math.max(Number(e.target.value) || 0, 0), 100)); setOverrides({}); }}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">Applies to included line totals; edit amounts below to fine-tune.</span>
            </div>

            <div className="border rounded-md divide-y">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span></span><span>Line item</span><span className="text-right">Estimate</span><span className="text-right">Bill amount</span>
              </div>
              {lineItems.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">This estimate has no line items.</div>
              )}
              {lineItems.map((li) => {
                const draft = drafts.find((d) => d.estimate_line_item_id === li.id);
                const defaultBill = Math.round(lineBaseTotal(li) * (percentage / 100) * 100) / 100;
                return (
                  <div key={li.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3 py-2 items-center text-sm">
                    <Checkbox
                      checked={!!included[li.id]}
                      onCheckedChange={(c) => setIncluded((prev) => ({ ...prev, [li.id]: !!c }))}
                      aria-label={`Include ${li.item_name ?? 'line item'}`}
                    />
                    <span className={!included[li.id] ? 'text-muted-foreground line-through' : ''}>
                      {li.item_name || li.description || 'Line item'}
                    </span>
                    <span className="text-right text-muted-foreground">{formatCurrency(lineBaseTotal(li))}</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={!included[li.id]}
                      value={li.id in overrides ? overrides[li.id] : (draft?.line_total ?? defaultBill)}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [li.id]: Number(e.target.value) || 0 }))}
                      className="w-28 text-right"
                      aria-label={`Bill amount for ${li.item_name ?? 'line item'}`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-base font-semibold">
              <span>Invoice subtotal</span>
              <Badge variant="secondary" className="text-base">{formatCurrency(subtotal)}</Badge>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || loading || drafts.length === 0}>
            {creating ? 'Creating…' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertToInvoiceDialog;
