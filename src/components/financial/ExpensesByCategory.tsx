import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

interface ExpenseCategory {
  category: string;
  amount: number;
  lastMonth: number;
  percentage: number;
  icon: React.ComponentType<any>;
  trend: 'up' | 'down';
}

const ExpensesByCategory = () => {
  const { userProfile } = useAuth();
  const [expenseData, setExpenseData] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadExpenseData();
    }
  }, [userProfile?.company_id]);

  const loadExpenseData = async () => {
    try {
      setLoading(true);
      
      // Get current month start and end
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Load expenses from the last two months with categories
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          amount, 
          expense_date,
          expense_categories(name)
        `)
        .eq('company_id', userProfile?.company_id)
        .gte('expense_date', lastMonthStart.toISOString().split('T')[0])
        .lte('expense_date', currentMonthEnd.toISOString().split('T')[0]);

      if (error) throw error;

      const categoryMap: Record<string, { icon: React.ComponentType<any>; name: string }> = {
        'Materials': { icon: Hammer, name: 'Materials' },
        'Labor': { icon: Users, name: 'Labor' },
        'Subcontractors': { icon: Wrench, name: 'Subcontractors' },
        'Equipment': { icon: Truck, name: 'Equipment' },
        'Fuel': { icon: Fuel, name: 'Fuel & Transport' },
        'Office': { icon: Building, name: 'Office & Admin' },
      };

      // Calculate expenses by category
      const categoryTotals: Record<string, { current: number; last: number }> = {};
      
      expenses?.forEach(expense => {
        const expenseDate = new Date(expense.expense_date);
        const amount = parseFloat(String(expense.amount)) || 0;
        const categoryName = expense.expense_categories?.name || 'Office';
        
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = { current: 0, last: 0 };
        }
        
        if (expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd) {
          categoryTotals[categoryName].current += amount;
        } else if (expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd) {
          categoryTotals[categoryName].last += amount;
        }
      });

      const totalCurrent = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.current, 0);
      
      const transformedData: ExpenseCategory[] = Object.entries(categoryTotals).map(([categoryName, amounts]) => {
        const categoryInfo = categoryMap[categoryName] || { icon: Building, name: categoryName };
        const percentage = totalCurrent > 0 ? (amounts.current / totalCurrent) * 100 : 0;
        const trend: 'up' | 'down' = amounts.current > amounts.last ? 'up' : 'down';
        
        return {
          category: categoryInfo.name,
          amount: amounts.current,
          lastMonth: amounts.last,
          percentage,
          icon: categoryInfo.icon,
          trend
        };
      }).filter(item => item.amount > 0 || item.lastMonth > 0);

      setExpenseData(transformedData);
    } catch (error) {
      console.error('Error loading expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0);
  const lastMonthTotal = expenseData.reduce((sum, expense) => sum + expense.lastMonth, 0);
  const monthlyChange = ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Expenses by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading expense data...</div>
        </CardContent>
      </Card>
    );
  }

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