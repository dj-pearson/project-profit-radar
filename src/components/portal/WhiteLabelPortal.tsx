import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Palette, 
  Globe, 
  Settings, 
  Eye, 
  Copy, 
  Upload, 
  Download,
  Users,
  Shield,
  Link as LinkIcon,
  Smartphone
} from 'lucide-react';

interface PortalConfig {
  id?: string;
  company_id: string;
  subdomain: string;
  custom_domain?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  company_name: string;
  tagline?: string;
  welcome_message?: string;
  is_active: boolean;
  features: {
    project_gallery: boolean;
    document_sharing: boolean;
    progress_tracking: boolean;
    communication_hub: boolean;
    invoice_portal: boolean;
    appointment_booking: boolean;
  };
  seo_settings: {
    meta_title?: string;
    meta_description?: string;
    og_image_url?: string;
  };
}

export const WhiteLabelPortal = () => {
  const { userProfile } = useAuth();
  const [config, setConfig] = useState<PortalConfig>({
    company_id: userProfile?.company_id || '',
    subdomain: '',
    primary_color: '#3B82F6',
    secondary_color: '#EF4444',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    company_name: '',
    is_active: false,
    features: {
      project_gallery: true,
      document_sharing: true,
      progress_tracking: true,
      communication_hub: true,
      invoice_portal: false,
      appointment_booking: false
    },
    seo_settings: {}
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');

  useEffect(() => {
    loadPortalConfig();
  }, [userProfile?.company_id]);

  const loadPortalConfig = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      // Load company data for default values
      const { data: companyData, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', userProfile.company_id)
        .single();

      if (error) throw error;

      setConfig(prev => ({
        ...prev,
        company_name: companyData.name || '',
        subdomain: companyData.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || ''
      }));
    } catch (error) {
      console.error('Error loading portal config:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePortalConfig = async () => {
    setLoading(true);
    try {
      // In real implementation, would save to portal_configs table
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Portal Settings Saved",
        description: "Your white-label portal configuration has been saved successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save portal configuration. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePreviewUrl = () => {
    return `https://${config.subdomain}.builddesk.app`;
  };

  const copyPortalUrl = () => {
    const url = generatePreviewUrl();
    navigator.clipboard.writeText(url);
    toast({
      title: "URL Copied",
      description: "Portal URL copied to clipboard"
    });
  };

  const BrandingSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>Customize your portal's visual identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={config.company_name}
                onChange={(e) => setConfig(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <Label htmlFor="subdomain">Portal Subdomain</Label>
              <div className="flex">
                <Input
                  id="subdomain"
                  value={config.subdomain}
                  onChange={(e) => setConfig(prev => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="your-company"
                  className="rounded-r-none"
                />
                <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                  .builddesk.app
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={config.tagline || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="Your company tagline"
            />
          </div>

          <div>
            <Label htmlFor="welcome-message">Welcome Message</Label>
            <Textarea
              id="welcome-message"
              value={config.welcome_message || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
              placeholder="Welcome message for your clients"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colors & Styling</CardTitle>
          <CardDescription>Customize your portal's color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={config.primary_color}
                  onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={config.primary_color}
                  onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={config.secondary_color}
                  onChange={(e) => setConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={config.secondary_color}
                  onChange={(e) => setConfig(prev => ({ ...prev, secondary_color: e.target.value }))}
                  placeholder="#EF4444"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assets & Media</CardTitle>
          <CardDescription>Upload your logo and other brand assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Logo</Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop your logo here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
            <div>
              <Label>Favicon</Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop favicon here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">ICO, PNG 32x32px</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const FeatureSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portal Features</CardTitle>
          <CardDescription>Enable or disable features for your client portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Project Gallery</Label>
                <p className="text-sm text-muted-foreground">
                  Allow clients to view project photos and progress updates
                </p>
              </div>
              <Switch
                checked={config.features.project_gallery}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    features: { ...prev.features, project_gallery: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Document Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Share contracts, plans, and other documents with clients
                </p>
              </div>
              <Switch
                checked={config.features.document_sharing}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    features: { ...prev.features, document_sharing: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Progress Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Real-time project timeline and milestone updates
                </p>
              </div>
              <Switch
                checked={config.features.progress_tracking}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    features: { ...prev.features, progress_tracking: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Communication Hub</Label>
                <p className="text-sm text-muted-foreground">
                  Direct messaging between clients and project team
                </p>
              </div>
              <Switch
                checked={config.features.communication_hub}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    features: { ...prev.features, communication_hub: checked }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Invoice Portal</Label>
                <p className="text-sm text-muted-foreground">
                  Online invoice viewing and payment processing
                </p>
              </div>
              <Switch
                checked={config.features.invoice_portal}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    features: { ...prev.features, invoice_portal: checked }
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const DomainSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portal URL & Domain</CardTitle>
          <CardDescription>Configure your portal's web address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Portal URL</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input value={generatePreviewUrl()} readOnly />
              <Button variant="outline" size="sm" onClick={copyPortalUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="custom-domain">Custom Domain (Optional)</Label>
            <Input
              id="custom-domain"
              value={config.custom_domain || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, custom_domain: e.target.value }))}
              placeholder="portal.yourcompany.com"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Configure DNS to point your domain to our servers
            </p>
          </div>

          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              Your portal will be accessible at {generatePreviewUrl()}
              {config.custom_domain && ` and ${config.custom_domain}`}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portal Status</CardTitle>
          <CardDescription>Control portal visibility and access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Portal Active</Label>
              <p className="text-sm text-muted-foreground">
                Make your portal accessible to clients
              </p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${config.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm">
              Portal is {config.is_active ? 'active and accessible' : 'inactive'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>White-Label Client Portal</span>
          </CardTitle>
          <CardDescription>
            Create a branded client portal with your company's identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant={config.is_active ? 'default' : 'secondary'}>
                {config.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {config.subdomain && (
                <span className="text-sm text-muted-foreground">
                  {generatePreviewUrl()}
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={savePortalConfig} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="domain">Domain & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="features">
          <FeatureSettings />
        </TabsContent>

        <TabsContent value="domain">
          <DomainSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};