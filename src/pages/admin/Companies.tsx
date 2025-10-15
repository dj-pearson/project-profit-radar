import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Building2,
  Users,
  Calendar,
  DollarSign,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  address: string;
  industry_type: string;
  company_size: string;
  subscription_tier: string;
  subscription_status: string;
  trial_end_date: string;
  created_at: string;
  _count?: {
    users: number;
    projects: number;
  };
}

interface CompanySettings {
  id: string;
  company_id: string;
  enable_project_management: boolean;
  enable_time_tracking: boolean;
  enable_financial_management: boolean;
  enable_document_management: boolean;
  enable_crm: boolean;
  enable_safety_management: boolean;
  enable_mobile_access: boolean;
  enable_reporting: boolean;
  email_notifications: boolean;
  project_update_notifications: boolean;
  due_date_reminders: boolean;
  safety_alerts: boolean;
  company_logo: string | null;
  primary_color: string;
  default_project_view: string;
  default_working_hours: string;
  time_zone: string;
  fiscal_year_start: string;
  default_markup: number;
}

const Companies = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCompanySettings, setSelectedCompanySettings] = useState<CompanySettings | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

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
      loadCompanies();
    }
  }, [user, userProfile, loading, navigate]);

  const loadCompanies = async () => {
    try {
      setLoadingData(true);
      
      // Load companies with user and project counts
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          *,
          user_profiles!inner(count),
          projects!inner(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user counts for each company
      const companiesWithCounts = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { count: userCount } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          return {
            ...company,
            _count: {
              users: userCount || 0,
              projects: projectCount || 0
            }
          };
        })
      );

      setCompanies(companiesWithCounts);
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load companies"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const loadCompanySettings = async (companyId: string) => {
    try {
      setLoadingSettings(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Error loading company settings:', error);
        setSelectedCompanySettings(null);
        return;
      }

      setSelectedCompanySettings(data);
    } catch (error: any) {
      console.error('Error loading company settings:', error);
      setSelectedCompanySettings(null);
    } finally {
      setLoadingSettings(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Badge className="bg-purple-500">Enterprise</Badge>;
      case 'professional':
        return <Badge className="bg-blue-500">Professional</Badge>;
      case 'starter':
        return <Badge className="bg-gray-500">Starter</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || company.subscription_status === filterStatus;
    const matchesTier = filterTier === 'all' || company.subscription_tier === filterTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  if (loading || loadingData) {
    return (
      <DashboardLayout title="Companies" showTrialBanner={false}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ROOT_ADMIN}>
      <DashboardLayout title="Companies" showTrialBanner={false}>
        <div className="space-y-6">
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
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
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
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <div className="flex space-x-1">
                    {getStatusBadge(company.subscription_status)}
                    {getTierBadge(company.subscription_tier)}
                  </div>
                </div>
                <CardDescription>
                  {company.industry_type?.replace('_', ' ').toUpperCase()} • {company.company_size}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      Users
                    </span>
                    <span className="font-medium">{company._count?.users || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Building2 className="h-4 w-4 mr-1" />
                      Projects
                    </span>
                    <span className="font-medium">{company._count?.projects || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created
                    </span>
                    <span className="font-medium">
                      {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                     <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setSelectedCompany(company);
                        setIsDetailDialogOpen(true);
                        await loadCompanySettings(company.id);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Companies Found</h3>
              <p className="text-muted-foreground">No companies match your current filters.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Company Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>
              Detailed information and settings for {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompany && (
            <div className="space-y-6">
              {/* Basic Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Company Name</Label>
                  <p className="text-sm font-medium">{selectedCompany.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Industry</Label>
                  <p className="text-sm">{selectedCompany.industry_type?.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Company Size</Label>
                  <p className="text-sm">{selectedCompany.company_size}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Subscription</Label>
                  <div className="flex space-x-2">
                    {getTierBadge(selectedCompany.subscription_tier)}
                    {getStatusBadge(selectedCompany.subscription_status)}
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                <p className="text-sm">{selectedCompany.address || 'Not provided'}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-construction-blue">
                    {selectedCompany._count?.users || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-construction-blue">
                    {selectedCompany._count?.projects || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-construction-blue">
                    {Math.floor((new Date().getTime() - new Date(selectedCompany.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                  </p>
                  <p className="text-sm text-muted-foreground">Days Active</p>
                </div>
              </div>
              
              {selectedCompany.trial_end_date && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trial End Date</Label>
                  <p className="text-sm">
                    {new Date(selectedCompany.trial_end_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Company Settings */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Company Settings</h3>
                {loadingSettings ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-blue mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                  </div>
                ) : selectedCompanySettings ? (
                  <div className="space-y-6">
                    {/* Feature Toggles */}
                    <div>
                      <h4 className="text-md font-medium mb-3 text-muted-foreground">Enabled Features</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { key: 'enable_project_management', label: 'Project Management' },
                          { key: 'enable_time_tracking', label: 'Time Tracking' },
                          { key: 'enable_financial_management', label: 'Financial Management' },
                          { key: 'enable_document_management', label: 'Document Management' },
                          { key: 'enable_crm', label: 'CRM' },
                          { key: 'enable_safety_management', label: 'Safety Management' },
                          { key: 'enable_mobile_access', label: 'Mobile Access' },
                          { key: 'enable_reporting', label: 'Reporting' }
                        ].map(feature => (
                          <div key={feature.key} className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              selectedCompanySettings[feature.key as keyof CompanySettings] 
                                ? 'bg-green-500' 
                                : 'bg-gray-300'
                            }`} />
                            <span className="text-sm">{feature.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notification Settings */}
                    <div>
                      <h4 className="text-md font-medium mb-3 text-muted-foreground">Notification Settings</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'email_notifications', label: 'Email Notifications' },
                          { key: 'project_update_notifications', label: 'Project Updates' },
                          { key: 'due_date_reminders', label: 'Due Date Reminders' },
                          { key: 'safety_alerts', label: 'Safety Alerts' }
                        ].map(setting => (
                          <div key={setting.key} className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              selectedCompanySettings[setting.key as keyof CompanySettings] 
                                ? 'bg-green-500' 
                                : 'bg-gray-300'
                            }`} />
                            <span className="text-sm">{setting.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Business Settings */}
                    <div>
                      <h4 className="text-md font-medium mb-3 text-muted-foreground">Business Configuration</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Working Hours</Label>
                          <p className="text-sm">{selectedCompanySettings.default_working_hours}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Time Zone</Label>
                          <p className="text-sm">{selectedCompanySettings.time_zone}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Fiscal Year Start</Label>
                          <p className="text-sm">{selectedCompanySettings.fiscal_year_start}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Default Markup</Label>
                          <p className="text-sm">{selectedCompanySettings.default_markup}%</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Default Project View</Label>
                          <p className="text-sm capitalize">{selectedCompanySettings.default_project_view}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Primary Color</Label>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: selectedCompanySettings.primary_color }}
                            />
                            <p className="text-sm">{selectedCompanySettings.primary_color}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No settings configured for this company</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </RoleGuard>
  );
};

export default Companies;