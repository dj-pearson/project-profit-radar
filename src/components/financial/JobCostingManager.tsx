import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, TrendingUp, TrendingDown, Calculator, 
  FileText, AlertCircle, PieChart, BarChart3 
} from 'lucide-react';

interface CostCode {
  id: string;
  code: string;
  description: string;
  category: 'labor' | 'materials' | 'equipment' | 'subcontractor' | 'overhead';
  budgetAmount: number;
  actualAmount: number;
  committedAmount: number;
}

interface JobCost {
  id: string;
  projectId: string;
  projectName: string;
  totalBudget: number;
  actualCosts: number;
  committedCosts: number;
  projectedCosts: number;
  profitMargin: number;
  costCodes: CostCode[];
  lastUpdated: Date;
}

interface ChangeOrder {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  impactOnSchedule: number; // days
  impactOnBudget: number;
  dateSubmitted: Date;
}

export const JobCostingManager: React.FC = () => {
  const [jobCosts, setJobCosts] = useState<JobCost[]>([
    {
      id: '1',
      projectId: 'proj-1',
      projectName: 'Downtown Office Complex',
      totalBudget: 2500000,
      actualCosts: 1850000,
      committedCosts: 450000,
      projectedCosts: 2400000,
      profitMargin: 0.12,
      lastUpdated: new Date(),
      costCodes: [
        {
          id: '1',
          code: '03300',
          description: 'Cast-in-Place Concrete',
          category: 'materials',
          budgetAmount: 350000,
          actualAmount: 320000,
          committedAmount: 25000
        },
        {
          id: '2', 
          code: '06100',
          description: 'Rough Carpentry',
          category: 'labor',
          budgetAmount: 180000,
          actualAmount: 195000,
          committedAmount: 0
        }
      ]
    }
  ]);

  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([
    {
      id: '1',
      projectId: 'proj-1',
      description: 'Additional electrical outlets in conference rooms',
      amount: 15000,
      status: 'pending',
      impactOnSchedule: 3,
      impactOnBudget: 15000,
      dateSubmitted: new Date('2024-01-10')
    }
  ]);

  const [selectedProject, setSelectedProject] = useState<string>('proj-1');

  const currentJob = jobCosts.find(job => job.projectId === selectedProject);
  const projectChangeOrders = changeOrders.filter(co => co.projectId === selectedProject);

  const calculateVariance = (budget: number, actual: number) => {
    const variance = ((actual - budget) / budget) * 100;
    return {
      percentage: Math.abs(variance),
      isOverBudget: variance > 0,
      amount: actual - budget
    };
  };

  const renderCostCodeCard = (costCode: CostCode) => {
    const variance = calculateVariance(costCode.budgetAmount, costCode.actualAmount);
    const utilization = ((costCode.actualAmount + costCode.committedAmount) / costCode.budgetAmount) * 100;

    return (
      <Card key={costCode.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium">{costCode.code}</h4>
            <p className="text-sm text-muted-foreground">{costCode.description}</p>
          </div>
          <Badge variant={variance.isOverBudget ? 'destructive' : 'default'}>
            {variance.isOverBudget ? '+' : '-'}{variance.percentage.toFixed(1)}%
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Budget:</span>
            <span>${costCode.budgetAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Actual:</span>
            <span className={variance.isOverBudget ? 'text-destructive' : 'text-green-600'}>
              ${costCode.actualAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Committed:</span>
            <span>${costCode.committedAmount.toLocaleString()}</span>
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Utilization</span>
              <span>{utilization.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(utilization, 100)} className="h-2" />
          </div>
        </div>
      </Card>
    );
  };

  const renderChangeOrderCard = (changeOrder: ChangeOrder) => (
    <Card key={changeOrder.id} className="p-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm">{changeOrder.description}</h4>
        <Badge variant={
          changeOrder.status === 'approved' ? 'default' :
          changeOrder.status === 'rejected' ? 'destructive' : 'secondary'
        }>
          {changeOrder.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Amount:</span>
          <p className="font-medium">${changeOrder.amount.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Schedule Impact:</span>
          <p className="font-medium">{changeOrder.impactOnSchedule} days</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {changeOrder.status === 'pending' && (
          <>
            <Button size="sm" variant="default">Approve</Button>
            <Button size="sm" variant="outline">Reject</Button>
          </>
        )}
        <Button size="sm" variant="ghost">Details</Button>
      </div>
    </Card>
  );

  if (!currentJob) return <div>No project selected</div>;

  const overallVariance = calculateVariance(currentJob.totalBudget, currentJob.projectedCosts);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Job Costing & Financial Management</h2>
          <p className="text-muted-foreground">Real-time project financial tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Update Costs
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">
                  ${currentJob.totalBudget.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actual Costs</p>
                <p className="text-2xl font-bold">
                  ${currentJob.actualCosts.toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projected Final</p>
                <p className={`text-2xl font-bold ${
                  overallVariance.isOverBudget ? 'text-destructive' : 'text-green-600'
                }`}>
                  ${currentJob.projectedCosts.toLocaleString()}
                </p>
              </div>
              {overallVariance.isOverBudget ? 
                <TrendingDown className="h-8 w-8 text-destructive" /> :
                <TrendingUp className="h-8 w-8 text-green-600" />
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold text-green-600">
                  {(currentJob.profitMargin * 100).toFixed(1)}%
                </p>
              </div>
              <PieChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Project Financial Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Budget Utilization</span>
                <span>{((currentJob.actualCosts / currentJob.totalBudget) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(currentJob.actualCosts / currentJob.totalBudget) * 100} />
            </div>
            
            {overallVariance.isOverBudget && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Project is ${Math.abs(overallVariance.amount).toLocaleString()} over budget</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cost-codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cost-codes">Cost Codes</TabsTrigger>
          <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="cost-codes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentJob.costCodes.map(renderCostCodeCard)}
          </div>
        </TabsContent>

        <TabsContent value="change-orders">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Change Orders</h3>
              <Button>Create New Change Order</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectChangeOrders.map(renderChangeOrderCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forecasting">
          <Card>
            <CardHeader>
              <CardTitle>Cost Forecasting & Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                AI-powered cost forecasting and trend analysis coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};