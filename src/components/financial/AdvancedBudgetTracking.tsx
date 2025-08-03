import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Filter } from 'lucide-react';

export const AdvancedBudgetTracking = () => {
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedView, setSelectedView] = useState('summary');
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  // Mock data for budget tracking
  const budgetSummary = {
    totalBudget: 2450000,
    actualSpent: 1890000,
    commitments: 320000,
    forecast: 2380000,
    variance: -70000,
    variancePercentage: -2.9
  };

  const projects = [
    {
      id: '1',
      name: 'Downtown Office Complex',
      budget: 1250000,
      actual: 980000,
      forecast: 1220000,
      variance: -30000,
      variancePercent: -2.4,
      completion: 78,
      status: 'on_track'
    },
    {
      id: '2',
      name: 'Residential Towers Phase 2',
      budget: 890000,
      actual: 720000,
      forecast: 910000,
      variance: 20000,
      variancePercent: 2.2,
      completion: 81,
      status: 'over_budget'
    },
    {
      id: '3',
      name: 'Medical Center Renovation',
      budget: 310000,
      actual: 190000,
      forecast: 250000,
      variance: -60000,
      variancePercent: -19.4,
      status: 'under_budget',
      completion: 61
    }
  ];

  const budgetCategories = [
    {
      category: 'Labor',
      budget: 980000,
      actual: 756000,
      forecast: 945000,
      variance: -35000,
      variancePercent: -3.6,
      trend: 'improving'
    },
    {
      category: 'Materials',
      budget: 720000,
      actual: 612000,
      forecast: 735000,
      variance: 15000,
      variancePercent: 2.1,
      trend: 'worsening'
    },
    {
      category: 'Equipment',
      budget: 450000,
      actual: 289000,
      forecast: 420000,
      variance: -30000,
      variancePercent: -6.7,
      trend: 'stable'
    },
    {
      category: 'Subcontractors',
      budget: 300000,
      actual: 233000,
      forecast: 280000,
      variance: -20000,
      variancePercent: -6.7,
      trend: 'improving'
    }
  ];

  const varianceAlerts = [
    {
      id: '1',
      project: 'Residential Towers Phase 2',
      category: 'Materials',
      variance: 25000,
      variancePercent: 8.5,
      severity: 'high',
      description: 'Steel prices increased 15% above budget estimates'
    },
    {
      id: '2',
      project: 'Downtown Office Complex',
      category: 'Labor',
      variance: -18000,
      variancePercent: -12.3,
      severity: 'medium',
      description: 'Overtime hours reduced due to productivity improvements'
    },
    {
      id: '3',
      project: 'Medical Center Renovation',
      category: 'Equipment',
      variance: -35000,
      variancePercent: -22.1,
      severity: 'low',
      description: 'Equipment rental costs lower than anticipated'
    }
  ];

  const budgetRevisions = [
    {
      id: '1',
      project: 'Downtown Office Complex',
      requestedBy: 'John Smith',
      requestDate: '2025-01-05',
      originalBudget: 1250000,
      revisedBudget: 1280000,
      reason: 'Additional electrical work required due to code changes',
      status: 'pending_approval',
      approver: 'Sarah Johnson'
    },
    {
      id: '2',
      project: 'Residential Towers Phase 2',
      requestedBy: 'Mike Davis',
      requestDate: '2025-01-03',
      originalBudget: 890000,
      revisedBudget: 920000,
      reason: 'Material cost escalation for steel and concrete',
      status: 'approved',
      approver: 'Sarah Johnson'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-destructive';
    if (variance < -50000) return 'text-success';
    return 'text-warning';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'default';
      case 'over_budget': return 'destructive';
      case 'under_budget': return 'secondary';
      case 'approved': return 'default';
      case 'pending_approval': return 'outline';
      default: return 'secondary';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'worsening': return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'stable': return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Budget Tracking</h2>
          <p className="text-muted-foreground">
            Monitor budget performance with variance analysis and automated alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Across all active projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.actualSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {((budgetSummary.actualSpent / budgetSummary.totalBudget) * 100).toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commitments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.commitments)}</div>
            <p className="text-xs text-muted-foreground">Outstanding purchase orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.forecast)}</div>
            <p className="text-xs text-muted-foreground">Projected completion cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(budgetSummary.variance)}`}>
              {formatCurrency(budgetSummary.variance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetSummary.variancePercentage > 0 ? '+' : ''}{budgetSummary.variancePercentage}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="alerts">Variance Alerts</TabsTrigger>
          <TabsTrigger value="revisions">Budget Revisions</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Project Budget Performance</CardTitle>
              <CardDescription>
                Budget vs. actual spending with variance analysis for each project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{project.name}</h4>
                        <Badge variant={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(project.budget)}</div>
                        <div className="text-sm text-muted-foreground">Budget</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Actual</div>
                        <div className="font-medium">{formatCurrency(project.actual)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Forecast</div>
                        <div className="font-medium">{formatCurrency(project.forecast)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Variance</div>
                        <div className={`font-medium ${getVarianceColor(project.variance)}`}>
                          {formatCurrency(project.variance)} ({project.variancePercent > 0 ? '+' : ''}{project.variancePercent}%)
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Completion</div>
                        <div className="flex items-center gap-2">
                          <Progress value={project.completion} className="flex-1" />
                          <span className="text-sm font-medium">{project.completion}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Budget by Category</CardTitle>
              <CardDescription>
                Multi-dimensional budget analysis by cost categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{category.category}</h4>
                          {getTrendIcon(category.trend)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Budget: {formatCurrency(category.budget)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div>
                        <span className="text-sm text-muted-foreground">Actual: </span>
                        <span className="font-medium">{formatCurrency(category.actual)}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Forecast: </span>
                        <span className="font-medium">{formatCurrency(category.forecast)}</span>
                      </div>
                      <div className={`font-medium ${getVarianceColor(category.variance)}`}>
                        Variance: {formatCurrency(category.variance)} ({category.variancePercent > 0 ? '+' : ''}{category.variancePercent}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Variance Alerts</CardTitle>
              <CardDescription>
                Automated alerts for significant budget variances requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {varianceAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <h4 className="font-medium">{alert.project}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Category: </span>
                        <span className="font-medium">{alert.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium text-lg ${getVarianceColor(alert.variance)}`}>
                        {formatCurrency(alert.variance)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {alert.variancePercent > 0 ? '+' : ''}{alert.variancePercent}%
                      </div>
                      <Button size="sm" className="mt-2">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions">
          <Card>
            <CardHeader>
              <CardTitle>Budget Revisions</CardTitle>
              <CardDescription>
                Budget revision workflow with approval chains and change tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetRevisions.map((revision) => (
                  <div key={revision.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{revision.project}</h4>
                        <Badge variant={getStatusColor(revision.status)}>
                          {revision.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Requested {revision.requestDate}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Original Budget</div>
                        <div className="font-medium">{formatCurrency(revision.originalBudget)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Revised Budget</div>
                        <div className="font-medium">{formatCurrency(revision.revisedBudget)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Change</div>
                        <div className="font-medium text-destructive">
                          +{formatCurrency(revision.revisedBudget - revision.originalBudget)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Reason: </span>
                        <span>{revision.reason}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Requested by: </span>
                          <span className="font-medium">{revision.requestedBy}</span>
                          <span className="text-muted-foreground"> • Approver: </span>
                          <span className="font-medium">{revision.approver}</span>
                        </div>
                        {revision.status === 'pending_approval' && (
                          <div className="space-x-2">
                            <Button size="sm" variant="outline">
                              Reject
                            </Button>
                            <Button size="sm">
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};