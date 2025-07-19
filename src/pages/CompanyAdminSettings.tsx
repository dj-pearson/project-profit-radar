import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PaymentSettings } from '@/components/financial/PaymentSettings';
import {
  Settings,
  Palette,
  Users,
  Shield,
  Plus,
  Trash2,
  Save,
  Workflow,
  Link,
  Database,
  CreditCard,
  Upload
} from 'lucide-react';

interface CompanyAdminSettings {
  id?: string;
  company_id: string;
  company_logo_url?: string;
  primary_color: string;
  secondary_color: string;
  custom_theme: Record<string, any>;
  email_signature?: string;
  user_invite_settings: {
    require_approval: boolean;
    default_role: string;
    auto_activate: boolean;
    welcome_email: boolean;
  };
  security_policies: {
    password_min_length: number;
    require_special_chars: boolean;
    require_numbers: boolean;
    session_timeout_hours: number;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    ip_whitelist: string[];
    require_2fa: boolean;
  };
  custom_fields: {
    projects: any[];
    contacts: any[];
    tasks: any[];
    estimates: any[];
  };
  workflow_settings: {
    auto_approve_estimates_under?: number;
    auto_assign_tasks: boolean;
    notification_rules: any[];
    approval_workflows: any[];
  };
  integration_config: {
    quickbooks: {
      enabled: boolean;
      auto_sync: boolean;
      sync_frequency: string;
    };
    email: {
      provider: string;
      smtp_settings: Record<string, any>;
    };
    calendar: {
      enabled: boolean;
      default_calendar: string;
    };
  };
  data_retention: {
    project_data_retention_years: number;
    document_retention_years: number;
    backup_frequency: string;
    auto_archive_completed_projects: boolean;
    archive_after_months: number;
  };
  billing_settings: {
    auto_billing: boolean;
    default_payment_terms: string;
    late_fee_percentage: number;
    accept_online_payments: boolean;
    payment_methods: string[];
  };
}

