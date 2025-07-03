import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, Settings, Calendar } from 'lucide-react';

interface NotificationPreference {
  id: string;
  type: string;
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  email: boolean;
  inApp: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

const EmailNotificationSystem = () => {
  const { userProfile } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');

  const defaultPreferences: Omit<NotificationPreference, 'id'>[] = [
    {
      type: 'project_deadline',
      enabled: true,
      frequency: 'immediate',
      email: true,
      inApp: true
    },
    {
      type: 'budget_alert',
      enabled: true,
      frequency: 'immediate',
      email: true,
      inApp: true
    },
    {
      type: 'team_updates',
      enabled: false,
      frequency: 'daily',
      email: false,
      inApp: true
    },
    {
      type: 'invoice_generated',
      enabled: true,
      frequency: 'immediate',
      email: true,
      inApp: false
    },
    {
      type: 'safety_incidents',
      enabled: true,
      frequency: 'immediate',
      email: true,
      inApp: true
    }
  ];

  const defaultTemplates: EmailTemplate[] = [
    {
      id: '1',
      name: 'Project Deadline Alert',
      subject: 'Project Deadline Approaching - {{project_name}}',
      content: `
        <h2>Project Deadline Alert</h2>
        <p>The project <strong>{{project_name}}</strong> has a deadline approaching on {{deadline_date}}.</p>
        <p>Current completion: {{completion_percentage}}%</p>
        <p>Please review and take necessary action.</p>
      `,
      variables: ['project_name', 'deadline_date', 'completion_percentage']
    },
    {
      id: '2',
      name: 'Budget Overrun Warning',
      subject: 'Budget Alert - {{project_name}}',
      content: `
        <h2>Budget Alert</h2>
        <p>Project <strong>{{project_name}}</strong> is approaching budget limits.</p>
        <p>Budget: ${{budget}}</p>
        <p>Spent: ${{spent_amount}}</p>
        <p>Remaining: ${{remaining_amount}}</p>
      `,
      variables: ['project_name', 'budget', 'spent_amount', 'remaining_amount']
    }
  ];

  useEffect(() => {
    loadNotificationPreferences();
    setTemplates(defaultTemplates);
  }, [userProfile]);

  const loadNotificationPreferences = async () => {
    if (!userProfile?.id) return;

    try {
      // For now, use localStorage until we create the notification_preferences table
      const savedPrefs = localStorage.getItem(`notification_prefs_${userProfile.id}`);
      
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      } else {
        // Initialize with defaults
        const defaultPrefs = defaultPreferences.map((pref, index) => ({
          ...pref,
          id: `default_${index}`
        }));
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      // Fallback to defaults
      const defaultPrefs = defaultPreferences.map((pref, index) => ({
        ...pref,
        id: `default_${index}`
      }));
      setPreferences(defaultPrefs);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (preferenceId: string, updates: Partial<NotificationPreference>) => {
    const updatedPreferences = preferences.map(pref =>
      pref.id === preferenceId ? { ...pref, ...updates } : pref
    );
    setPreferences(updatedPreferences);

    // Save to localStorage
    if (userProfile?.id) {
      localStorage.setItem(`notification_prefs_${userProfile.id}`, JSON.stringify(updatedPreferences));
    }

    toast({
      title: "Settings Updated",
      description: "Notification preferences have been saved."
    });
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'test',
          to: testEmail,
          subject: 'Test Notification from BuildDesk',
          content: 'This is a test notification to verify your email settings.'
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `Test email sent to ${testEmail}`
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send test email. Please check your configuration."
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      project_deadline: 'Project Deadlines',
      budget_alert: 'Budget Alerts',
      team_updates: 'Team Updates',
      invoice_generated: 'Invoice Generated',
      safety_incidents: 'Safety Incidents'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Mail className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Email Notifications</h2>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notification Preferences</span>
          </CardTitle>
          <CardDescription>
            Configure when and how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences.map((preference) => (
            <div key={preference.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  {getTypeLabel(preference.type)}
                </Label>
                <Switch
                  checked={preference.enabled}
                  onCheckedChange={(enabled) =>
                    updatePreference(preference.id, { enabled })
                  }
                />
              </div>

              {preference.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <Label className="text-sm">Frequency</Label>
                    <Select
                      value={preference.frequency}
                      onValueChange={(frequency: any) =>
                        updatePreference(preference.id, { frequency })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="daily">Daily Summary</SelectItem>
                        <SelectItem value="weekly">Weekly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-4 pt-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={preference.email}
                        onCheckedChange={(email) =>
                          updatePreference(preference.id, { email })
                        }
                      />
                      <Label className="text-sm">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={preference.inApp}
                        onCheckedChange={(inApp) =>
                          updatePreference(preference.id, { inApp })
                        }
                      />
                      <Label className="text-sm">In-App</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Email Templates</span>
          </CardTitle>
          <CardDescription>
            Customize email notification templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{template.name}</h4>
                <Badge variant="outline">
                  {template.variables.length} variables
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Subject: {template.subject}
              </p>
              <div className="text-sm text-muted-foreground">
                Variables: {template.variables.map(v => `{{${v}}}`).join(', ')}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle>Test Email Configuration</CardTitle>
          <CardDescription>
            Send a test email to verify your notification setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              type="email"
            />
            <Button onClick={sendTestEmail}>
              Send Test Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailNotificationSystem;