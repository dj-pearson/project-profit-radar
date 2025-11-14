import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetBreakdown {
  category: string;
  budgeted: number;
  spent: number;
  icon?: React.ReactNode;
}

interface ClientBudgetSummaryProps {
  totalBudget: number;
  actualCost: number;
  contractValue?: number;
  breakdown?: BudgetBreakdown[];
  showDetailedBreakdown?: boolean;
}

export const ClientBudgetSummary: React.FC<ClientBudgetSummaryProps> = ({
  totalBudget,
  actualCost,
  contractValue,
  breakdown = [],
  showDetailedBreakdown = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const remaining = totalBudget - actualCost;
  const percentUsed = totalBudget > 0 ? (actualCost / totalBudget) * 100 : 0;
  const variance = totalBudget - actualCost;
  const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

  const getBudgetStatus = () => {
    if (percentUsed <= 90) return 'healthy';
    if (percentUsed <= 100) return 'warning';
    return 'over';
  };

  const status = getBudgetStatus();

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'over':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'over':
        return 'text-red-600';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-600';
      case 'warning':
        return 'bg-yellow-600';
      case 'over':
        return 'bg-red-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Budget Summary</CardTitle>
            <CardDescription>
              Overview of project budget and spending
            </CardDescription>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Budget Display */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Budget Used</span>
            <div className="text-right">
              <span className={cn("text-2xl font-bold", getStatusColor())}>
                {formatCurrency(actualCost)}
              </span>
              <span className="text-muted-foreground text-sm ml-2">
                of {formatCurrency(totalBudget)}
              </span>
            </div>
          </div>
          <Progress
            value={Math.min(percentUsed, 100)}
            className="h-3"
            indicatorClassName={getProgressColor()}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {percentUsed.toFixed(1)}% utilized
            </span>
            {status === 'over' && (
              <span className="text-xs font-medium text-red-600">
                Over budget by {formatCurrency(Math.abs(remaining))}
              </span>
            )}
          </div>
        </div>

        {/* Budget Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Remaining Budget */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Remaining</span>
              {remaining >= 0 ? (
                <TrendingDown className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className={cn(
              "text-2xl font-bold",
              remaining >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(Math.abs(remaining))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {remaining >= 0 ? 'Under budget' : 'Over budget'}
            </div>
          </div>

          {/* Contract Value */}
          {contractValue && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Contract Value</span>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(contractValue)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total contract amount
              </div>
            </div>
          )}
        </div>

        {/* Budget Status Message */}
        <div className={cn(
          "p-4 rounded-lg border-2",
          status === 'healthy' && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
          status === 'warning' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900",
          status === 'over' && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
        )}>
          <div className="flex items-start space-x-3">
            <Info className={cn(
              "h-5 w-5 mt-0.5",
              status === 'healthy' && "text-green-600",
              status === 'warning' && "text-yellow-600",
              status === 'over' && "text-red-600"
            )} />
            <div className="flex-1">
              <h4 className={cn(
                "font-semibold mb-1",
                status === 'healthy' && "text-green-900 dark:text-green-100",
                status === 'warning' && "text-yellow-900 dark:text-yellow-100",
                status === 'over' && "text-red-900 dark:text-red-100"
              )}>
                {status === 'healthy' && "Budget is on track"}
                {status === 'warning' && "Approaching budget limit"}
                {status === 'over' && "Budget exceeded"}
              </h4>
              <p className={cn(
                "text-sm",
                status === 'healthy' && "text-green-700 dark:text-green-200",
                status === 'warning' && "text-yellow-700 dark:text-yellow-200",
                status === 'over' && "text-red-700 dark:text-red-200"
              )}>
                {status === 'healthy' && `Your project is under budget with ${formatCurrency(remaining)} remaining.`}
                {status === 'warning' && `Your project has ${formatCurrency(remaining)} remaining (${variancePercent.toFixed(1)}% of budget).`}
                {status === 'over' && `Your project is over budget by ${formatCurrency(Math.abs(remaining))}. Additional costs may require a change order.`}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown (Optional) */}
        {showDetailedBreakdown && breakdown.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Budget Breakdown</h4>
            {breakdown.map((item, index) => {
              const categoryPercent = item.budgeted > 0 ? (item.spent / item.budgeted) * 100 : 0;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <span className="text-sm font-medium">{item.category}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.spent)} / {formatCurrency(item.budgeted)}
                    </span>
                  </div>
                  <Progress value={Math.min(categoryPercent, 100)} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}

        {/* Info Footer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            Budget amounts shown are estimates and may change based on project needs.
            Any significant changes will be communicated via change orders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
