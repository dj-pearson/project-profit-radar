import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  Copy,
  RefreshCw,
  Globe,
  Crown,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Link } from 'react-router-dom';

interface TenantData {
  id: string;
  name: string;
  custom_domain: string | null;
  domain_verified: boolean | null;
  plan_tier: string;
  features: {
    white_label?: boolean;
    custom_domain?: boolean;
  };
}

export const CustomDomain = () => {
  const { user, userProfile } = useAuth();
  const { tenant: currentTenant, resolveTenant } = useTenant();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTenantData();
  }, [userProfile]);

  const loadTenantData = async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get company's tenant
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('tenant_id')
        .eq('id', userProfile.company_id)
        .single();

      if (companyError || !company?.tenant_id) {
        console.error('No tenant found for company');
        setLoading(false);
        return;
      }

      // Get tenant details
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, custom_domain, domain_verified, plan_tier, features')
        .eq('id', company.tenant_id)
        .single();

      if (tenantError) throw tenantError;

      setTenantData(tenant as TenantData);
      setCustomDomainInput(tenant?.custom_domain || '');
    } catch (error) {
      console.error('Failed to load tenant data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load domain configuration.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomDomain = async () => {
    if (!tenantData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          custom_domain: customDomainInput || null,
          domain_verified: false, // Reset verification when domain changes
        })
        .eq('id', tenantData.id);

      if (error) throw error;

      toast({
        title: 'Domain Saved',
        description: 'Custom domain has been updated. Please verify DNS configuration.',
      });

      // Reload tenant data
      await loadTenantData();

      // Reload tenant context to pick up changes
      await resolveTenant();
    } catch (error) {
      console.error('Failed to save domain:', error);
      toast({
        title: 'Error',
        description: 'Failed to save custom domain.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!tenantData?.custom_domain) return;

    setVerifyingDomain(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: {
          tenant_id: tenantData.id,
          domain: tenantData.custom_domain,
        },
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: 'Domain Verified',
          description: 'Your custom domain has been successfully verified!',
        });
        await loadTenantData();
        await resolveTenant();
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
      description: 'Copied to clipboard',
    });
  };

  // Check if user has permission (admin or owner role)
  const hasPermission = userProfile?.role === 'admin' || userProfile?.role === 'root_admin';

  // Check if on Enterprise tier
  const isEnterpriseTier = tenantData?.plan_tier === 'enterprise' || tenantData?.plan_tier === 'white_label';

  if (loading) {
    return (
      <DashboardLayout title="Custom Domain">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Globe className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading domain settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Permission check
  if (!hasPermission) {
    return (
      <DashboardLayout title="Custom Domain">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can configure custom domains. Please contact your company administrator.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  // Enterprise tier check
  if (!isEnterpriseTier) {
    return (
      <DashboardLayout title="Custom Domain">
        <Card className="border-construction-orange">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-construction-orange" />
                  Upgrade to Enterprise
                </CardTitle>
                <CardDescription>
                  Custom domains are available on the Enterprise plan
                </CardDescription>
              </div>
              <Badge className="bg-purple-500 text-white">Enterprise Feature</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Enterprise Plan Includes:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Custom domain support (e.g., app.yourcompany.com)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  White-label branding (logo, colors, favicon)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Unlimited users and projects
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Dedicated success manager
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  24/7 priority support
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="hero" asChild className="flex-1">
                <Link to="/pricing">
                  View Pricing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <a href="mailto:sales@builddesk.com">Contact Sales</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Main content for Enterprise users
  return (
    <DashboardLayout title="Custom Domain">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-construction-dark flex items-center gap-3">
            <Globe className="w-8 h-8 text-construction-orange" />
            Custom Domain
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your custom domain to white-label your BuildDesk experience
          </p>
        </div>

        {/* Current Status */}
        {tenantData?.custom_domain && (
          <Alert className={tenantData.domain_verified ? 'border-green-500' : 'border-yellow-500'}>
            {tenantData.domain_verified ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Domain Verified</AlertTitle>
                <AlertDescription>
                  Your custom domain <strong>{tenantData.custom_domain}</strong> is active and verified.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle>Awaiting Verification</AlertTitle>
                <AlertDescription>
                  Your domain <strong>{tenantData.custom_domain}</strong> is configured but not yet verified.
                  Please ensure DNS records are properly configured and click "Verify Domain" below.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Domain Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Domain Configuration</CardTitle>
            <CardDescription>
              Enter your custom domain to use instead of builddesk.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex gap-2">
              <Button
                onClick={handleSaveCustomDomain}
                disabled={saving || !customDomainInput}
              >
                {saving ? 'Saving...' : 'Save Domain'}
              </Button>
              {tenantData?.custom_domain && !tenantData.domain_verified && (
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
            </div>
          </CardContent>
        </Card>

        {/* DNS Configuration Instructions */}
        {customDomainInput && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">DNS Configuration Instructions</CardTitle>
              <CardDescription>
                Add the following DNS record to your domain registrar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background p-4 rounded border space-y-3">
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

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Next Steps:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                  <li>Navigate to DNS settings for your domain</li>
                  <li>Add a new CNAME record with the values above</li>
                  <li>Wait for DNS propagation (can take 24-48 hours)</li>
                  <li>Return here and click "Verify Domain"</li>
                  <li>Once verified, your custom domain will be active</li>
                </ol>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Notes</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p>• SSL certificates are automatically provisioned via Cloudflare</p>
                  <p>• DNS changes typically propagate within 1-4 hours</p>
                  <p>• You can use the "Verify Domain" button to check status anytime</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              If you encounter issues configuring your custom domain, our support team is here to help.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:support@builddesk.com">Email Support</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/help">View Documentation</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomDomain;
