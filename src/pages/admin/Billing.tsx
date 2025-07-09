import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { gtag } from '@/hooks/useGoogleAnalytics';
import { 
  DollarSign,
  CreditCard,
  TrendingUp,
  Calendar,
  Search,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';

interface BillingData {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  trial_end_date: string;
  created_at: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  _revenue?: number;
}

const Billing = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [billingData, setBillingData] = useState<BillingData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<BillingData | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    churnRate: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only root administrators can access this page."
      });
      return;
    }
    
    if (userProfile?.role === 'root_admin') {
      loadBillingData();
      gtag.trackFeature('admin_billing', 'page_view');
    }
  }, [user, userProfile, loading, navigate]);

  const loadBillingData = async () => {
    try {
      setLoadingData(true);
      
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate estimated revenue based on subscription tiers
      const companiesWithRevenue = companies?.map(company => {
        let monthlyRevenue = 0;
        switch (company.subscription_tier) {
          case 'starter':
            monthlyRevenue = 149;
            break;
          case 'professional':
            monthlyRevenue = 299;
            break;
          case 'enterprise':
            monthlyRevenue = 599;
            break;
        }
        
        return {
          ...company,
          _revenue: company.subscription_status === 'active' ? monthlyRevenue : 0
        };
      }) || [];

      setBillingData(companiesWithRevenue);

      // Calculate analytics
      const totalMonthlyRevenue = companiesWithRevenue.reduce((sum, c) => sum + (c._revenue || 0), 0);
      const activeCount = companiesWithRevenue.filter(c => c.subscription_status === 'active').length;
      const trialCount = companiesWithRevenue.filter(c => c.subscription_status === 'trial').length;
      
      setAnalytics({
        totalRevenue: totalMonthlyRevenue * 12, // Annual estimate
        monthlyRevenue: totalMonthlyRevenue,
        activeSubscriptions: activeCount,
        trialUsers: trialCount,
        churnRate: 0 // Would need historical data to calculate
      });

    } catch (error: any) {
      console.error('Error loading billing data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load billing data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'trial':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Badge className="bg-purple-500">Enterprise - $599/mo</Badge>;
      case 'professional':
        return <Badge className="bg-blue-500">Professional - $299/mo</Badge>;
      case 'starter':
        return <Badge className="bg-gray-500">Starter - $149/mo</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  const filteredData = billingData.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || company.subscription_tier === filterTier;
    const matchesStatus = filterStatus === 'all' || company.subscription_status === filterStatus;
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  if (loading || loadingData) {
    return (
      <DashboardLayout title="Billing & Subscriptions" showTrialBanner={false}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading billing data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Billing & Subscriptions" showTrialBanner={false}>
      <div className="space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Estimated annual recurring revenue</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Current monthly recurring revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Paying customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.trialUsers}</div>
              <p className="text-xs text-muted-foreground">Free trial users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Revenue/Customer</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.activeSubscriptions > 0 ? Math.round(analytics.monthlyRevenue / analytics.activeSubscriptions) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Monthly average</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Billing Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>
              Detailed billing information for all companies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredData.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-4">
                    <Building2 className="h-10 w-10 text-construction-blue" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{company.name}</p>
                        {getTierBadge(company.subscription_tier)}
                        {getStatusBadge(company.subscription_status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Since {new Date(company.created_at).toLocaleDateString()}
                        </span>
                        {company.trial_end_date && company.subscription_status === 'trial' && (
                          <span className="flex items-center text-orange-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Trial ends {new Date(company.trial_end_date).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${company._revenue || 0}/month
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCompany(company);
                        setIsDetailDialogOpen(true);
                        gtag.trackFeature('admin_billing', 'view_company_details', 1);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}

              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Billing Data Found</h3>
                  <p className="text-muted-foreground">No companies match your current filters.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Billing Details</DialogTitle>
            <DialogDescription>
              Subscription and billing information for {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompany && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Company</Label>
                  <p className="text-sm font-medium">{selectedCompany.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Subscription Tier</Label>
                  <div>{getTierBadge(selectedCompany.subscription_tier)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedCompany.subscription_status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Monthly Revenue</Label>
                  <p className="text-sm font-medium">${selectedCompany._revenue || 0}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Customer Since</Label>
                  <p className="text-sm">{new Date(selectedCompany.created_at).toLocaleDateString()}</p>
                </div>
                {selectedCompany.trial_end_date && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Trial End Date</Label>
                    <p className="text-sm">{new Date(selectedCompany.trial_end_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Stripe Customer ID</Label>
                  <p className="text-sm font-mono text-xs">
                    {selectedCompany.stripe_customer_id || 'Not connected'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Stripe Subscription ID</Label>
                  <p className="text-sm font-mono text-xs">
                    {selectedCompany.stripe_subscription_id || 'Not connected'}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Revenue Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-construction-blue">
                      ${selectedCompany._revenue || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Monthly</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-construction-blue">
                      ${(selectedCompany._revenue || 0) * 12}
                    </p>
                    <p className="text-xs text-muted-foreground">Annual</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-construction-blue">
                      {Math.floor((new Date().getTime() - new Date(selectedCompany.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </p>
                    <p className="text-xs text-muted-foreground">Days Active</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Billing;