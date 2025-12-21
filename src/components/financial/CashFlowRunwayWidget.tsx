import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Clock,
  CalendarDays,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  FileX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCashFlowData, useCashFlowActivity } from '@/hooks/useCashFlow';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface CashFlowData {
  current_cash: number;
  daily_burn_rate: number;
  runway_days: number;
  trend: 'improving' | 'declining' | 'stable';
  last_30_days_change: number;
  total_receivables: number;
  total_payables: number;
  forecast_30: number;
  forecast_60: number;
  forecast_90: number;
}

interface CashFlowItem {
  date: string;
  type: 'inflow' | 'outflow';
  amount: number;
  description: string;
  category: string;
  status: 'pending' | 'completed';
}

export const CashFlowRunwayWidget = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = userProfile?.company_id;

  // Fetch real data from database
  const { data: cashFlowData, isLoading: dataLoading, error: dataError } = useCashFlowData();
  const { data: recentActivity, isLoading: activityLoading } = useCashFlowActivity();

  const loading = dataLoading || activityLoading;

  // Real-time subscription for updates
  useEffect(() => {
    if (!companyId) return;

    const subscription = supabase
      .channel('cash_flow_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cash-flow-data'] });
          queryClient.invalidateQueries({ queryKey: ['cash-flow-activity'] });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cash-flow-data'] });
          queryClient.invalidateQueries({ queryKey: ['cash-flow-activity'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [companyId, queryClient]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 0) return `In ${diffDays} days`;

    return date.toLocaleDateString();
  };

  const getRunwayColor = (days: number) => {
    if (days >= 60) return 'text-green-600 bg-green-50 border-green-200';
    if (days >= 30) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRunwayStatus = (days: number) => {
    if (days >= 60) return 'Healthy';
    if (days >= 30) return 'Monitor';
    return 'Critical';
  };

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!cashFlowData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Cash Flow Data</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Start by adding invoices and expenses to track your cash flow and runway.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Runway Display */}
      <Card className={`border-2 ${getRunwayColor(cashFlowData.runway_days)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Clock className="h-6 w-6" />
                Cash Flow Runway
              </CardTitle>
              <CardDescription className="mt-2">
                At current burn rate of {formatCurrency(cashFlowData.daily_burn_rate)}/day
              </CardDescription>
            </div>
            {cashFlowData.runway_days < 30 && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Action Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Runway Gauge */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <div className={`w-48 h-48 rounded-full border-8 flex items-center justify-center ${getRunwayColor(cashFlowData.runway_days)}`}>
                <div>
                  <div className="text-5xl font-bold">
                    {cashFlowData.runway_days}
                  </div>
                  <div className="text-sm font-semibold mt-1">DAYS</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="outline" className={getRunwayColor(cashFlowData.runway_days)}>
                Status: {getRunwayStatus(cashFlowData.runway_days)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Based on current cash of {formatCurrency(cashFlowData.current_cash)} and daily burn rate
            </p>
          </div>

          {/* Trend Indicator */}
          <div className={`p-4 rounded-lg border ${cashFlowData.trend === 'declining' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {cashFlowData.trend === 'declining' ? (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                )}
                <span className="font-semibold">
                  {cashFlowData.trend === 'declining' ? 'Declining' : 'Improving'}
                </span>
              </div>
              <div className={`text-sm ${cashFlowData.trend === 'declining' ? 'text-red-600' : 'text-green-600'}`}>
                {cashFlowData.last_30_days_change > 0 ? '+' : ''}{cashFlowData.last_30_days_change}% vs last 30 days
              </div>
            </div>
            {cashFlowData.trend === 'declining' && cashFlowData.runway_days < 30 && (
              <p className="text-sm text-red-700 mt-2">
                ⚠️ Your runway is declining and below 30 days. Take immediate action to increase cash reserves or reduce burn rate.
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Cash</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(cashFlowData.current_cash)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Burn Rate</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(cashFlowData.daily_burn_rate)}</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Receivables vs Payables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-construction-orange" />
            Receivables vs Payables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Money Coming In</span>
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(cashFlowData.total_receivables)}
              </p>
              <p className="text-xs text-green-600 mt-1">Outstanding invoices</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">Money Going Out</span>
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(cashFlowData.total_payables)}
              </p>
              <p className="text-xs text-red-600 mt-1">Upcoming payments</p>
            </div>
          </div>

          <div className="p-4 bg-construction-orange/10 rounded-lg border border-construction-orange/20">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Net Position</span>
              <span className="text-lg font-bold text-construction-orange">
                {formatCurrency(cashFlowData.total_receivables - cashFlowData.total_payables)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 30/60/90 Day Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Forecast</CardTitle>
          <CardDescription>Projected cash balance over next 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { days: 30, amount: cashFlowData.forecast_30 },
              { days: 60, amount: cashFlowData.forecast_60 },
              { days: 90, amount: cashFlowData.forecast_90 }
            ].map((forecast) => {
              const percentOfCurrent = (forecast.amount / cashFlowData.current_cash) * 100;
              const isHealthy = forecast.amount > cashFlowData.current_cash * 0.7;

              return (
                <div key={forecast.days} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{forecast.days} Days</span>
                    <span className={`font-bold ${isHealthy ? 'text-green-600' : 'text-yellow-600'}`}>
                      {formatCurrency(forecast.amount)}
                    </span>
                  </div>
                  <Progress
                    value={percentOfCurrent}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {percentOfCurrent > 100 ? '+' : ''}{(percentOfCurrent - 100).toFixed(0)}% vs current cash
                  </p>
                </div>
              );
            })}
          </div>

          {cashFlowData.forecast_90 < cashFlowData.current_cash * 0.5 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ Warning: 90-day forecast shows cash declining by 50%+. Consider:
              </p>
              <ul className="text-xs text-yellow-700 mt-2 ml-4 space-y-1">
                <li>• Accelerating receivables collection</li>
                <li>• Negotiating extended payment terms</li>
                <li>• Securing line of credit</li>
                <li>• Reducing discretionary spending</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cash Flow Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="inflow">Inflows</TabsTrigger>
              <TabsTrigger value="outflow">Outflows</TabsTrigger>
            </TabsList>

            {['all', 'inflow', 'outflow'].map(tab => {
              const filteredItems = (recentActivity || []).filter(item => tab === 'all' || item.type === tab);
              return (
                <TabsContent key={tab} value={tab} className="space-y-3">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No {tab === 'all' ? 'activity' : tab === 'inflow' ? 'inflows' : 'outflows'} to display</p>
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {item.type === 'inflow' ? (
                            <ArrowDownCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowUpCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{item.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">{item.category}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                              <Badge variant={item.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className={`font-bold ${item.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.type === 'inflow' ? '+' : '-'}{formatCurrency(item.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Items */}
      {cashFlowData.runway_days < 45 && (
        <Card className="border-2 border-construction-orange">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-construction-orange">
              <AlertTriangle className="h-5 w-5" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-construction-orange font-bold">1.</span>
                <span>Follow up on {formatCurrency(cashFlowData.total_receivables)} in outstanding invoices</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-construction-orange font-bold">2.</span>
                <span>Review and reduce daily burn rate of {formatCurrency(cashFlowData.daily_burn_rate)}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-construction-orange font-bold">3.</span>
                <span>Consider securing a line of credit for cash flow buffer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-construction-orange font-bold">4.</span>
                <span>Negotiate payment terms extension with key vendors</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CashFlowRunwayWidget;
