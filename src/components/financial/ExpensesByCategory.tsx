import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Hammer, 
  Truck, 
  Users, 
  Wrench, 
  Fuel,
  Building,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const ExpensesByCategory = () => {
  // Mock data - replace with real data from Supabase
  const expenseData = [
    {
      category: 'Materials',
      amount: 15750,
      lastMonth: 12300,
      percentage: 35,
      icon: Hammer,
      trend: 'up'
    },
    {
      category: 'Labor',
      amount: 18500,
      lastMonth: 17200,
      percentage: 42,
      icon: Users,
      trend: 'up'
    },
    {
      category: 'Subcontractors',
      amount: 6200,
      lastMonth: 8100,
      percentage: 14,
      icon: Wrench,
      trend: 'down'
    },
    {
      category: 'Equipment',
      amount: 2100,
      lastMonth: 1950,
      percentage: 5,
      icon: Truck,
      trend: 'up'
    },
    {
      category: 'Fuel & Transport',
      amount: 950,
      lastMonth: 1200,
      percentage: 2,
      icon: Fuel,
      trend: 'down'
    },
    {
      category: 'Office & Admin',
      amount: 850,
      lastMonth: 800,
      percentage: 2,
      icon: Building,
      trend: 'up'
    }
  ];

  const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0);
  const lastMonthTotal = expenseData.reduce((sum, expense) => sum + expense.lastMonth, 0);
  const monthlyChange = ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hammer className="h-5 w-5" />
          Expenses by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total and Change */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">This Month</span>
            <span className="font-bold text-lg">${totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {monthlyChange > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span className={monthlyChange > 0 ? 'text-red-600' : 'text-green-600'}>
              {Math.abs(monthlyChange).toFixed(1)}% vs last month
            </span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          {expenseData.map((expense, index) => {
            const Icon = expense.icon;
            const change = ((expense.amount - expense.lastMonth) / expense.lastMonth) * 100;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{expense.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">${expense.amount.toLocaleString()}</div>
                    <div className={`text-xs flex items-center gap-1 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {change > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(change).toFixed(0)}%
                    </div>
                  </div>
                </div>
                <Progress value={expense.percentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{expense.percentage}% of total</span>
                  <span>Last: ${expense.lastMonth.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategory;