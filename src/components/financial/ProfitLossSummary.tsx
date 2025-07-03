import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';

const ProfitLossSummary = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'ytd'>('month');

  // Mock data - replace with real data from Supabase
  const financialData = {
    month: {
      revenue: 142500,
      costs: {
        labor: 48600,
        materials: 32400,
        subcontractors: 18900,
        equipment: 5200,
        overhead: 8400,
        other: 2100
      },
      grossProfit: 26900,
      netProfit: 18500,
      profitMargin: 13.0
    },
    ytd: {
      revenue: 1650000,
      costs: {
        labor: 580000,
        materials: 420000,
        subcontractors: 245000,
        equipment: 65000,
        overhead: 98000,
        other: 28000
      },
      grossProfit: 214000,
      netProfit: 116000,
      profitMargin: 7.0
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