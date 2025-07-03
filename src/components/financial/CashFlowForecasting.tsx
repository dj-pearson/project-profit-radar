import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  Calendar,
  Target
} from 'lucide-react';

interface CashFlowData {
  projection_date: string;
  projected_income: number;
  projected_expenses: number;
  projected_balance: number;
  actual_income: number;
  actual_expenses: number;
  actual_balance: number;
  variance: number;
}

interface CashFlowSummary {
  totalProjectedIncome: number;
  totalProjectedExpenses: number;
  totalActualIncome: number;
  totalActualExpenses: number;
  projectedCashFlow: number;
  actualCashFlow: number;
  variance: number;
}

export const CashFlowForecasting: React.FC = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '90' | '180'>('90');

  useEffect(() => {
    if (userProfile?.company_id) {
      loadCashFlowData();
    }
  }, [userProfile, selectedPeriod]);

  const loadCashFlowData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

      const { data, error } = await supabase
        .from('cash_flow_projections')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .gte('projection_date', startDate.toISOString().split('T')[0])
        .lte('projection_date', endDate.toISOString().split('T')[0])
        .order('projection_date');

      if (error) throw error;

      const processedData: CashFlowData[] = (data || []).map(item => ({
        ...item,
        variance: (item.actual_income - item.actual_expenses) - (item.projected_income - item.projected_expenses)
      }));

      setCashFlowData(processedData);

      // Calculate summary
      const summaryData: CashFlowSummary = {
        totalProjectedIncome: processedData.reduce((sum, item) => sum + item.projected_income, 0),
        totalProjectedExpenses: processedData.reduce((sum, item) => sum + item.projected_expenses, 0),
        totalActualIncome: processedData.reduce((sum, item) => sum + item.actual_income, 0),
        totalActualExpenses: processedData.reduce((sum, item) => sum + item.actual_expenses, 0),
        projectedCashFlow: 0,
        actualCashFlow: 0,
        variance: 0
      };

      summaryData.projectedCashFlow = summaryData.totalProjectedIncome - summaryData.totalProjectedExpenses;
      summaryData.actualCashFlow = summaryData.totalActualIncome - summaryData.totalActualExpenses;
      summaryData.variance = summaryData.actualCashFlow - summaryData.projectedCashFlow;

      setSummary(summaryData);
    } catch (error: any) {
      console.error('Error loading cash flow data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load cash flow data"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateForecasts = async () => {
    try {
      setLoading(true);
      
      // This would typically call an edge function to generate forecasts based on:
      // - Historical cash flow patterns
      // - Upcoming invoices and scheduled payments
      // - Project timelines and expected payments
      // - Seasonal trends
      
      const { data, error } = await supabase.functions.invoke('generate-cash-flow-forecast', {
        body: {
          company_id: userProfile?.company_id,
          forecast_period: selectedPeriod
        }
      });

      if (error) throw error;

      toast({
        title: "Forecast Generated",
        description: "Cash flow forecasts have been updated with latest data."
      });

      loadCashFlowData();
    } catch (error: any) {
      console.error('Error generating forecasts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate cash flow forecasts"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading cash flow data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cash Flow Forecasting
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              {['30', '90', '180'].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period as any)}
                  className="rounded-none first:rounded-l-md last:rounded-r-md"
                >
                  {period} days
                </Button>
              ))}
            </div>
            <Button onClick={generateForecasts} disabled={loading}>
              <Target className="h-4 w-4 mr-2" />
              Update Forecast
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.projectedCashFlow)}
              </div>
              <div className="text-sm text-muted-foreground">Projected Cash Flow</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.actualCashFlow)}
              </div>
              <div className="text-sm text-muted-foreground">Actual Cash Flow</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-2xl font-bold ${summary.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.variance)}
              </div>
              <div className="text-sm text-muted-foreground">Variance</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center gap-2">
                {summary.variance >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <Badge variant={summary.variance >= 0 ? 'default' : 'destructive'}>
                  {summary.variance >= 0 ? 'On Track' : 'Below Forecast'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">Forecast Status</div>
            </div>
          </div>
        )}

        {/* Cash Flow Chart */}
        {cashFlowData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="projection_date" 
                  tickFormatter={formatDate}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="projected_balance" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Projected Balance"
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="actual_balance" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Actual Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No cash flow data available for the selected period.</p>
            <Button onClick={generateForecasts}>
              <Target className="h-4 w-4 mr-2" />
              Generate Initial Forecast
            </Button>
          </div>
        )}

        {/* Income vs Expenses Chart */}
        {cashFlowData.length > 0 && (
          <div className="h-80">
            <h4 className="text-lg font-medium mb-4">Income vs Expenses</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="projection_date" 
                  tickFormatter={formatDate}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend />
                <Bar dataKey="projected_income" fill="#8884d8" name="Projected Income" />
                <Bar dataKey="actual_income" fill="#82ca9d" name="Actual Income" />
                <Bar dataKey="projected_expenses" fill="#ffc658" name="Projected Expenses" />
                <Bar dataKey="actual_expenses" fill="#ff7300" name="Actual Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Upcoming Critical Dates */}
        <div className="border rounded-lg p-4">
          <h4 className="text-lg font-medium mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cash Flow Alerts
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Large expense payment due next week</span>
              </div>
              <Badge variant="destructive">-$25,000</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm">Invoice payment expected in 5 days</span>
              </div>
              <Badge variant="default">+$45,000</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};