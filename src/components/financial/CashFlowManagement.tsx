import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CashFlowManagement = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Mock data for cash flow management
  const paymentApplications = [
    {
      id: '1',
      project: 'Downtown Office Complex',
      applicationNumber: 'PA-2025-001',
      amount: 125000,
      status: 'pending_approval',
      dueDate: '2025-01-15',
      retentionAmount: 12500,
      workCompleted: 85
    },
    {
      id: '2',
      project: 'Residential Towers Phase 2',
      applicationNumber: 'PA-2025-002',
      amount: 89000,
      status: 'approved',
      dueDate: '2025-01-20',
      retentionAmount: 8900,
      workCompleted: 92
    }
  ];

  const retentionReleases = [
    {
      id: '1',
      project: 'Medical Center Renovation',
      amount: 45000,
      releaseDate: '2025-02-01',
      status: 'ready_for_release',
      finalInspection: true
    },
    {
      id: '2',
      project: 'Shopping Mall Upgrade',
      amount: 32000,
      releaseDate: '2025-02-15',
      status: 'pending_final_inspection',
      finalInspection: false
    }
  ];

  const subcontractorPayments = [
    {
      id: '1',
      company: 'Elite Electrical Services',
      amount: 24500,
      dueDate: '2025-01-12',
      status: 'scheduled',
      project: 'Downtown Office Complex'
    },
    {
      id: '2',
      company: 'Premier Plumbing Co.',
      amount: 18900,
      dueDate: '2025-01-18',
      status: 'pending_approval',
      project: 'Residential Towers Phase 2'
    }
  ];

  const cashFlowForecast = [
    { period: 'Week 1', inflow: 125000, outflow: 89000, net: 36000 },
    { period: 'Week 2', inflow: 89000, outflow: 112000, net: -23000 },
    { period: 'Week 3', inflow: 156000, outflow: 78000, net: 78000 },
    { period: 'Week 4', inflow: 95000, outflow: 143000, net: -48000 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending_approval': return 'outline';
      case 'ready_for_release': return 'default';
      case 'pending_final_inspection': return 'secondary';
      case 'scheduled': return 'outline';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cash Flow Management</h2>
          <p className="text-muted-foreground">
            Monitor payment applications, retention releases, and cash flow forecasting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            New Payment Application
          </Button>
        </div>
      </div>

      {/* Cash Flow Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(389000)}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Held</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(77000)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(45000)} ready for release</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30-Day Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(43000)}</div>
            <p className="text-xs text-success">Positive cash flow projected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">2</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(68000)} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Payment Applications</TabsTrigger>
          <TabsTrigger value="retention">Retention Releases</TabsTrigger>
          <TabsTrigger value="subcontractors">Subcontractor Payments</TabsTrigger>
          <TabsTrigger value="forecast">Cash Flow Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Payment Applications</CardTitle>
              <CardDescription>
                Track and manage payment applications across all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{app.project}</h4>
                        <Badge variant={getStatusColor(app.status)}>
                          {app.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Application {app.applicationNumber} • Due {app.dueDate}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Work Completed: {app.workCompleted}%</span>
                        <Progress value={app.workCompleted} className="w-20" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(app.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        Retention: {formatCurrency(app.retentionAmount)}
                      </div>
                      <Button size="sm" className="mt-2">
                        Review Application
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle>Retention Releases</CardTitle>
              <CardDescription>
                Monitor retention amounts ready for release
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {retentionReleases.map((retention) => (
                  <div key={retention.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{retention.project}</h4>
                        <Badge variant={getStatusColor(retention.status)}>
                          {retention.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Release Date: {retention.releaseDate}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span>Final Inspection:</span>
                        {retention.finalInspection ? (
                          <Badge variant="default">Complete</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(retention.amount)}</div>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        disabled={!retention.finalInspection}
                      >
                        {retention.finalInspection ? 'Process Release' : 'Schedule Inspection'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcontractors">
          <Card>
            <CardHeader>
              <CardTitle>Subcontractor Payments</CardTitle>
              <CardDescription>
                Schedule and track subcontractor payment processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subcontractorPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{payment.company}</h4>
                        <Badge variant={getStatusColor(payment.status)}>
                          {payment.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.project} • Due {payment.dueDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      <Button size="sm" className="mt-2">
                        Process Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Forecast</CardTitle>
              <CardDescription>
                Project cash flow based on payment schedules and project milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cashFlowForecast.map((period, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{period.period}</div>
                      <div className="text-sm text-muted-foreground">Forecast Period</div>
                    </div>
                    <div>
                      <div className="font-medium text-success">{formatCurrency(period.inflow)}</div>
                      <div className="text-sm text-muted-foreground">Expected Inflow</div>
                    </div>
                    <div>
                      <div className="font-medium text-destructive">{formatCurrency(period.outflow)}</div>
                      <div className="text-sm text-muted-foreground">Planned Outflow</div>
                    </div>
                    <div>
                      <div className={`font-medium ${period.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(period.net)}
                      </div>
                      <div className="text-sm text-muted-foreground">Net Cash Flow</div>
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