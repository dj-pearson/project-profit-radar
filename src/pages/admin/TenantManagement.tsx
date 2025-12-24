import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Users,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Search,
  Crown,
  Shield,
  Globe,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  subscription_status: string;
  max_users: number;
  max_projects: number;
  is_active: boolean;
  created_at: string;
  custom_domain: string | null;
  domain_verified: boolean | null;
  user_count?: number;
  project_count?: number;
}

interface TenantStats {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  enterprise_tenants: number;
}

export const TenantManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    setLoading(true);
    try {
      // Load all tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Load user counts for each tenant with proper error handling
      const tenantsWithCounts = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          try {
            const { count: userCount, error } = await supabase
              .from('tenant_users')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', tenant.id)
              .eq('is_active', true);

            if (error) {
              console.error(`Error fetching user count for tenant ${tenant.id}:`, error);
            }

            return {
              ...tenant,
              user_count: userCount || 0,
              project_count: 0, // TODO: Add actual project count
            };
          } catch (error) {
            console.error(`Error processing tenant ${tenant.id}:`, error);
            // Return tenant with zero counts on error to prevent data loss
            return {
              ...tenant,
              user_count: 0,
              project_count: 0,
            };
          }
        })
      );

      setTenants(tenantsWithCounts);

      // Calculate stats
      const totalTenants = tenantsWithCounts.length;
      const activeTenants = tenantsWithCounts.filter(t => t.subscription_status === 'active').length;
      const trialTenants = tenantsWithCounts.filter(t => t.subscription_status === 'trial').length;
      const enterpriseTenants = tenantsWithCounts.filter(t => t.plan_tier === 'enterprise').length;

      setStats({
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        trial_tenants: trialTenants,
        enterprise_tenants: enterpriseTenants,
      });
    } catch (error) {
      console.error('Failed to load tenant data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tenant data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadge = (plan: string) => {
    const config = {
      starter: { color: 'bg-gray-500', label: 'Starter' },
      professional: { color: 'bg-blue-500', label: 'Professional' },
      enterprise: { color: 'bg-purple-500', label: 'Enterprise' },
      white_label: { color: 'bg-gold-500', label: 'White Label' },
    };

    const { color, label } = config[plan as keyof typeof config] || config.starter;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      trial: { color: 'bg-yellow-500', label: 'Trial', icon: AlertCircle },
      active: { color: 'bg-green-500', label: 'Active', icon: CheckCircle },
      suspended: { color: 'bg-red-500', label: 'Suspended', icon: AlertCircle },
      cancelled: { color: 'bg-gray-500', label: 'Cancelled', icon: AlertCircle },
    };

    const { color, label, icon: Icon } = config[status as keyof typeof config] || config.trial;
    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const handleOpenDomainDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setCustomDomainInput(tenant.custom_domain || '');
    setDomainDialogOpen(true);
  };

  const handleSaveCustomDomain = async () => {
    if (!selectedTenant) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          custom_domain: customDomainInput || null,
          domain_verified: false, // Reset verification status when domain changes
        })
        .eq('id', selectedTenant.id);

      if (error) throw error;

      toast({
        title: 'Domain Updated',
        description: 'Custom domain has been saved. Please verify DNS configuration.',
      });

      setDomainDialogOpen(false);
      loadTenantData();
    } catch (error) {
      console.error('Failed to update domain:', error);
      toast({
        title: 'Error',
        description: 'Failed to update custom domain.',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyDomain = async () => {
    if (!selectedTenant?.custom_domain) return;

    setVerifyingDomain(true);
    try {
      // Call edge function to verify DNS
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: {
          tenant_id: selectedTenant.id,
          domain: selectedTenant.custom_domain,
        },
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: 'Domain Verified',
          description: 'Custom domain has been successfully verified!',
        });
        loadTenantData();
      } else {
        toast({
          title: 'Verification Failed',
          description: data?.message || 'Unable to verify domain. Please check DNS configuration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Domain verification error:', error);
      toast({
        title: 'Verification Error',
        description: 'Failed to verify domain. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingDomain(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'DNS record copied to clipboard',
    });
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Tenant Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading tenants...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tenant Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark">Tenant Management</h1>
            <p className="text-muted-foreground">
              Manage multi-tenant organizations and subscriptions
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Tenant
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                  <p className="text-2xl font-bold mt-2">{stats?.total_tenants || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold mt-2">{stats?.active_tenants || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trial</p>
                  <p className="text-2xl font-bold mt-2">{stats?.trial_tenants || 0}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Enterprise</p>
                  <p className="text-2xl font-bold mt-2">{stats?.enterprise_tenants || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tenants List */}
        <div className="space-y-3">
          {filteredTenants.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tenants found</p>
              </CardContent>
            </Card>
          ) : (
            filteredTenants.map((tenant) => (
              <Card key={tenant.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{tenant.name}</h3>
                        {getPlanBadge(tenant.plan_tier)}
                        {getStatusBadge(tenant.subscription_status)}
                        {!tenant.is_active && (
                          <Badge className="bg-red-500 text-white">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Slug: {tenant.slug}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Users</p>
                      <p className="font-semibold">
                        {tenant.user_count} / {tenant.max_users}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Projects</p>
                      <p className="font-semibold">
                        {tenant.project_count} / {tenant.max_projects}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-semibold capitalize">{tenant.plan_tier}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Custom Domain</p>
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-xs truncate">
                          {tenant.custom_domain || 'Not set'}
                        </p>
                        {tenant.custom_domain && (
                          tenant.domain_verified ? (
                            <CheckCircle className="w-3 h-3 text-green-600" title="Verified" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-yellow-600" title="Not verified" />
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-semibold">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDomainDialog(tenant)}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Domain
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                    <Button size="sm" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Usage
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Domain Configuration Dialog */}
        <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Custom Domain Configuration</DialogTitle>
              <DialogDescription>
                Configure a custom domain for {selectedTenant?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Custom Domain Input */}
              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  placeholder="app.yourcompany.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the domain without http:// or https://
                </p>
              </div>

              {/* DNS Configuration Instructions */}
              {customDomainInput && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">DNS Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Add the following DNS record to your domain registrar:
                    </p>

                    <div className="bg-background p-3 rounded border space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Type</p>
                          <p className="font-mono text-sm">CNAME</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('CNAME')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Name</p>
                          <p className="font-mono text-sm">{customDomainInput.split('.')[0]}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(customDomainInput.split('.')[0])}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-muted-foreground">Value</p>
                          <p className="font-mono text-sm break-all">
                            builddesk.pearsonperformance.workers.dev
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('builddesk.pearsonperformance.workers.dev')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• DNS changes can take up to 24-48 hours to propagate</p>
                      <p>• After adding the DNS record, click "Verify Domain" below</p>
                      <p>• SSL certificate will be automatically provisioned via Cloudflare</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Status */}
              {selectedTenant?.custom_domain && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded">
                  {selectedTenant.domain_verified ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-sm">Domain Verified</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedTenant.custom_domain} is active
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-sm">Awaiting Verification</p>
                        <p className="text-xs text-muted-foreground">
                          DNS records not yet verified
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {selectedTenant?.custom_domain && !selectedTenant.domain_verified && (
                <Button
                  variant="outline"
                  onClick={handleVerifyDomain}
                  disabled={verifyingDomain}
                >
                  {verifyingDomain ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Verify Domain
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={() => setDomainDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCustomDomain}>
                Save Domain
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TenantManagement;
