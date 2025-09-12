import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';

interface FinancialData {
  revenue: number;
  costs: {
    labor: number;
    materials: number;
    subcontractors: number;
    equipment: number;
    overhead: number;
    other: number;
  };
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

const ProfitLossSummary = () => {
  const { userProfile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'ytd'>('month');
  const [financialData, setFinancialData] = useState<Record<'month' | 'ytd', FinancialData>>({
    month: {
      revenue: 0,
      costs: { labor: 0, materials: 0, subcontractors: 0, equipment: 0, overhead: 0, other: 0 },
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0
    },
    ytd: {
      revenue: 0,
      costs: { labor: 0, materials: 0, subcontractors: 0, equipment: 0, overhead: 0, other: 0 },
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadFinancialData();
    }
  }, [userProfile?.company_id]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Load revenue from invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, created_at, status')
        .eq('company_id', userProfile?.company_id)
        .eq('status', 'paid')
        .gte('created_at', yearStart.toISOString());

      if (invoicesError) throw invoicesError;

      // Load expenses with categories
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          amount, 
          expense_date,
          expense_categories(name)
        `)
        .eq('company_id', userProfile?.company_id)
        .gte('expense_date', yearStart.toISOString().split('T')[0]);

      if (expensesError) throw expensesError;

      // Calculate monthly data
      const monthlyRevenue = invoices?.filter(inv => 
        new Date(inv.created_at) >= currentMonthStart
      ).reduce((sum, inv) => sum + (parseFloat(String(inv.total_amount)) || 0), 0) || 0;

      const monthlyExpenses = expenses?.filter(exp => 
        new Date(exp.expense_date) >= currentMonthStart
      ) || [];

      // Calculate YTD data
      const ytdRevenue = invoices?.reduce((sum, inv) => sum + (parseFloat(String(inv.total_amount)) || 0), 0) || 0;

      // Categorize expenses
      const categorizeExpenses = (expenseList: any[]) => {
        const costs = { labor: 0, materials: 0, subcontractors: 0, equipment: 0, overhead: 0, other: 0 };
        
        expenseList.forEach(exp => {
          const amount = parseFloat(String(exp.amount)) || 0;
          const categoryName = exp.expense_categories?.name || 'other';
          
          // Map category names to cost structure
          const categoryMapping: Record<string, keyof typeof costs> = {
            'Labor': 'labor',
            'Materials': 'materials', 
            'Subcontractors': 'subcontractors',
            'Equipment': 'equipment',
            'Office': 'overhead'
          };
          
          const mappedCategory = categoryMapping[categoryName] || 'other';
          costs[mappedCategory] += amount;
        });
        
        return costs;
      };

      const monthlyCosts = categorizeExpenses(monthlyExpenses);
      const ytdCosts = categorizeExpenses(expenses || []);

      const monthlyTotalCosts = Object.values(monthlyCosts).reduce((sum, cost) => sum + cost, 0);
      const ytdTotalCosts = Object.values(ytdCosts).reduce((sum, cost) => sum + cost, 0);

      const monthlyGrossProfit = monthlyRevenue - monthlyTotalCosts;
      const ytdGrossProfit = ytdRevenue - ytdTotalCosts;

      // Net profit (assuming 85% of gross profit after taxes and other deductions)
      const monthlyNetProfit = monthlyGrossProfit * 0.85;
      const ytdNetProfit = ytdGrossProfit * 0.85;

      setFinancialData({
        month: {
          revenue: monthlyRevenue,
          costs: monthlyCosts,
          grossProfit: monthlyGrossProfit,
          netProfit: monthlyNetProfit,
          profitMargin: monthlyRevenue > 0 ? (monthlyNetProfit / monthlyRevenue) * 100 : 0
        },
        ytd: {
          revenue: ytdRevenue,
          costs: ytdCosts,
          grossProfit: ytdGrossProfit,
          netProfit: ytdNetProfit,
          profitMargin: ytdRevenue > 0 ? (ytdNetProfit / ytdRevenue) * 100 : 0
        }
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentData = financialData[selectedPeriod];
  const totalCosts = Object.values(currentData.costs).reduce((sum, cost) => sum + cost, 0);

  const getCostCategories = () => {
    return Object.entries(currentData.costs).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      percentage: (amount / totalCosts) * 100
    }));
  };

  const isProfit = currentData.netProfit > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Profit & Loss Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading financial data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Profit & Loss Summary
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="month">This Month</TabsTrigger>
                <TabsTrigger value="ytd">Year to Date</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              ${currentData.revenue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Revenue</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              ${totalCosts.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Costs</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              ${currentData.grossProfit.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Gross Profit</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              ${currentData.netProfit.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Net Profit</div>
          </div>
        </div>

        {/* Profit Margin Indicator */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profit Margin</span>
            <div className="flex items-center gap-2">
              {isProfit ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {currentData.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedPeriod === 'month' ? 'This month performance' : 'Year-to-date performance'}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold">Cost Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCostCategories().map((cost, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{cost.category}</div>
                  <div className="text-sm text-muted-foreground">
                    {cost.percentage.toFixed(1)}% of total costs
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${cost.amount.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Ready Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Tax-Ready Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Gross Revenue:</span>
              <div className="font-bold">${currentData.revenue.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Deductible Expenses:</span>
              <div className="font-bold">${totalCosts.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Net Income:</span>
              <div className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                ${currentData.netProfit.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Period:</span>
              <div className="font-bold">
                {selectedPeriod === 'month' ? 'January 2024' : '2024 YTD'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            View Detailed Report
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Compare Periods
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export for Taxes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossSummary;