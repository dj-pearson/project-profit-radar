/**
 * Work-in-Progress / Earned-Value / Cost-to-Complete report (US-224).
 *
 * Company-wide WIP schedule plus per-project cost-to-complete forecasting and
 * earned-value (CPI/SPI) metrics, exportable to Excel/PDF. All data is
 * company_id-scoped (RLS) and computed from the same job_costs / project_budgets
 * / invoices / change_orders sources as budget-vs-actual so figures reconcile.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  FileSpreadsheet, FileText, TrendingUp, TrendingDown, DollarSign, BarChart3, AlertTriangle,
} from 'lucide-react';
import {
  buildWipSchedule,
  netApprovedChangeOrders,
  summarizeCostToComplete,
  type WipProjectInput,
  type WipProjectRow,
  type CostCodeForecastInput,
} from '@/lib/projects/wipReport';

const fmt = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const pct = (n: number) => `${Math.round(n * 100)}%`;
const idx = (n: number | null) => (n == null ? 'n/a' : n.toFixed(2));

interface WipReportProps {
  /** When provided, restrict the report to a single project. */
  projectId?: string;
}

interface ProjectRow {
  id: string;
  name: string;
  budget: number | null;
  total_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number | null;
}
interface JobCostRow {
  project_id: string;
  cost_code_id: string | null;
  total_cost: number | null;
}
interface BudgetRow {
  project_id: string;
  cost_code_id: string;
  budgeted_amount: number | null;
}
interface InvoiceRow {
  project_id: string | null;
  total_amount: number | null;
}
interface ChangeOrderRow {
  project_id: string;
  amount: number | null;
  status: string | null;
  client_approved: boolean | null;
}
interface CostCodeRow {
  id: string;
  code: string;
  name: string;
}

interface WipDataset {
  schedule: ReturnType<typeof buildWipSchedule>;
  costCodesByProject: Map<string, CostCodeForecastInput[]>;
  contractByProject: Map<string, number>;
  projectNames: Map<string, string>;
}

