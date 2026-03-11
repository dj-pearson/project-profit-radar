import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Receipt, RefreshCw
} from 'lucide-react';

type PeriodType = 'month' | 'quarter' | 'year' | 'custom';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

function getPeriodRange(period: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;

  switch (period) {
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStart, 1);
      break;
    }
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), 0, 1);
  }

  return { start, end };
}

const FinancialOverview = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodType>('year');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Array<{ amount: number; status: string; created_at: string; project_id: string }>>([]);
  const [expenses, setExpenses] = useState<Array<{ amount: number; date: string; project_id: string }>>([]);
  const [payments, setPayments] = useState<Array<{ amount: number; payment_date: string; project_id: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; budget: number; status: string }>>([]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);
      const { start } = getPeriodRange(period);
      const startStr = start.toISOString().split('T')[0];

      const [invRes, expRes, payRes, projRes] = await Promise.all([
        supabase.from('invoices').select('amount, status, created_at, project_id')
          .eq('company_id', userProfile.company_id)
          .gte('created_at', startStr),
        supabase.from('expenses').select('amount, date, project_id')
          .eq('company_id', userProfile.company_id)
          .gte('date', startStr),
        supabase.from('payments').select('amount, payment_date, project_id')
          .eq('company_id', userProfile.company_id)
          .gte('payment_date', startStr),
        supabase.from('projects').select('id, name, budget, status')
          .eq('company_id', userProfile.company_id),
      ]);

      setInvoices(invRes.data || []);
      setExpenses(expRes.data || []);
      setPayments(payRes.data || []);
      setProjects(projRes.data || []);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load financial data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id, period]);

  const summaryData = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const accountsReceivable = invoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const accountsPayable = totalExpenses * 0.15; // Estimate based on typical AP ratios

    return { totalRevenue, totalExpenses, netProfit, profitMargin, accountsReceivable, accountsPayable };
  }, [invoices, expenses, payments]);

  const revenueByProject = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach(p => {
      if (p.project_id) {
        map.set(p.project_id, (map.get(p.project_id) || 0) + (p.amount || 0));
      }
    });

    return projects
      .filter(p => map.has(p.id))
      .map(p => ({ name: p.name.length > 25 ? p.name.slice(0, 22) + '...' : p.name, revenue: map.get(p.id) || 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [payments, projects]);

  const monthlyTrend = useMemo(() => {
    const { start } = getPeriodRange(period);
    const months: Array<{ month: string; revenue: number }> = [];
    const now = new Date();
    const monthCount = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      if (d < start) continue;
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const revenue = payments
        .filter(p => p.payment_date?.startsWith(monthKey))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      months.push({ month: monthStr, revenue });
    }
    return months;
  }, [payments, period]);

  const topProjects = useMemo(() => {
    const revenueMap = new Map<string, number>();
    const costMap = new Map<string, number>();

    payments.forEach(p => {
      if (p.project_id) revenueMap.set(p.project_id, (revenueMap.get(p.project_id) || 0) + (p.amount || 0));
    });
    expenses.forEach(e => {
      if (e.project_id) costMap.set(e.project_id, (costMap.get(e.project_id) || 0) + (e.amount || 0));
    });

    return projects
      .map(p => {
        const revenue = revenueMap.get(p.id) || 0;
        const costs = costMap.get(p.id) || 0;
        const profit = revenue - costs;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return { name: p.name, revenue, costs, profit, margin };
      })
      .filter(p => p.revenue > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [payments, expenses, projects]);

  if (loading) {
    return (
      <AccessiblePageWrapper pageTitle="Financial Overview">
        <DashboardLayout title="Financial Overview" hasAccessibleWrapper>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardContent className="pt-6"><Skeleton className="h-[300px]" /></CardContent></Card>
              <Card><CardContent className="pt-6"><Skeleton className="h-[300px]" /></CardContent></Card>
            </div>
            <Card><CardContent className="pt-6"><Skeleton className="h-[200px]" /></CardContent></Card>
          </div>
        </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  const summaryCards = [
    { label: 'Total Revenue', value: formatCurrency(summaryData.totalRevenue), icon: DollarSign, color: 'text-green-600' },
    { label: 'Total Expenses', value: formatCurrency(summaryData.totalExpenses), icon: CreditCard, color: 'text-red-600' },
    { label: 'Net Profit', value: formatCurrency(summaryData.netProfit), icon: summaryData.netProfit >= 0 ? TrendingUp : TrendingDown, color: summaryData.netProfit >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'Profit Margin', value: `${summaryData.profitMargin.toFixed(1)}%`, icon: Wallet, color: 'text-blue-600' },
  ];

  return (
    <AccessiblePageWrapper pageTitle="Financial Overview">
      <DashboardLayout title="Financial Overview" hasAccessibleWrapper>
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                <SelectTrigger className="w-[180px]" aria-label="Select time period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryCards.map(card => (
              <Card key={card.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{card.label}</span>
                    <card.icon className={`h-5 w-5 ${card.color}`} aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AR/AP Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accounts Receivable</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(summaryData.accountsReceivable)}</p>
                </div>
                <Receipt className="h-8 w-8 text-amber-500" aria-hidden="true" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accounts Payable</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(summaryData.accountsPayable)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-orange-500" aria-hidden="true" />
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue by Project */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Project</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByProject.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByProject} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No revenue data for this period</div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No trend data for this period</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top 5 Projects by Profitability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 Projects by Profitability</CardTitle>
            </CardHeader>
            <CardContent>
              {topProjects.length > 0 ? (
                <Table aria-label="Top projects by profitability">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Costs</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProjects.map((project, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.costs)}</TableCell>
                        <TableCell className="text-right">
                          <span className={project.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(project.profit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={project.margin >= 20 ? 'default' : project.margin >= 0 ? 'secondary' : 'destructive'}>
                            {project.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No project profitability data for this period</div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default FinancialOverview;