interface CustomField {
  id?: string;
  field_name: string;
  field_type: string;
  field_options: Record<string, any>;
  applies_to: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

const CompanyAdminSettings = () => {
  const { user, userProfile } = useAuth();
  const { hasRole } = usePermissions();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<CompanyAdminSettings | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');

  useEffect(() => {
    if (!user || !userProfile) {
      navigate('/auth');
      return;
    }
    
    if (!hasRole(['admin', 'root_admin'])) {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only company administrators can access these settings."
      });
      return;
    }
    
    loadSettings();
    loadCustomFields();
  }, [user, userProfile, hasRole, navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_admin_settings')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          ...data,
          custom_theme: data.custom_theme as Record<string, any>,
          user_invite_settings: data.user_invite_settings as any,
          security_policies: data.security_policies as any,
          custom_fields: data.custom_fields as any,
          workflow_settings: data.workflow_settings as any,
          integration_config: data.integration_config as any,
          data_retention: data.data_retention as any,
          billing_settings: data.billing_settings as any
        } as CompanyAdminSettings);
      } else {
        // Create default settings
        const defaultSettings: CompanyAdminSettings = {
          company_id: userProfile?.company_id || '',
          primary_color: '#3b82f6',
          secondary_color: '#1e40af',
          custom_theme: {},
          user_invite_settings: {
            require_approval: false,
            default_role: 'office_staff',
            auto_activate: true,
            welcome_email: true
          },
          security_policies: {
            password_min_length: 8,
            require_special_chars: true,
            require_numbers: true,
            session_timeout_hours: 24,
            max_login_attempts: 5,
            lockout_duration_minutes: 30,
            ip_whitelist: [],
            require_2fa: false
          },
          custom_fields: {
            projects: [],
            contacts: [],
            tasks: [],
            estimates: []
          },
          workflow_settings: {
            auto_assign_tasks: false,
            notification_rules: [],
            approval_workflows: []
          },
          integration_config: {
            quickbooks: {
              enabled: false,
              auto_sync: false,
              sync_frequency: 'daily'
            },
            email: {
              provider: 'default',
              smtp_settings: {}
            },
            calendar: {
              enabled: false,
              default_calendar: 'google'
            }
          },
          data_retention: {
            project_data_retention_years: 7,
            document_retention_years: 10,
            backup_frequency: 'daily',
            auto_archive_completed_projects: true,
            archive_after_months: 12
          },
          billing_settings: {
            auto_billing: false,
            default_payment_terms: 'net_30',
            late_fee_percentage: 0,
            accept_online_payments: false,
            payment_methods: ['check', 'ach']
          }
        };
        setSettings(defaultSettings);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load company settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('company_custom_fields')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('sort_order');

      if (error) throw error;
      setCustomFields((data || []).map(field => ({
        ...field,
        field_options: field.field_options as Record<string, any>
      })));
    } catch (error: any) {
      console.error('Error loading custom fields:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('company_admin_settings')
        .upsert({
          ...settings,
          updated_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company settings saved successfully"
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

  const addCustomField = async (appliesTo: string) => {
    const newField: CustomField = {
      field_name: '',
      field_type: 'text',
      field_options: {},
      applies_to: appliesTo,
      is_required: false,
      is_active: true,
      sort_order: customFields.filter(f => f.applies_to === appliesTo).length
    };
    
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const saveCustomFields = async () => {
    try {
      setSaving(true);
      
      // Delete existing fields for this company
      await supabase
        .from('company_custom_fields')
        .delete()
        .eq('company_id', userProfile?.company_id);
      
      // Insert new fields
      if (customFields.length > 0) {
        const fieldsToInsert = customFields
          .filter(f => f.field_name.trim())
          .map(f => ({
            ...f,
            company_id: userProfile?.company_id,
            created_by: user?.id
          }));
        
        if (fieldsToInsert.length > 0) {
          const { error } = await supabase
            .from('company_custom_fields')
            .insert(fieldsToInsert);
          
          if (error) throw error;
        }
      }
      
      toast({
        title: "Success",
        description: "Custom fields saved successfully"
      });
      
      loadCustomFields();
    } catch (error: any) {
      console.error('Error saving custom fields:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save custom fields"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Company Settings" showTrialBanner={false}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!settings) return null;

  return (
    <DashboardLayout title="Company Settings" showTrialBanner={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
            <p className="text-muted-foreground">
              Configure company-wide settings and preferences
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Company Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Branding</CardTitle>
                <CardDescription>
                  Customize your company's visual identity and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        {settings.company_logo_url ? (
                          <img src={settings.company_logo_url} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="color"
                          value={settings.primary_color}
                          onChange={(e) => setSettings({
                            ...settings,
                            primary_color: e.target.value
                          })}
                          className="w-12 h-10 rounded border"
                        />
                        <Input
                          value={settings.primary_color}
                          onChange={(e) => setSettings({
                            ...settings,
                            primary_color: e.target.value
                          })}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="color"
                          value={settings.secondary_color}
                          onChange={(e) => setSettings({
                            ...settings,
                            secondary_color: e.target.value
                          })}
                          className="w-12 h-10 rounded border"
                        />
                        <Input
                          value={settings.secondary_color}
                          onChange={(e) => setSettings({
                            ...settings,
                            secondary_color: e.target.value
                          })}
                          placeholder="#1e40af"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email-signature">Email Signature</Label>
                    <Textarea
                      value={settings.email_signature || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        email_signature: e.target.value
                      })}
                      placeholder="Enter your company email signature..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management Settings</CardTitle>
                <CardDescription>
                  Configure how new users are invited and managed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Admin Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        New user invitations require admin approval before activation
                      </p>
                    </div>
                    <Switch
                      checked={settings.user_invite_settings.require_approval}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        user_invite_settings: {
                          ...settings.user_invite_settings,
                          require_approval: checked
                        }
                      })}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Default Role for New Users</Label>
                    <Select
                      value={settings.user_invite_settings.default_role}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        user_invite_settings: {
                          ...settings.user_invite_settings,
                          default_role: value
                        }
                      })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office_staff">Office Staff</SelectItem>
                        <SelectItem value="field_supervisor">Field Supervisor</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="accounting">Accounting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Activate Users</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically activate users after invitation acceptance
                      </p>
                    </div>
                    <Switch
                      checked={settings.user_invite_settings.auto_activate}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        user_invite_settings: {
                          ...settings.user_invite_settings,
                          auto_activate: checked
                        }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Send Welcome Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Send welcome email to new users after activation
                      </p>
                    </div>
                    <Switch
                      checked={settings.user_invite_settings.welcome_email}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        user_invite_settings: {
                          ...settings.user_invite_settings,
                          welcome_email: checked
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Policies Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Policies</CardTitle>
                <CardDescription>
                  Configure security requirements and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Password Length</Label>
                    <Input
                      type="number"
                      min="6"
                      max="32"
                      value={settings.security_policies.password_min_length}
                      onChange={(e) => setSettings({
                        ...settings,
                        security_policies: {
                          ...settings.security_policies,
                          password_min_length: parseInt(e.target.value) || 8
                        }
                      })}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>Session Timeout (Hours)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.security_policies.session_timeout_hours}
                      onChange={(e) => setSettings({
                        ...settings,
                        security_policies: {
                          ...settings.security_policies,
                          session_timeout_hours: parseInt(e.target.value) || 24
                        }
                      })}
                      className="mt-2"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Special Characters</Label>
                      <p className="text-sm text-muted-foreground">
                        Passwords must contain special characters (!@#$%^&*)
                      </p>
                    </div>
                    <Switch
                      checked={settings.security_policies.require_special_chars}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security_policies: {
                          ...settings.security_policies,
                          require_special_chars: checked
                        }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Numbers</Label>
                      <p className="text-sm text-muted-foreground">
                        Passwords must contain at least one number
                      </p>
                    </div>
                    <Switch
                      checked={settings.security_policies.require_numbers}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security_policies: {
                          ...settings.security_policies,
                          require_numbers: checked
                        }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        All users must enable 2FA for account access
                      </p>
                    </div>
                    <Switch
                      checked={settings.security_policies.require_2fa}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security_policies: {
                          ...settings.security_policies,
                          require_2fa: checked
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Fields Tab */}
          <TabsContent value="fields" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Fields</CardTitle>
                <CardDescription>
                  Add custom fields to capture additional information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {['projects', 'contacts', 'tasks', 'estimates'].map((entity) => (
                  <div key={entity} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium capitalize">{entity} Fields</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addCustomField(entity)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {customFields
                        .filter(field => field.applies_to === entity)
                        .map((field, index) => (
                          <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Input
                              placeholder="Field name"
                              value={field.field_name}
                              onChange={(e) => updateCustomField(
                                customFields.findIndex(f => f === field),
                                { field_name: e.target.value }
                              )}
                              className="flex-1"
                            />
                            <Select
                              value={field.field_type}
                              onValueChange={(value) => updateCustomField(
                                customFields.findIndex(f => f === field),
                                { field_type: value }
                              )}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="boolean">Yes/No</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                                <SelectItem value="textarea">Text Area</SelectItem>
                              </SelectContent>
                            </Select>
                            <Switch
                              checked={field.is_required}
                              onCheckedChange={(checked) => updateCustomField(
                                customFields.findIndex(f => f === field),
                                { is_required: checked }
                              )}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeCustomField(customFields.findIndex(f => f === field))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end">
                  <Button onClick={saveCustomFields} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Custom Fields
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Remaining tabs would continue with similar structure... */}
          <TabsContent value="workflows" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Automation</CardTitle>
                <CardDescription>
                  Configure automated workflows and business rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Workflow automation features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Third-Party Integrations</CardTitle>
                <CardDescription>
                  Manage connections to external services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Integration management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Retention & Backup</CardTitle>
                <CardDescription>
                  Configure data retention policies and backup settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Data management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Processing Setup
                </CardTitle>
                <CardDescription>
                  Configure how your company processes payments from clients. Choose between platform processing or your own Stripe account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CompanyAdminSettings;