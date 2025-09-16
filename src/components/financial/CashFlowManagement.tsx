import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface PaymentApplication {
  id: string;
  application_number: string;
  total_earned: number;
  current_payment_due: number;
  retention_amount: number;
  status: string;
  period_ending: string;
  work_completed_to_date: number;
  project_name: string;
}

interface RetentionRelease {
  id: string;
  client_name: string;
  retention_amount: number;
  amount_pending: number;
  release_date: string | null;
  status: string;
  project_name?: string;
}

interface SubcontractorPayment {
  id: string;
  subcontractor_name: string;
  amount: number;
  net_amount: number;
  due_date: string;
  status: string;
  project_name?: string;
}

interface CashFlowSummary {
  totalOutstanding: number;
  retentionHeld: number;
  retentionReady: number;
  netForecast: number;
  overdueCount: number;
  overdueAmount: number;
}

export const CashFlowManagement = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [paymentApplications, setPaymentApplications] = useState<PaymentApplication[]>([]);
  const [retentionReleases, setRetentionReleases] = useState<RetentionRelease[]>([]);
  const [subcontractorPayments, setSubcontractorPayments] = useState<SubcontractorPayment[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary>({
    totalOutstanding: 0,
    retentionHeld: 0,
    retentionReady: 0,
    netForecast: 0,
    overdueCount: 0,
    overdueAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadCashFlowData = async () => {
    if (!user) return;

    try {
      // Using fallback data until migration is approved
      const fallbackApplications: PaymentApplication[] = [
        {
          id: '1',
          application_number: 'PA-2025-001',
          total_earned: 125000,
          current_payment_due: 112500,
          retention_amount: 12500,
          status: 'submitted',
          period_ending: '2025-01-15',
          work_completed_to_date: 85,
          project_name: 'Downtown Office Complex'
        },
        {
          id: '2',
          application_number: 'PA-2025-002',
          total_earned: 89000,
          current_payment_due: 80100,
          retention_amount: 8900,
          status: 'approved',
          period_ending: '2025-01-20',
          work_completed_to_date: 92,
          project_name: 'Residential Towers Phase 2'
        }
      ];

      const fallbackRetention: RetentionRelease[] = [
        {
          id: '1',
          client_name: 'Medical Center LLC',
          retention_amount: 45000,
          amount_pending: 45000,
          release_date: '2025-02-01',
          status: 'active',
          project_name: 'Medical Center Renovation'
        },
        {
          id: '2',
          client_name: 'Shopping Mall Corp',
          retention_amount: 32000,
          amount_pending: 32000,
          release_date: '2025-02-15',
          status: 'pending',
          project_name: 'Shopping Mall Upgrade'
        }
      ];

      const fallbackPayments: SubcontractorPayment[] = [
        {
          id: '1',
          subcontractor_name: 'Elite Electrical Services',
          amount: 24500,
          net_amount: 22050,
          due_date: '2025-01-12',
          status: 'approved',
          project_name: 'Downtown Office Complex'
        },
        {
          id: '2',
          subcontractor_name: 'Premier Plumbing Co.',
          amount: 18900,
          net_amount: 17010,
          due_date: '2025-01-18',
          status: 'pending',
          project_name: 'Residential Towers Phase 2'
        }
      ];

      setPaymentApplications(fallbackApplications);
      setRetentionReleases(fallbackRetention);
      setSubcontractorPayments(fallbackPayments);

      // Calculate summary
      const totalOutstanding = fallbackApplications.reduce((sum, app) => sum + app.current_payment_due, 0);
      const retentionHeld = fallbackRetention.reduce((sum, ret) => sum + ret.retention_amount, 0);
      const retentionReady = fallbackRetention.filter(ret => ret.status === 'active').reduce((sum, ret) => sum + ret.amount_pending, 0);
      
      setSummary({
        totalOutstanding,
        retentionHeld,
        retentionReady,
        netForecast: totalOutstanding + retentionReady,
        overdueCount: 2,
        overdueAmount: 68000
      });

    } catch (error) {
      console.error('Error loading cash flow data:', error);
      toast({
        title: "Error",
        description: "Failed to load cash flow data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashFlowData();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'submitted': return 'outline';
      case 'draft': return 'secondary';
      case 'active': return 'default';
      case 'pending': return 'outline';
      case 'paid': return 'default';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Payment applications pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Held</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.retentionHeld)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(summary.retentionReady)} ready for release</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30-Day Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.netForecast)}</div>
            <p className={`text-xs ${summary.netForecast >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.netForecast >= 0 ? 'Positive' : 'Negative'} cash flow projected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overdueCount}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(summary.overdueAmount)} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Payment Applications</TabsTrigger>
          <TabsTrigger value="retention">Retention Releases</TabsTrigger>
          <TabsTrigger value="subcontractors">Subcontractor Payments</TabsTrigger>
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
                {paymentApplications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payment applications found. Create a new application to get started.
                  </p>
                ) : (
                  paymentApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{app.project_name}</h4>
                          <Badge variant={getStatusColor(app.status)}>
                            {app.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Application {app.application_number} • Period ending {new Date(app.period_ending).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Work Completed: {app.work_completed_to_date}%</span>
                          <Progress value={app.work_completed_to_date} className="w-20" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(app.current_payment_due)}</div>
                        <div className="text-sm text-muted-foreground">
                          Retention: {formatCurrency(app.retention_amount)}
                        </div>
                        <Button size="sm" className="mt-2">
                          Review Application
                        </Button>
                      </div>
                    </div>
                  ))
                )}
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
                {retentionReleases.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No retention releases found.
                  </p>
                ) : (
                  retentionReleases.map((retention) => (
                    <div key={retention.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{retention.project_name || retention.client_name}</h4>
                          <Badge variant={getStatusColor(retention.status)}>
                            {retention.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Release Date: {retention.release_date ? new Date(retention.release_date).toLocaleDateString() : 'Not scheduled'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(retention.amount_pending)}</div>
                        <Button size="sm" className="mt-2">
                          Process Release
                        </Button>
                      </div>
                    </div>
                  ))
                )}
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
                {subcontractorPayments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No subcontractor payments found.
                  </p>
                ) : (
                  subcontractorPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{payment.subcontractor_name}</h4>
                          <Badge variant={getStatusColor(payment.status)}>
                            {payment.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payment.project_name || 'No project linked'} • Due {new Date(payment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(payment.net_amount)}</div>
                        <Button size="sm" className="mt-2">
                          Process Payment
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};