import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Bell, Mail, Calendar, Shield, Palette, Users, DollarSign } from 'lucide-react';

interface CompanySettings {
  // Company Profile
  name: string;
  address: string;
  
  // Feature Toggles
  enableProjectManagement: boolean;
  enableTimeTracking: boolean;
  enableFinancialManagement: boolean;
  enableDocumentManagement: boolean;
  enableCRM: boolean;
  enableSafetyManagement: boolean;
  enableMobileAccess: boolean;
  enableReporting: boolean;
  
  // Notification Settings
  emailNotifications: boolean;
  projectUpdateNotifications: boolean;
  dueDateReminders: boolean;
  safetyAlerts: boolean;
  
  // UI/UX Settings
  companyLogo: string;
  primaryColor: string;
  defaultProjectView: string;
  
  // Business Settings
  defaultWorkingHours: string;
  timeZone: string;
  fiscalYearStart: string;
  defaultMarkup: number;
}

const CompanySettings = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    address: '',
    enableProjectManagement: true,
    enableTimeTracking: true,
    enableFinancialManagement: true,
    enableDocumentManagement: true,
    enableCRM: true,
    enableSafetyManagement: true,
    enableMobileAccess: true,
    enableReporting: true,
    emailNotifications: true,
    projectUpdateNotifications: true,
    dueDateReminders: true,
    safetyAlerts: true,
    companyLogo: '',
    primaryColor: '#3b82f6',
    defaultProjectView: 'dashboard',
    defaultWorkingHours: '8:00 AM - 5:00 PM',
    timeZone: 'America/New_York',
    fiscalYearStart: 'January',
    defaultMarkup: 20
  });

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    if (!userProfile?.company_id) return;

    setLoading(true);
    try {
      // Load basic company info
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, address')
        .eq('id', userProfile.company_id)
        .single();

      if (companyError) throw companyError;

      // Load company settings
      const { data: companySettings, error: settingsError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      // Update settings state
      setSettings(prev => ({
        ...prev,
        // Company info
        name: company?.name || '',
        address: company?.address || '',
        // Feature toggles
        enableProjectManagement: companySettings?.enable_project_management ?? true,
        enableTimeTracking: companySettings?.enable_time_tracking ?? true,
        enableFinancialManagement: companySettings?.enable_financial_management ?? true,
        enableDocumentManagement: companySettings?.enable_document_management ?? true,
        enableCRM: companySettings?.enable_crm ?? true,
        enableSafetyManagement: companySettings?.enable_safety_management ?? true,
        enableMobileAccess: companySettings?.enable_mobile_access ?? true,
        enableReporting: companySettings?.enable_reporting ?? true,
        // Notification settings
        emailNotifications: companySettings?.email_notifications ?? true,
        projectUpdateNotifications: companySettings?.project_update_notifications ?? true,
        dueDateReminders: companySettings?.due_date_reminders ?? true,
        safetyAlerts: companySettings?.safety_alerts ?? true,
        // UI/UX settings
        companyLogo: companySettings?.company_logo || '',
        primaryColor: companySettings?.primary_color || '#3b82f6',
        defaultProjectView: companySettings?.default_project_view || 'dashboard',
        // Business settings
        defaultWorkingHours: companySettings?.default_working_hours || '8:00 AM - 5:00 PM',
        timeZone: companySettings?.time_zone || 'America/New_York',
        fiscalYearStart: companySettings?.fiscal_year_start || 'January',
        defaultMarkup: companySettings?.default_markup || 20
      }));
    } catch (error) {
      console.error('Error loading company settings:', error);
      toast({
        title: "Error",
        description: "Failed to load company settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveSettings = async () => {
    if (!userProfile?.company_id) return;

    setSaving(true);
    try {
      // Update company basic info
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          name: settings.name,
          address: settings.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.company_id);

      if (companyError) throw companyError;

      // Update or insert company settings
      const { error: settingsError } = await supabase
        .from('company_settings')
        .upsert({
          company_id: userProfile.company_id,
          enable_project_management: settings.enableProjectManagement,
          enable_time_tracking: settings.enableTimeTracking,
          enable_financial_management: settings.enableFinancialManagement,
          enable_document_management: settings.enableDocumentManagement,
          enable_crm: settings.enableCRM,
          enable_safety_management: settings.enableSafetyManagement,
          enable_mobile_access: settings.enableMobileAccess,
          enable_reporting: settings.enableReporting,
          email_notifications: settings.emailNotifications,
          project_update_notifications: settings.projectUpdateNotifications,
          due_date_reminders: settings.dueDateReminders,
          safety_alerts: settings.safetyAlerts,
          company_logo: settings.companyLogo,
          primary_color: settings.primaryColor,
          default_project_view: settings.defaultProjectView,
          default_working_hours: settings.defaultWorkingHours,
          time_zone: settings.timeZone,
          fiscal_year_start: settings.fiscalYearStart,
          default_markup: settings.defaultMarkup,
          updated_at: new Date().toISOString()
        });

      if (settingsError) throw settingsError;

      toast({
        title: "Success",
        description: "Company settings saved successfully."
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Company Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ADMINS}>
      <DashboardLayout title="Company Settings">
        <div className="space-y-6">
        {/* Company Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Profile
            </CardTitle>
            <CardDescription>
              Basic information about your company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Company Address</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter company address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Feature Management
            </CardTitle>
            <CardDescription>
              Enable or disable features for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Project Management</Label>
                    <p className="text-sm text-muted-foreground">Manage projects, tasks, and timelines</p>
                  </div>
                  <Switch
                    checked={settings.enableProjectManagement}
                    onCheckedChange={(checked) => handleInputChange('enableProjectManagement', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Time Tracking</Label>
                    <p className="text-sm text-muted-foreground">Track work hours and attendance</p>
                  </div>
                  <Switch
                    checked={settings.enableTimeTracking}
                    onCheckedChange={(checked) => handleInputChange('enableTimeTracking', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Financial Management</Label>
                    <p className="text-sm text-muted-foreground">Manage budgets, invoices, and costs</p>
                  </div>
                  <Switch
                    checked={settings.enableFinancialManagement}
                    onCheckedChange={(checked) => handleInputChange('enableFinancialManagement', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Document Management</Label>
                    <p className="text-sm text-muted-foreground">Store and organize project documents</p>
                  </div>
                  <Switch
                    checked={settings.enableDocumentManagement}
                    onCheckedChange={(checked) => handleInputChange('enableDocumentManagement', checked)}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Customer Relationship Management</Label>
                    <p className="text-sm text-muted-foreground">Manage leads, contacts, and opportunities</p>
                  </div>
                  <Switch
                    checked={settings.enableCRM}
                    onCheckedChange={(checked) => handleInputChange('enableCRM', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Safety Management</Label>
                    <p className="text-sm text-muted-foreground">Track safety incidents and compliance</p>
                  </div>
                  <Switch
                    checked={settings.enableSafetyManagement}
                    onCheckedChange={(checked) => handleInputChange('enableSafetyManagement', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mobile Access</Label>
                    <p className="text-sm text-muted-foreground">Allow mobile app usage</p>
                  </div>
                  <Switch
                    checked={settings.enableMobileAccess}
                    onCheckedChange={(checked) => handleInputChange('enableMobileAccess', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Advanced Reporting</Label>
                    <p className="text-sm text-muted-foreground">Generate detailed reports and analytics</p>
                  </div>
                  <Switch
                    checked={settings.enableReporting}
                    onCheckedChange={(checked) => handleInputChange('enableReporting', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure how your team receives notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Project Updates</Label>
                    <p className="text-sm text-muted-foreground">Notifications for project status changes</p>
                  </div>
                  <Switch
                    checked={settings.projectUpdateNotifications}
                    onCheckedChange={(checked) => handleInputChange('projectUpdateNotifications', checked)}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Due Date Reminders</Label>
                    <p className="text-sm text-muted-foreground">Reminders for upcoming deadlines</p>
                  </div>
                  <Switch
                    checked={settings.dueDateReminders}
                    onCheckedChange={(checked) => handleInputChange('dueDateReminders', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Safety Alerts</Label>
                    <p className="text-sm text-muted-foreground">Immediate alerts for safety incidents</p>
                  </div>
                  <Switch
                    checked={settings.safetyAlerts}
                    onCheckedChange={(checked) => handleInputChange('safetyAlerts', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Business Configuration
            </CardTitle>
            <CardDescription>
              Configure business-specific settings and defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workingHours">Default Working Hours</Label>
                <Input
                  id="workingHours"
                  value={settings.defaultWorkingHours}
                  onChange={(e) => handleInputChange('defaultWorkingHours', e.target.value)}
                  placeholder="8:00 AM - 5:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone</Label>
                <Input
                  id="timeZone"
                  value={settings.timeZone}
                  onChange={(e) => handleInputChange('timeZone', e.target.value)}
                  placeholder="America/New_York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
                <Input
                  id="fiscalYear"
                  value={settings.fiscalYearStart}
                  onChange={(e) => handleInputChange('fiscalYearStart', e.target.value)}
                  placeholder="January"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="markup">Default Markup (%)</Label>
                <Input
                  id="markup"
                  type="number"
                  value={settings.defaultMarkup}
                  onChange={(e) => handleInputChange('defaultMarkup', parseFloat(e.target.value) || 0)}
                  placeholder="20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="min-w-32"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
};

export default CompanySettings;