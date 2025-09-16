import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, Users, Shield, Bell, Database, Zap, 
  Mail, Phone, Globe, Key, Download, Upload,
  Save, RefreshCw, AlertTriangle, CheckCircle
} from 'lucide-react';

interface CompanySettings {
  id: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  licenseNumber: string;
  insuranceNumber: string;
  taxId: string;
  logo: string;
  timeZone: string;
  currency: string;
  dateFormat: string;
  businessHours: BusinessHours;
}

interface BusinessHours {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
}

interface NotificationSettings {
  email: {
    projectUpdates: boolean;
    safetyAlerts: boolean;
    budgetWarnings: boolean;
    scheduleChanges: boolean;
    clientMessages: boolean;
    systemMaintenance: boolean;
  };
  sms: {
    emergencyAlerts: boolean;
    criticalIssues: boolean;
    dailyReports: boolean;
  };
  push: {
    enabled: boolean;
    quietHours: { start: string; end: string };
  };
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
    requireNumbers: boolean;
    requireUppercase: boolean;
    expirationDays: number;
  };
  ipWhitelist: string[];
  auditLogRetention: number;
  loginAttempts: number;
}

interface IntegrationSettings {
  quickbooks: {
    enabled: boolean;
    companyId: string;
    syncFrequency: string;
    lastSync: Date;
  };
  email: {
    provider: 'smtp' | 'sendgrid' | 'ses';
    host: string;
    port: number;
    username: string;
    fromAddress: string;
  };
  storage: {
    provider: 'local' | 's3' | 'google' | 'azure';
    bucket: string;
    region: string;
    maxFileSize: number;
  };
}

export const SystemSettings: React.FC = () => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    id: '1',
    companyName: 'BuildDesk Construction',
    address: '123 Construction Ave',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    phone: '(555) 123-4567',
    email: 'info@builddesk.com',
    website: 'https://builddesk.com',
    licenseNumber: 'CA-CON-123456',
    insuranceNumber: 'INS-987654321',
    taxId: '12-3456789',
    logo: '/logo.png',
    timeZone: 'America/Los_Angeles',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    businessHours: {
      monday: { start: '08:00', end: '17:00', enabled: true },
      tuesday: { start: '08:00', end: '17:00', enabled: true },
      wednesday: { start: '08:00', end: '17:00', enabled: true },
      thursday: { start: '08:00', end: '17:00', enabled: true },
      friday: { start: '08:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '13:00', enabled: false },
      sunday: { start: '09:00', end: '13:00', enabled: false }
    }
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      projectUpdates: true,
      safetyAlerts: true,
      budgetWarnings: true,
      scheduleChanges: true,
      clientMessages: true,
      systemMaintenance: false
    },
    sms: {
      emergencyAlerts: true,
      criticalIssues: true,
      dailyReports: false
    },
    push: {
      enabled: true,
      quietHours: { start: '22:00', end: '07:00' }
    }
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: true,
    sessionTimeout: 480, // 8 hours in minutes
    passwordPolicy: {
      minLength: 8,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true,
      expirationDays: 90
    },
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
    auditLogRetention: 365, // days
    loginAttempts: 5
  });

  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    quickbooks: {
      enabled: true,
      companyId: 'qb-company-123',
      syncFrequency: 'daily',
      lastSync: new Date('2024-01-29T08:00:00')
    },
    email: {
      provider: 'smtp',
      host: 'smtp.gmail.com',
      port: 587,
      username: 'builddesk@gmail.com',
      fromAddress: 'noreply@builddesk.com'
    },
    storage: {
      provider: 's3',
      bucket: 'builddesk-storage',
      region: 'us-west-2',
      maxFileSize: 100 // MB
    }
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setSaveStatus('saving');
    
    // Simulate API call
    setTimeout(() => {
      setSaveStatus('saved');
      setUnsavedChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  const renderBusinessHours = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return (
      <div className="space-y-4">
        {days.map(day => (
          <div key={day} className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-3">
              <Switch
                checked={companySettings.businessHours[day as keyof BusinessHours].enabled}
                onCheckedChange={(checked) => {
                  setCompanySettings(prev => ({
                    ...prev,
                    businessHours: {
                      ...prev.businessHours,
                      [day]: { ...prev.businessHours[day as keyof BusinessHours], enabled: checked }
                    }
                  }));
                  setUnsavedChanges(true);
                }}
              />
              <span className="font-medium capitalize">{day}</span>
            </div>
            
            {companySettings.businessHours[day as keyof BusinessHours].enabled && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={companySettings.businessHours[day as keyof BusinessHours].start}
                  onChange={(e) => {
                    setCompanySettings(prev => ({
                      ...prev,
                      businessHours: {
                        ...prev.businessHours,
                        [day]: { ...prev.businessHours[day as keyof BusinessHours], start: e.target.value }
                      }
                    }));
                    setUnsavedChanges(true);
                  }}
                  className="w-24"
                />
                <span>to</span>
                <Input
                  type="time"
                  value={companySettings.businessHours[day as keyof BusinessHours].end}
                  onChange={(e) => {
                    setCompanySettings(prev => ({
                      ...prev,
                      businessHours: {
                        ...prev.businessHours,
                        [day]: { ...prev.businessHours[day as keyof BusinessHours], end: e.target.value }
                      }
                    }));
                    setUnsavedChanges(true);
                  }}
                  className="w-24"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-muted-foreground">
            Configure company information, security, notifications, and integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!unsavedChanges || saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {unsavedChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-orange-800">You have unsaved changes. Don't forget to save your settings.</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name</label>
                    <Input
                      value={companySettings.companyName}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, companyName: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">License Number</label>
                    <Input
                      value={companySettings.licenseNumber}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, licenseNumber: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Address</label>
                    <Input
                      value={companySettings.address}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, address: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <Input
                      value={companySettings.phone}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, phone: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, email: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Website</label>
                    <Input
                      type="url"
                      value={companySettings.website}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, website: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {renderBusinessHours()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Time Zone</label>
                    <select 
                      value={companySettings.timeZone}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, timeZone: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/New_York">Eastern Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Currency</label>
                    <select 
                      value={companySettings.currency}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, currency: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date Format</label>
                    <select 
                      value={companySettings.dateFormat}
                      onChange={(e) => {
                        setCompanySettings(prev => ({ ...prev, dateFormat: e.target.value }));
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notificationSettings.email).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => {
                        setNotificationSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, [key]: checked }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  SMS Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notificationSettings.sms).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => {
                        setNotificationSettings(prev => ({
                          ...prev,
                          sms: { ...prev.sms, [key]: checked }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Enable Push Notifications</span>
                  <Switch
                    checked={notificationSettings.push.enabled}
                    onCheckedChange={(checked) => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        push: { ...prev.push, enabled: checked }
                      }));
                      setUnsavedChanges(true);
                    }}
                  />
                </div>
                
                {notificationSettings.push.enabled && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Quiet Hours</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={notificationSettings.push.quietHours.start}
                        onChange={(e) => {
                          setNotificationSettings(prev => ({
                            ...prev,
                            push: {
                              ...prev.push,
                              quietHours: { ...prev.push.quietHours, start: e.target.value }
                            }
                          }));
                          setUnsavedChanges(true);
                        }}
                        className="w-24"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={notificationSettings.push.quietHours.end}
                        onChange={(e) => {
                          setNotificationSettings(prev => ({
                            ...prev,
                            push: {
                              ...prev.push,
                              quietHours: { ...prev.push.quietHours, end: e.target.value }
                            }
                          }));
                          setUnsavedChanges(true);
                        }}
                        className="w-24"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Two-Factor Authentication</span>
                    <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: checked }));
                      setUnsavedChanges(true);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
                  <Input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }));
                      setUnsavedChanges(true);
                    }}
                    className="w-32"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Maximum Login Attempts</label>
                  <Input
                    type="number"
                    value={securitySettings.loginAttempts}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({ ...prev, loginAttempts: parseInt(e.target.value) }));
                      setUnsavedChanges(true);
                    }}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Password Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Length</label>
                  <Input
                    type="number"
                    value={securitySettings.passwordPolicy.minLength}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({
                        ...prev,
                        passwordPolicy: { ...prev.passwordPolicy, minLength: parseInt(e.target.value) }
                      }));
                      setUnsavedChanges(true);
                    }}
                    className="w-32"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Require Special Characters</span>
                    <Switch
                      checked={securitySettings.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) => {
                        setSecuritySettings(prev => ({
                          ...prev,
                          passwordPolicy: { ...prev.passwordPolicy, requireSpecialChars: checked }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Require Numbers</span>
                    <Switch
                      checked={securitySettings.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) => {
                        setSecuritySettings(prev => ({
                          ...prev,
                          passwordPolicy: { ...prev.passwordPolicy, requireNumbers: checked }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Require Uppercase</span>
                    <Switch
                      checked={securitySettings.passwordPolicy.requireUppercase}
                      onCheckedChange={(checked) => {
                        setSecuritySettings(prev => ({
                          ...prev,
                          passwordPolicy: { ...prev.passwordPolicy, requireUppercase: checked }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password Expiration (days)</label>
                  <Input
                    type="number"
                    value={securitySettings.passwordPolicy.expirationDays}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({
                        ...prev,
                        passwordPolicy: { ...prev.passwordPolicy, expirationDays: parseInt(e.target.value) }
                      }));
                      setUnsavedChanges(true);
                    }}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  QuickBooks Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Enable QuickBooks Sync</span>
                    <p className="text-sm text-muted-foreground">Automatically sync financial data</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={integrationSettings.quickbooks.enabled ? 'default' : 'outline'}>
                      {integrationSettings.quickbooks.enabled ? 'Connected' : 'Disconnected'}
                    </Badge>
                    <Switch
                      checked={integrationSettings.quickbooks.enabled}
                      onCheckedChange={(checked) => {
                        setIntegrationSettings(prev => ({
                          ...prev,
                          quickbooks: { ...prev.quickbooks, enabled: checked }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>

                {integrationSettings.quickbooks.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Sync Frequency</label>
                      <select 
                        value={integrationSettings.quickbooks.syncFrequency}
                        onChange={(e) => {
                          setIntegrationSettings(prev => ({
                            ...prev,
                            quickbooks: { ...prev.quickbooks, syncFrequency: e.target.value }
                          }));
                          setUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Sync</label>
                      <Input 
                        value={integrationSettings.quickbooks.lastSync.toLocaleString()}
                        disabled
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Provider</label>
                    <select 
                      value={integrationSettings.email.provider}
                      onChange={(e) => {
                        setIntegrationSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, provider: e.target.value as any }
                        }));
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="smtp">SMTP</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="ses">Amazon SES</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">From Address</label>
                    <Input
                      type="email"
                      value={integrationSettings.email.fromAddress}
                      onChange={(e) => {
                        setIntegrationSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, fromAddress: e.target.value }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Provider</label>
                    <select 
                      value={integrationSettings.storage.provider}
                      onChange={(e) => {
                        setIntegrationSettings(prev => ({
                          ...prev,
                          storage: { ...prev.storage, provider: e.target.value as any }
                        }));
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="local">Local Storage</option>
                      <option value="s3">Amazon S3</option>
                      <option value="google">Google Cloud</option>
                      <option value="azure">Azure Blob</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max File Size (MB)</label>
                    <Input
                      type="number"
                      value={integrationSettings.storage.maxFileSize}
                      onChange={(e) => {
                        setIntegrationSettings(prev => ({
                          ...prev,
                          storage: { ...prev.storage, maxFileSize: parseInt(e.target.value) }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Region</label>
                    <Input
                      value={integrationSettings.storage.region}
                      onChange={(e) => {
                        setIntegrationSettings(prev => ({
                          ...prev,
                          storage: { ...prev.storage, region: e.target.value }
                        }));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Export All Data</span>
                    <p className="text-sm text-muted-foreground">Download complete system backup</p>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Import Data</span>
                    <p className="text-sm text-muted-foreground">Restore from backup file</p>
                  </div>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Audit Log Retention (days)</label>
                  <Input
                    type="number"
                    value={securitySettings.auditLogRetention}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({ ...prev, auditLogRetention: parseInt(e.target.value) }));
                      setUnsavedChanges(true);
                    }}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  API key management and webhooks configuration
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};