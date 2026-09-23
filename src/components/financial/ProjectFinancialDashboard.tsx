import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Receipt, Wallet, CreditCard } from 'lucide-react';

interface ProjectFinancialDashboardProps {
  projectId: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export function ProjectFinancialDashboard({ projectId }: ProjectFinancialDashboardProps) {
  const { data, isLoading: loading, error, refetch } = useProjectFinancials(projectId);
  const loadError = error ? error.message || 'Could not load project financials.' : null;

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
    // A zero here would read as "nothing billed and nothing collected", so a
    // failed load shows the error and no figures.
    return <ErrorState error={loadError} onRetry={() => { void refetch(); }} />;
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
