import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Trophy,
  Briefcase,
  Layers,
  Wallet,
  SlidersHorizontal,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { logger } from '@/lib/logger';
import { fetchExecutiveData, type ExecutiveData } from '@/services/executiveKpiService';
import {
  aggregateMonthly,
  densifyMonthly,
  profitMarginTrend,
  forecastSeries,
  averageMonthlyBurn,
  cashRunwayMonths,
  computeWinRate,
  computeAvgProjectSize,
  computeBacklog,
  sum,
} from '@/lib/executive-kpis';

const KPI_WIDGETS = [
  { id: 'margin-trend', label: 'Profit-margin trend' },
  { id: 'revenue-forecast', label: 'Revenue & forecast' },
  { id: 'win-rate', label: 'Win rate' },
  { id: 'avg-size', label: 'Avg project size' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'runway', label: 'Cash runway' },
] as const;

type KpiId = (typeof KPI_WIDGETS)[number]['id'];

const STORAGE_KEY = 'brikly-executive-kpis';

/** US-063-style personalization: which KPIs are visible, persisted to localStorage. */
function useKpiVisibility() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const isEnabled = (id: KpiId) => enabled[id] ?? true;
  const toggle = (id: KpiId) => {
    setEnabled((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? true) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable — keep in-memory only */
      }
      return next;
    });
  };
  return { isEnabled, toggle };
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const MONTH_OPTIONS = [
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: '24', label: 'Last 24 months' },
];

/** First day (UTC) of the month `months` before the current month — avoids
 *  end-of-month setMonth() rollover. */
function monthsAgoISO(months: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  return d.toISOString().slice(0, 10);
}

