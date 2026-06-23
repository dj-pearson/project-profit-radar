import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Package, RefreshCw, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';
import {
  summarizeMaterialCosts, type PoLineItemInput, type BudgetMeta, type CostCodeMeta,
} from '@/lib/projects/materialCostSummary';

interface ProjectProcurementProps {
  projectId: string;
  onNavigate?: (path: string) => void;
}

interface PoRow {
  id: string;
  po_number: string;
  vendor_id: string | null;
  status: string;
  total_amount: number;
  po_date: string | null;
}

const PO_STATUS_VARIANT: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-amber-100 text-amber-800',
  ordered: 'bg-indigo-100 text-indigo-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

type SortKey = 'po_date' | 'total_amount' | 'status';

export const ProjectProcurement: React.FC<ProjectProcurementProps> = ({ projectId, onNavigate }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<PoRow[]>([]);
  const [lineItems, setLineItems] = useState<PoLineItemInput[]>([]);
  const [budgets, setBudgets] = useState<BudgetMeta[]>([]);
  const [costCodes, setCostCodes] = useState<CostCodeMeta[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('po_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);
      const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .select('id, po_number, vendor_id, status, total_amount, po_date')
        .eq('project_id', projectId);
      if (poErr) throw poErr;
      const poRows = (poData ?? []) as PoRow[];
      setPos(poRows);

      const poIds = poRows.map((p) => p.id);
      const statusById = new Map(poRows.map((p) => [p.id, p.status]));

      const [{ data: liData }, { data: budgetData }, { data: ccData }, { data: vendorData }] = await Promise.all([
        poIds.length
          ? supabase.from('purchase_order_line_items').select('purchase_order_id, cost_code_id, total_price').in('purchase_order_id', poIds)
          : Promise.resolve({ data: [] as Array<{ purchase_order_id: string; cost_code_id: string | null; total_price: number | null }> }),
        supabase.from('project_budgets').select('cost_code_id, material_budget, budgeted_amount').eq('project_id', projectId),
        supabase.from('cost_codes').select('id, code, name').eq('company_id', userProfile.company_id),
        supabase.from('vendors').select('id, name').eq('company_id', userProfile.company_id),
      ]);

      setLineItems(
        (liData ?? []).map((li) => ({
          cost_code_id: li.cost_code_id,
          amount: li.total_price ?? 0,
          status: statusById.get(li.purchase_order_id) ?? null,
        }))
      );
      setBudgets((budgetData ?? []) as BudgetMeta[]);
      setCostCodes((ccData ?? []) as CostCodeMeta[]);
      setVendorNames(Object.fromEntries((vendorData ?? []).map((v: { id: string; name: string }) => [v.id, v.name])));
    } catch (error) {
      logger.error('Error loading procurement', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to load procurement data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.company_id, projectId]);

  const summary = useMemo(() => summarizeMaterialCosts({ lineItems, budgets, costCodes }), [lineItems, budgets, costCodes]);

  const vendorOptions = useMemo(
    () => Array.from(new Set(pos.map((p) => p.vendor_id).filter(Boolean))) as string[],
    [pos]
  );

  const visiblePos = useMemo(() => {
    let rows = pos.slice();
    if (statusFilter !== 'all') rows = rows.filter((p) => p.status === statusFilter);
    if (vendorFilter !== 'all') rows = rows.filter((p) => p.vendor_id === vendorFilter);
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'total_amount') cmp = (a.total_amount ?? 0) - (b.total_amount ?? 0);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else cmp = (a.po_date ?? '').localeCompare(b.po_date ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [pos, statusFilter, vendorFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const go = (path: string) => (onNavigate ? onNavigate(path) : navigate(path));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-construction-orange" aria-hidden="true" />
            Materials &amp; Procurement
          </h2>
          <p className="text-sm text-muted-foreground">Purchase orders and material costs vs budget</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" className="bg-construction-orange hover:bg-construction-orange/90" onClick={() => go(`/purchase-orders/new?project=${projectId}`)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* Committed vs spent summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <SummaryCard label="Material Budget" value={summary.totals.budgeted} />
            <SummaryCard label="Committed (approved POs)" value={summary.totals.committed} tone="text-amber-600" />
            <SummaryCard label="Spent (received POs)" value={summary.totals.spent} tone="text-green-600" />
            <SummaryCard label="Remaining" value={summary.totals.variance} tone={summary.totals.variance < 0 ? 'text-destructive' : ''} />
          </>
        )}
      </div>

      {/* Material cost by cost code */}
      <Card>
        <CardHeader><CardTitle className="text-base">Material Cost by Cost Code</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : summary.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No budgets or purchase orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost Code</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.rows.map((r) => (
                  <TableRow key={r.costCodeId ?? 'uncoded'}>
                    <TableCell>
                      <span className="font-medium">{r.code}</span> <span className="text-muted-foreground">{r.name}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.budgeted)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatCurrency(r.committed)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(r.spent)}</TableCell>
                    <TableCell className={`text-right ${r.variance < 0 ? 'text-destructive font-semibold' : ''}`}>{formatCurrency(r.variance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Purchase orders list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Purchase Orders ({visiblePos.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {vendorOptions.length > 0 && (
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-40 h-8" aria-label="Filter by vendor"><SelectValue placeholder="Vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  {vendorOptions.map((vid) => (
                    <SelectItem key={vid} value={vid}>{vendorNames[vid] ?? 'Unknown'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : visiblePos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Package className="h-10 w-10 mb-3 opacity-50" aria-hidden="true" />
              <p className="font-medium">No purchase orders</p>
              <Button className="mt-3" size="sm" onClick={() => go(`/purchase-orders/new?project=${projectId}`)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create Purchase Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('po_date')}>Date</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>Status</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('total_amount')}>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePos.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer" onClick={() => go(`/purchase-orders/${po.id}/edit`)}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.vendor_id ? (vendorNames[po.vendor_id] ?? '—') : '—'}</TableCell>
                    <TableCell>{po.po_date ? new Date(po.po_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Badge className={PO_STATUS_VARIANT[po.status] ?? 'bg-slate-100 text-slate-700'}>{po.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(po.total_amount ?? 0)}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone }) => (
  <div className="rounded-md border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-lg font-bold ${tone ?? ''}`}>{formatCurrency(value)}</div>
  </div>
);

export default ProjectProcurement;
