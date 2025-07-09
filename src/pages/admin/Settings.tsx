import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import RenewalNotificationPanel from '@/components/RenewalNotificationPanel';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Settings,
  Shield,
  Mail,
  Database,
  Globe,
  Bell,
  Lock,
  Save,
  RefreshCw
} from 'lucide-react';

interface SystemSettings {
  platformName: string;
  platformDescription: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailVerificationRequired: boolean;
  maxCompaniesPerUser: number;
  maxUsersPerCompany: number;
  defaultTrialDays: number;
  systemNotifications: boolean;
  backupEnabled: boolean;
  backupFrequency: string;
}

const AdminSettings = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<SystemSettings>({
    platformName: 'Build Desk',
    platformDescription: 'Construction Management Platform for SMB Contractors',
    supportEmail: 'support@builddesk.com',
    maintenanceMode: false,
    allowRegistration: true,
    emailVerificationRequired: false,
    maxCompaniesPerUser: 1,
    maxUsersPerCompany: 50,
    defaultTrialDays: 14,
    systemNotifications: true,
    backupEnabled: true,
    backupFrequency: 'daily'
  });
  
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

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
      loadSettings();
    }
  }, [user, userProfile, loading, navigate]);

  const loadSettings = async () => {
    try {
      setLoadingData(true);
      // In a real implementation, these would be loaded from a settings table
      // For now, we'll use defaults
      setLoadingData(false);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load settings"
      });
      setLoadingData(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // In a real implementation, these would be saved to a settings table
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="System Settings">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Configure platform-wide settings</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Content */}
        <div>
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
              <CardDescription>
                Basic platform configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => handleInputChange('platformName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="platformDescription">Platform Description</Label>
                <Textarea
                  id="platformDescription"
                  value={settings.platformDescription}
                  onChange={(e) => handleInputChange('platformDescription', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Access</span>
              </CardTitle>
              <CardDescription>
                Authentication and access control settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable new users to register for the platform
                  </p>
                </div>
                <Switch
                  checked={settings.allowRegistration}
                  onCheckedChange={(checked) => handleInputChange('allowRegistration', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Verification Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Require email verification for new accounts
                  </p>
                </div>
                <Switch
                  checked={settings.emailVerificationRequired}
                  onCheckedChange={(checked) => handleInputChange('emailVerificationRequired', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxCompanies">Max Companies per User</Label>
                  <Input
                    id="maxCompanies"
                    type="number"
                    min="1"
                    value={settings.maxCompaniesPerUser}
                    onChange={(e) => handleInputChange('maxCompaniesPerUser', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxUsers">Max Users per Company</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={settings.maxUsersPerCompany}
                    onChange={(e) => handleInputChange('maxUsersPerCompany', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Billing & Trials</span>
              </CardTitle>
              <CardDescription>
                Subscription and trial configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trialDays">Default Trial Period (Days)</Label>
                <Input
                  id="trialDays"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.defaultTrialDays}
                  onChange={(e) => handleInputChange('defaultTrialDays', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Number of days for new company trial periods
                </p>
              </div>
            </CardContent>
          </Card>

          {/* System Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Maintenance</span>
              </CardTitle>
              <CardDescription>
                Platform maintenance and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable platform access for maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send system alerts and notifications to admins
                  </p>
                </div>
                <Switch
                  checked={settings.systemNotifications}
                  onCheckedChange={(checked) => handleInputChange('systemNotifications', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automated database backups
                  </p>
                </div>
                <Switch
                  checked={settings.backupEnabled}
                  onCheckedChange={(checked) => handleInputChange('backupEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Email Notifications</span>
              </CardTitle>
              <CardDescription>
                Configure email notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">SMTP Configuration</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Email settings are configured through Supabase Auth settings.
                </p>
                <Button variant="outline" size="sm">
                  Configure SMTP Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          
          <RenewalNotificationPanel />

          {/* API Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>API Configuration</span>
              </CardTitle>
              <CardDescription>
                External API and integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">OpenAI Integration</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    API configuration managed via Supabase secrets
                  </p>
                  <Button variant="outline" size="sm">
                    Manage API Keys
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Stripe Integration</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Payment processing configuration
                  </p>
                  <Button variant="outline" size="sm">
                    Configure Stripe
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;