const ExecutiveKpiDashboard = () => {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const { isEnabled, toggle } = useKpiVisibility();

  const [months, setMonths] = useState('12');
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!companyId) return;
    // Request-id guard: only the latest in-flight fetch may update state, so a
    // slow earlier response can't overwrite newer KPIs after a period change.
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await fetchExecutiveData(companyId, monthsAgoISO(Number(months)));
      if (requestRef.current !== requestId) return;
      setData(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      logger.error('Failed to load executive KPI data', err as Error);
      setLoadError(true);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [companyId, months]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    if (!data) return null;
    // Densify over the full selected window so forecasting/burn see evenly
    // spaced months (quiet months become 0 rather than collapsing the gap).
    const fromPeriod = monthsAgoISO(Number(months)).slice(0, 7);
    const toPeriod = new Date().toISOString().slice(0, 7);
    const revenueSeries = densifyMonthly(
      aggregateMonthly(
        data.invoices
          .filter((i) => i.issue_date)
          .map((i) => ({ date: i.issue_date as string, amount: i.total_amount ?? 0 }))
      ),
      fromPeriod,
      toPeriod
    );
    const costSeries = densifyMonthly(
      aggregateMonthly(
        data.expenses
          .filter((e) => e.expense_date)
          .map((e) => ({ date: e.expense_date as string, amount: e.amount ?? 0 }))
      ),
      fromPeriod,
      toPeriod
    );
    const marginTrend = profitMarginTrend(revenueSeries, costSeries);
    const forecast = forecastSeries(revenueSeries, 3);

    // Revenue + forecast as one chart series (forecast connects from the last
    // historical point so the dashed line continues the solid one).
    const revenueChart: { period: string; revenue: number | null; forecast: number | null }[] = revenueSeries.map(
      (p, i) => ({
        period: p.period,
        revenue: p.value,
        forecast: i === revenueSeries.length - 1 ? p.value : null,
      })
    );
    forecast.forEach((p) => revenueChart.push({ period: p.period, revenue: null, forecast: p.value }));

    const paidRevenue = sum(
      data.invoices.filter((i) => i.status === 'paid').map((i) => i.total_amount ?? 0)
    );
    const totalCost = sum(data.expenses.map((e) => e.amount ?? 0));
    const cashOnHand = paidRevenue - totalCost;
    const burn = averageMonthlyBurn(revenueSeries, costSeries);
    const runway = cashRunwayMonths(cashOnHand, burn);

    return {
      marginTrend,
      revenueChart,
      latestMargin: marginTrend.length ? marginTrend[marginTrend.length - 1].value : 0,
      winRate: computeWinRate(data.estimates.map((e) => e.status)),
      avgProjectSize: computeAvgProjectSize(data.projects),
      backlog: computeBacklog(data.projects),
      runway,
      cashOnHand,
    };
  }, [data, months]);

  const revenueConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
    forecast: { label: 'Forecast', color: 'hsl(var(--chart-3))' },
  };
  const marginConfig = { value: { label: 'Margin %', color: 'hsl(var(--chart-2))' } };

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ADMINS}>
      <DashboardLayout title="Executive Dashboard">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <BarChart3 className="h-6 w-6" aria-hidden="true" /> Executive Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Company-wide KPIs with revenue forecasting — profit-margin trend, cash runway, win rate, average project size, and backlog.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="exec-period">Period</Label>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger id="exec-period" className="w-[12rem]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><SlidersHorizontal className="mr-1 h-4 w-4" /> Customize</Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56">
                  <p className="mb-2 text-sm font-medium">Show KPIs</p>
                  <div className="space-y-2">
                    {KPI_WIDGETS.map((w) => (
                      <label key={w.id} htmlFor={`kpi-${w.id}`} className="flex items-center gap-2 text-sm">
                        <Checkbox id={`kpi-${w.id}`} checked={isEnabled(w.id)} onCheckedChange={() => toggle(w.id)} />
                        {w.label}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
              <Skeleton className="h-72 w-full" />
            </div>
          ) : loadError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Couldn't load KPIs</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                <span>Something went wrong while loading company metrics. Please try again.</span>
                <Button size="sm" variant="outline" onClick={load}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : kpis ? (
            <>
              {/* KPI cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isEnabled('margin-trend') && (
                  <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Profit margin (latest)" value={`${kpis.latestMargin}%`} />
                )}
                {isEnabled('win-rate') && (
                  <KpiCard icon={<Trophy className="h-4 w-4" />} label="Win rate" value={`${Math.round(kpis.winRate * 100)}%`} />
                )}
                {isEnabled('avg-size') && (
                  <KpiCard icon={<Briefcase className="h-4 w-4" />} label="Avg project size" value={currency(kpis.avgProjectSize)} />
                )}
                {isEnabled('backlog') && (
                  <KpiCard icon={<Layers className="h-4 w-4" />} label="Backlog" value={currency(kpis.backlog)} />
                )}
                {isEnabled('runway') && (
                  <KpiCard
                    icon={<Wallet className="h-4 w-4" />}
                    label="Cash runway"
                    value={kpis.runway === Infinity ? 'Cash-positive' : `${kpis.runway.toFixed(1)} mo`}
                    sub={currency(kpis.cashOnHand)}
                  />
                )}
              </div>

              {/* Revenue + forecast */}
              {isEnabled('revenue-forecast') && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Revenue &amp; 3-month forecast</CardTitle>
                    <CardDescription>Solid = actual invoiced revenue; dashed = linear-regression forecast.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {kpis.revenueChart.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No revenue data for this period.</p>
                    ) : (
                      <ChartContainer config={revenueConfig} className="h-[320px] w-full">
                        <ResponsiveContainer>
                          <LineChart data={kpis.revenueChart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} connectNulls />
                            <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Profit-margin trend */}
              {isEnabled('margin-trend') && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Profit-margin trend</CardTitle>
                    <CardDescription>Monthly profit margin (%) from invoiced revenue vs. expenses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {kpis.marginTrend.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No margin data for this period.</p>
                    ) : (
                      <ChartContainer config={marginConfig} className="h-[280px] w-full">
                        <ResponsiveContainer>
                          <LineChart data={kpis.marginTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
};

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default ExecutiveKpiDashboard;
