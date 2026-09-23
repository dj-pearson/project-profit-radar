import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Users, Wrench, Package } from 'lucide-react';
import type { CostSummary, Project } from './types';

interface CostAnalyticsTabProps {
  costSummary: CostSummary;
  currentProject: Project;
}

/** Analytics tab: cost breakdown by category and budget position. */
export function CostAnalyticsTab({ costSummary, currentProject }: CostAnalyticsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Labor', value: costSummary.laborCost, icon: Users, color: 'bg-blue-500' },
              { name: 'Materials', value: costSummary.materialCost, icon: Package, color: 'bg-green-500' },
              { name: 'Equipment', value: costSummary.equipmentCost, icon: Wrench, color: 'bg-orange-500' },
              { name: 'Other', value: costSummary.otherCost, icon: DollarSign, color: 'bg-purple-500' }
            ].map(({ name, value, icon: Icon, color }) => {
              const percentage = costSummary.totalCost > 0 ? (value / costSummary.totalCost) * 100 : 0;
              return (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Budget Usage</span>
                <span>{currentProject.budget ? ((costSummary.totalCost / currentProject.budget) * 100).toFixed(1) : 0}%</span>
              </div>
              <Progress value={currentProject.budget ? (costSummary.totalCost / currentProject.budget) * 100 : 0} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-bold text-lg">${currentProject.budget?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Spent</p>
                <p className="font-bold text-lg">${costSummary.totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className={`font-bold text-lg ${costSummary.budgetVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(costSummary.budgetVariance).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={costSummary.budgetVariance >= 0 ? 'default' : 'destructive'}>
                  {costSummary.budgetVariance >= 0 ? 'On Budget' : 'Over Budget'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
