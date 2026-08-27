import { useState, useEffect } from 'react';
import { captureException } from '@/lib/sentry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Receipt, Wallet, CreditCard } from 'lucide-react';

interface ProjectFinancialDashboardProps {
  projectId: string;
}

interface FinancialData {
  contractValue: number;
  billedToDate: number;
  collected: number;
  outstanding: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  previousProfitMargin: number;
  monthlyCashFlow: Array<{ month: string; income: number; expenses: number }>;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export function ProjectFinancialDashboard({ projectId }: ProjectFinancialDashboardProps) {
  const { userProfile } = useAuth();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.company_id || !projectId) return;

    const loadFinancialData = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const [invoicesRes, expensesRes, paymentsRes, projectRes] = await Promise.all([
          supabase
            .from('invoices')
            .select('amount, status, created_at')
            .eq('company_id', userProfile.company_id)
            .eq('project_id', projectId),
          supabase
            .from('expenses')
            .select('amount, date')
            .eq('company_id', userProfile.company_id)
            .eq('project_id', projectId),
          supabase
            .from('payments')
            .select('amount, payment_date')
            .eq('company_id', userProfile.company_id)
            .eq('project_id', projectId),
          supabase
            .from('projects')
            .select('budget')
            .eq('id', projectId)
            .eq('company_id', userProfile.company_id)
            .single(),
        ]);

        // supabase-js returns the error rather than throwing it, so the catch
        // below never fired and `res.data || []` turned a failed read into an
        // empty list: the dashboard rendered a project that had been billed
        // nothing, collected nothing and spent nothing. `payments` in
        // particular is not created by any migration (US-311), so that read
        // fails outright wherever the table was never made by hand.
        const failed = [
          ['invoices', invoicesRes.error],
          ['expenses', expensesRes.error],
          ['payments', paymentsRes.error],
          ['projects', projectRes.error],
        ].filter(([, error]) => error) as Array<[string, { message: string }]>;

        if (failed.length > 0) {
          throw new Error(
            `Could not load project financials: ${failed.map(([t, e]) => `${t} (${e.message})`).join('; ')}`,
          );
        }

        const invoices = invoicesRes.data || [];
        const expenses = expensesRes.data || [];
        const payments = paymentsRes.data || [];
        const project = projectRes.data;

        const contractValue = project?.budget || 0;
        const billedToDate = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const collected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const outstanding = billedToDate - collected;
        const totalCosts = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netProfit = collected - totalCosts;
        const profitMargin = billedToDate > 0 ? (netProfit / billedToDate) * 100 : 0;

        // Build monthly cash flow data for last 6 months
        const months: Array<{ month: string; income: number; expenses: number }> = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

          const monthIncome = payments
            .filter(p => p.payment_date?.startsWith(monthKey))
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          const monthExpenses = expenses
            .filter(e => e.date?.startsWith(monthKey))
            .reduce((sum, e) => sum + (e.amount || 0), 0);

          months.push({ month: monthStr, income: monthIncome, expenses: monthExpenses });
        }

        setData({
          contractValue,
          billedToDate,
          collected,
          outstanding,
          totalCosts,
          netProfit,
          profitMargin,
          previousProfitMargin: profitMargin * 0.95,
          monthlyCashFlow: months,
        });
      } catch (error) {
        // Reached now that the reads above surface their errors. A financial
        // dashboard showing zeros because a query failed is worse than one
        // showing nothing, so the empty state stands and ops gets told.
        setLoadError(error instanceof Error ? error.message : 'Could not load project financials.');
        captureException(error, {
          context: 'ProjectFinancialDashboard.loadFinancialData',
        });
      } finally {
        setLoading(false);
      }
    };

    loadFinancialData();
  }, [projectId, userProfile?.company_id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="pt-4"><Skeleton className="h-[250px]" /></CardContent></Card>
          <Card><CardContent className="pt-4"><Skeleton className="h-[250px]" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (loadError) {
    // Previously this returned null, so a failed load and a project with no
    // financial records looked identical: a blank space. Say which it is.
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project financials unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{loadError}</p>
          <p className="mt-2">
            No figures are shown rather than showing zeros, because a zero here would read as
            "nothing billed and nothing collected".
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const donutData = [
    { name: 'Revenue', value: data.billedToDate },
    { name: 'Costs', value: data.totalCosts },
  ];

  const marginTrend = data.profitMargin >= data.previousProfitMargin ? 'up' : 'down';

  const kpis = [
    { label: 'Contract Value', value: formatCurrency(data.contractValue), icon: Receipt, color: 'text-blue-600' },
    { label: 'Billed to Date', value: formatCurrency(data.billedToDate), icon: CreditCard, color: 'text-indigo-600' },
    { label: 'Collected', value: formatCurrency(data.collected), icon: Wallet, color: 'text-green-600' },
    { label: 'Outstanding', value: formatCurrency(data.outstanding), icon: DollarSign, color: 'text-amber-600' },
    { label: 'Total Costs', value: formatCurrency(data.totalCosts), icon: TrendingDown, color: 'text-red-600' },
    { label: 'Net Profit', value: formatCurrency(data.netProfit), icon: TrendingUp, color: data.netProfit >= 0 ? 'text-green-600' : 'text-red-600' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} aria-hidden="true" />
                <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profit Margin Indicator */}
      <Card>
        <CardContent className="pt-4 flex items-center gap-3">
          <span className="text-sm font-medium">Profit Margin:</span>
          <span className="text-2xl font-bold">{data.profitMargin.toFixed(1)}%</span>
          <Badge variant={marginTrend === 'up' ? 'default' : 'destructive'} className="flex items-center gap-1">
            {marginTrend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {marginTrend === 'up' ? 'Trending Up' : 'Trending Down'}
          </Badge>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Costs Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue vs Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                >
                  {donutData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Cash Flow Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.monthlyCashFlow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#22c55e" name="Income" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
