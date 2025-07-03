import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
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

const Companies = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Companies</h1>
                <p className="text-sm text-muted-foreground">Manage all registered organizations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                      onClick={() => {
                        setSelectedCompany(company);
                        setIsDetailDialogOpen(true);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompany && (
            <div className="space-y-6">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Companies;