export function WipReport({ projectId }: WipReportProps) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const { data, isLoading, error } = useQuery<WipDataset>({
    queryKey: ['wip-report', companyId, projectId ?? 'company'],
    enabled: !!companyId,
    queryFn: async () => {
      let projectsQuery = supabase
        .from('projects')
        .select('id, name, budget, total_budget, start_date, end_date, completion_percentage')
        .eq('company_id', companyId);
      if (projectId) projectsQuery = projectsQuery.eq('id', projectId);

      const [projectsRes, jobCostsRes, budgetsRes, invoicesRes, changeOrdersRes, costCodesRes] =
        await Promise.all([
          projectsQuery,
          supabase
            .from('job_costs')
            .select('project_id, cost_code_id, total_cost')
            .eq('company_id', companyId),
          supabase
            .from('project_budgets')
            .select('project_id, cost_code_id, budgeted_amount'),
          supabase
            .from('invoices')
            .select('project_id, total_amount')
            .eq('company_id', companyId),
          supabase
            .from('change_orders')
            .select('project_id, amount, status, client_approved')
            .eq('company_id', companyId),
          supabase
            .from('cost_codes')
            .select('id, code, name')
            .eq('company_id', companyId),
        ]);

      if (projectsRes.error) throw projectsRes.error;

      const projects = (projectsRes.data ?? []) as ProjectRow[];
      const projectIds = new Set(projects.map((p) => p.id));
      const jobCosts = ((jobCostsRes.data ?? []) as JobCostRow[]).filter((j) => projectIds.has(j.project_id));
      const budgets = ((budgetsRes.data ?? []) as BudgetRow[]).filter((b) => projectIds.has(b.project_id));
      const invoices = ((invoicesRes.data ?? []) as InvoiceRow[]).filter(
        (i) => i.project_id != null && projectIds.has(i.project_id)
      );
      const changeOrders = ((changeOrdersRes.data ?? []) as ChangeOrderRow[]).filter((c) =>
        projectIds.has(c.project_id)
      );
      const costCodeMeta = new Map(
        ((costCodesRes.data ?? []) as CostCodeRow[]).map((c) => [c.id, c])
      );

      // Aggregate per project.
      const actualByProject = new Map<string, number>();
      const costByProjectCode = new Map<string, Map<string, number>>(); // project -> cost_code -> actual
      for (const j of jobCosts) {
        const amt = Number(j.total_cost) || 0;
        actualByProject.set(j.project_id, (actualByProject.get(j.project_id) ?? 0) + amt);
        const codeKey = j.cost_code_id ?? '__uncoded__';
        const inner = costByProjectCode.get(j.project_id) ?? new Map<string, number>();
        inner.set(codeKey, (inner.get(codeKey) ?? 0) + amt);
        costByProjectCode.set(j.project_id, inner);
      }

      const estCostByProject = new Map<string, number>();
      const budgetByProjectCode = new Map<string, Map<string, number>>();
      for (const b of budgets) {
        const amt = Number(b.budgeted_amount) || 0;
        estCostByProject.set(b.project_id, (estCostByProject.get(b.project_id) ?? 0) + amt);
        const inner = budgetByProjectCode.get(b.project_id) ?? new Map<string, number>();
        inner.set(b.cost_code_id, (inner.get(b.cost_code_id) ?? 0) + amt);
        budgetByProjectCode.set(b.project_id, inner);
      }

      const billedByProject = new Map<string, number>();
      for (const i of invoices) {
        billedByProject.set(
          i.project_id,
          (billedByProject.get(i.project_id) ?? 0) + (Number(i.total_amount) || 0)
        );
      }

      const coByProject = new Map<string, ChangeOrderRow[]>();
      for (const c of changeOrders) {
        const arr = coByProject.get(c.project_id) ?? [];
        arr.push(c);
        coByProject.set(c.project_id, arr);
      }

      const inputs: WipProjectInput[] = projects.map((p) => {
        const baseContract = Number(p.budget) || 0;
        const estCost = estCostByProject.get(p.id) ?? (Number(p.total_budget) || 0);
        return {
          projectId: p.id,
          name: p.name,
          contractAmount: baseContract,
          approvedChangeOrders: netApprovedChangeOrders(coByProject.get(p.id) ?? []),
          estimatedTotalCost: estCost,
          actualCostToDate: actualByProject.get(p.id) ?? 0,
          billedToDate: billedByProject.get(p.id) ?? 0,
          startDate: p.start_date,
          endDate: p.end_date,
          manualPercentComplete:
            estCost > 0 ? null : (p.completion_percentage ?? null),
        };
      });

      const schedule = buildWipSchedule(inputs);

      // Per-project cost-code forecast inputs.
      const costCodesByProject = new Map<string, CostCodeForecastInput[]>();
      const contractByProject = new Map<string, number>();
      const projectNames = new Map<string, string>();
      for (const row of schedule.rows) {
        contractByProject.set(row.projectId, row.contractAmount);
        projectNames.set(row.projectId, row.name);
      }
      for (const p of projects) {
        const budgetCodes = budgetByProjectCode.get(p.id) ?? new Map();
        const actualCodes = costByProjectCode.get(p.id) ?? new Map();
        const allCodeKeys = new Set<string>([...budgetCodes.keys(), ...actualCodes.keys()]);
        const rows: CostCodeForecastInput[] = Array.from(allCodeKeys).map((key) => {
          const meta = key === '__uncoded__' ? null : costCodeMeta.get(key);
          return {
            costCodeId: key === '__uncoded__' ? null : key,
            code: meta?.code ?? '—',
            name: meta?.name ?? (key === '__uncoded__' ? 'Uncoded' : 'Unknown cost code'),
            budgetedCost: budgetCodes.get(key) ?? 0,
            actualCost: actualCodes.get(key) ?? 0,
          };
        });
        costCodesByProject.set(p.id, rows);
      }

      return { schedule, costCodesByProject, contractByProject, projectNames };
    },
  });

  const costCodeForecast = useMemo(() => {
    if (!data) return null;
    if (selectedProject === 'all') {
      // Merge all projects' cost-code rows by code.
      const merged = new Map<string, CostCodeForecastInput>();
      let totalContract = 0;
      for (const [pid, rows] of data.costCodesByProject) {
        totalContract += data.contractByProject.get(pid) ?? 0;
        for (const r of rows) {
          const key = r.code + '|' + r.name;
          const cur = merged.get(key);
          if (cur) {
            cur.budgetedCost += r.budgetedCost;
            cur.actualCost += r.actualCost;
          } else {
            merged.set(key, { ...r });
          }
        }
      }
      return summarizeCostToComplete(Array.from(merged.values()), totalContract);
    }
    const rows = data.costCodesByProject.get(selectedProject) ?? [];
    return summarizeCostToComplete(rows, data.contractByProject.get(selectedProject) ?? 0);
  }, [data, selectedProject]);

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const wipRows = data.schedule.rows.map((r) => ({
      Project: r.name,
      Contract: r.contractAmount,
      'Est. Cost': r.estimatedTotalCost,
      'Cost to Date': r.actualCostToDate,
      '% Complete': Math.round(r.percentComplete * 100),
      'Earned Revenue': r.earnedRevenue,
      'Billed to Date': r.billedToDate,
      Overbilling: r.overbilling,
      Underbilling: r.underbilling,
      'Cost to Complete': r.costToComplete,
      'Est. Final Cost': r.estimatedFinalCost,
      'Est. Profit': r.estimatedProfit,
      'Margin %': r.marginPercent,
      CPI: r.cpi,
      SPI: r.spi,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wipRows), 'WIP Schedule');
    if (costCodeForecast) {
      const ccRows = costCodeForecast.rows.map((r) => ({
        Code: r.code,
        Name: r.name,
        Budget: r.budgetedCost,
        Actual: r.actualCost,
        '% Complete': Math.round(r.percentComplete * 100),
        'Projected Final': r.projectedFinalCost,
        'Cost to Complete': r.costToComplete,
        Variance: r.variance,
        'Proj. Margin': r.projectedMargin,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ccRows), 'Cost to Complete');
    }
    XLSX.writeFile(wb, `wip-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: 'Exported', description: 'WIP report downloaded as Excel.' });
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Work-in-Progress Schedule', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [[
        'Project', 'Contract', 'Est. Cost', 'Cost to Date', '% Comp', 'Earned',
        'Billed', 'Over', 'Under', 'CTC', 'EAC', 'Profit', 'CPI', 'SPI',
      ]],
      body: data.schedule.rows.map((r) => [
        r.name, fmt(r.contractAmount), fmt(r.estimatedTotalCost), fmt(r.actualCostToDate),
        pct(r.percentComplete), fmt(r.earnedRevenue), fmt(r.billedToDate), fmt(r.overbilling),
        fmt(r.underbilling), fmt(r.costToComplete), fmt(r.estimatedFinalCost),
        fmt(r.estimatedProfit), idx(r.cpi), idx(r.spi),
      ]),
      foot: [[
        'TOTAL', fmt(data.schedule.totals.contractAmount), fmt(data.schedule.totals.estimatedTotalCost),
        fmt(data.schedule.totals.actualCostToDate), '', fmt(data.schedule.totals.earnedRevenue),
        fmt(data.schedule.totals.billedToDate), fmt(data.schedule.totals.overbilling),
        fmt(data.schedule.totals.underbilling), fmt(data.schedule.totals.costToComplete),
        fmt(data.schedule.totals.estimatedFinalCost), fmt(data.schedule.totals.estimatedProfit), '', '',
      ]],
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`wip-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: 'Exported', description: 'WIP report downloaded as PDF.' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the WIP report"
        description="There was a problem loading financial data. Please try again."
      />
    );
  }

  if (!data || data.schedule.rows.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No projects to report on yet"
        description="Add projects with budgets and job costs to generate a Work-in-Progress schedule."
      />
    );
  }

  const t = data.schedule.totals;
  const chartData = data.schedule.rows.slice(0, 12).map((r) => ({
    name: r.name.length > 14 ? r.name.slice(0, 13) + '…' : r.name,
    Earned: r.earnedRevenue,
    Billed: r.billedToDate,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Work-in-Progress &amp; Earned Value</h2>
          <p className="text-sm text-muted-foreground">
            Earned revenue, over/under billing, and cost-to-complete forecasting.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Contract Value" value={fmt(t.contractAmount)} icon={DollarSign} />
        <SummaryCard label="Earned Revenue" value={fmt(t.earnedRevenue)} icon={TrendingUp} />
        <SummaryCard label="Billed to Date" value={fmt(t.billedToDate)} icon={DollarSign} />
        <SummaryCard label="Overbilled" value={fmt(t.overbilling)} icon={TrendingUp} tone="warn" />
        <SummaryCard label="Underbilled" value={fmt(t.underbilling)} icon={TrendingDown} tone="warn" />
        <SummaryCard
          label="Est. Profit"
          value={fmt(t.estimatedProfit)}
          icon={t.estimatedProfit >= 0 ? TrendingUp : TrendingDown}
          tone={t.estimatedProfit >= 0 ? 'good' : 'bad'}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earned Revenue vs Billed</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="Earned" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Billed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* WIP schedule table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WIP Schedule</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Project</th>
                <th className="py-2 px-3 font-medium text-right">Contract</th>
                <th className="py-2 px-3 font-medium text-right">Est. Cost</th>
                <th className="py-2 px-3 font-medium text-right">Cost to Date</th>
                <th className="py-2 px-3 font-medium text-right">% Comp</th>
                <th className="py-2 px-3 font-medium text-right">Earned</th>
                <th className="py-2 px-3 font-medium text-right">Billed</th>
                <th className="py-2 px-3 font-medium text-right">Over/Under</th>
                <th className="py-2 px-3 font-medium text-right">CTC</th>
                <th className="py-2 px-3 font-medium text-right">EAC</th>
                <th className="py-2 px-3 font-medium text-right">CPI</th>
                <th className="py-2 px-3 font-medium text-right">SPI</th>
              </tr>
            </thead>
            <tbody>
              {data.schedule.rows.map((r) => (
                <WipRow key={r.projectId} r={r} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 px-3 text-right">{fmt(t.contractAmount)}</td>
                <td className="py-2 px-3 text-right">{fmt(t.estimatedTotalCost)}</td>
                <td className="py-2 px-3 text-right">{fmt(t.actualCostToDate)}</td>
                <td className="py-2 px-3 text-right">—</td>
                <td className="py-2 px-3 text-right">{fmt(t.earnedRevenue)}</td>
                <td className="py-2 px-3 text-right">{fmt(t.billedToDate)}</td>
                <td className="py-2 px-3 text-right">
                  {t.overbilling >= t.underbilling
                    ? `${fmt(t.overbilling)} over`
                    : `${fmt(t.underbilling)} under`}
                </td>
                <td className="py-2 px-3 text-right">{fmt(t.costToComplete)}</td>
                <td className="py-2 px-3 text-right">{fmt(t.estimatedFinalCost)}</td>
                <td className="py-2 px-3 text-right">—</td>
                <td className="py-2 px-3 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Cost-to-complete by cost code */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Cost to Complete by Cost Code</CardTitle>
          {!projectId && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {data.schedule.rows.map((r) => (
                  <SelectItem key={r.projectId} value={r.projectId}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {costCodeForecast && costCodeForecast.rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium text-right">Budget</th>
                  <th className="py-2 px-3 font-medium text-right">Actual</th>
                  <th className="py-2 px-3 font-medium text-right">% Comp</th>
                  <th className="py-2 px-3 font-medium text-right">Proj. Final</th>
                  <th className="py-2 px-3 font-medium text-right">To Complete</th>
                  <th className="py-2 px-3 font-medium text-right">Variance</th>
                  <th className="py-2 px-3 font-medium text-right">Proj. Margin</th>
                </tr>
              </thead>
              <tbody>
                {costCodeForecast.rows.map((r) => (
                  <tr key={(r.costCodeId ?? 'uncoded') + r.code} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{r.code}</td>
                    <td className="py-2 px-3">{r.name}</td>
                    <td className="py-2 px-3 text-right">{fmt(r.budgetedCost)}</td>
                    <td className="py-2 px-3 text-right">{fmt(r.actualCost)}</td>
                    <td className="py-2 px-3 text-right">{pct(r.percentComplete)}</td>
                    <td className="py-2 px-3 text-right">{fmt(r.projectedFinalCost)}</td>
                    <td className="py-2 px-3 text-right">{fmt(r.costToComplete)}</td>
                    <td className={`py-2 px-3 text-right ${r.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(r.variance)}
                    </td>
                    <td className={`py-2 px-3 text-right ${r.projectedMargin < 0 ? 'text-red-600' : ''}`}>
                      {fmt(r.projectedMargin)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-3" colSpan={2}>Total</td>
                  <td className="py-2 px-3 text-right">{fmt(costCodeForecast.totals.budgetedCost)}</td>
                  <td className="py-2 px-3 text-right">{fmt(costCodeForecast.totals.actualCost)}</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right">{fmt(costCodeForecast.totals.projectedFinalCost)}</td>
                  <td className="py-2 px-3 text-right">{fmt(costCodeForecast.totals.costToComplete)}</td>
                  <td className="py-2 px-3 text-right">{fmt(costCodeForecast.totals.variance)}</td>
                  <td className="py-2 px-3 text-right">{fmt(costCodeForecast.totals.projectedMargin)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No cost-code budgets or costs recorded for this selection.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  tone?: 'neutral' | 'good' | 'bad' | 'warn';
}) {
  const toneClass =
    tone === 'good' ? 'text-green-600'
      : tone === 'bad' ? 'text-red-600'
        : tone === 'warn' ? 'text-amber-600'
          : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${toneClass}`} aria-hidden="true" />
        </div>
        <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function WipRow({ r }: { r: WipProjectRow }) {
  const overUnder =
    r.overbilling > 0 ? (
      <Badge variant="outline" className="text-amber-600 border-amber-300">
        {fmt(r.overbilling)} over
      </Badge>
    ) : r.underbilling > 0 ? (
      <Badge variant="outline" className="text-blue-600 border-blue-300">
        {fmt(r.underbilling)} under
      </Badge>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3 font-medium">{r.name}</td>
      <td className="py-2 px-3 text-right">{fmt(r.contractAmount)}</td>
      <td className="py-2 px-3 text-right">{fmt(r.estimatedTotalCost)}</td>
      <td className="py-2 px-3 text-right">{fmt(r.actualCostToDate)}</td>
      <td className="py-2 px-3 text-right">{pct(r.percentComplete)}</td>
      <td className="py-2 px-3 text-right">{fmt(r.earnedRevenue)}</td>
      <td className="py-2 px-3 text-right">{fmt(r.billedToDate)}</td>
      <td className="py-2 px-3 text-right">{overUnder}</td>
      <td className="py-2 px-3 text-right">{fmt(r.costToComplete)}</td>
      <td className="py-2 px-3 text-right">{fmt(r.estimatedFinalCost)}</td>
      <td className={`py-2 px-3 text-right ${r.cpi != null && r.cpi < 1 ? 'text-red-600' : ''}`}>
        {idx(r.cpi)}
      </td>
      <td className={`py-2 px-3 text-right ${r.spi != null && r.spi < 1 ? 'text-red-600' : ''}`}>
        {idx(r.spi)}
      </td>
    </tr>
  );
}

export default WipReport;
