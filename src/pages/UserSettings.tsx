import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell, 
  Clock, 
  Smartphone, 
  Accessibility, 
  User,
  Save,
  Layout,
  Star,
  MapPin,
  Camera,
  Wifi,
  Type,
  Eye,
  Volume2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserPreferences {
  id?: string;
  user_id: string;
  dashboard_layout: {
    widgets: string[];
    defaultView: string;
  };
  favorite_shortcuts: string[];
  email_notifications: {
    task_due: boolean;
    project_updates: boolean;
    team_mentions: boolean;
    daily_digest: boolean;
    weekly_summary: boolean;
  };
  sms_notifications: {
    urgent_tasks: boolean;
    project_alerts: boolean;
    safety_incidents: boolean;
  };
  in_app_notifications: {
    task_assignments: boolean;
    comments: boolean;
    mentions: boolean;
    system_updates: boolean;
  };
  time_zone: string;
  working_hours: {
    [key: string]: {
      start: string;
      end: string;
      enabled: boolean;
    };
  };
  mobile_preferences: {
    offline_sync: boolean;
    photo_quality: 'low' | 'medium' | 'high';
    gps_tracking: boolean;
    auto_backup: boolean;
    cellular_sync: boolean;
  };
  language: string;
  accessibility_preferences: {
    font_size: 'small' | 'medium' | 'large';
    high_contrast: boolean;
    reduce_motion: boolean;
    screen_reader: boolean;
    keyboard_navigation: boolean;
  };
}

const defaultPreferences: UserPreferences = {
  user_id: '',
  dashboard_layout: { widgets: [], defaultView: 'overview' },
  favorite_shortcuts: [],
  email_notifications: {
    task_due: true,
    project_updates: true,
    team_mentions: true,
    daily_digest: false,
    weekly_summary: true
  },
  sms_notifications: {
    urgent_tasks: false,
    project_alerts: false,
    safety_incidents: true
  },
  in_app_notifications: {
    task_assignments: true,
    comments: true,
    mentions: true,
    system_updates: true
  },
  time_zone: 'America/New_York',
  working_hours: {
    monday: { start: '08:00', end: '17:00', enabled: true },
    tuesday: { start: '08:00', end: '17:00', enabled: true },
    wednesday: { start: '08:00', end: '17:00', enabled: true },
    thursday: { start: '08:00', end: '17:00', enabled: true },
    friday: { start: '08:00', end: '17:00', enabled: true },
    saturday: { start: '08:00', end: '12:00', enabled: false },
    sunday: { start: '08:00', end: '12:00', enabled: false }
  },
  mobile_preferences: {
    offline_sync: true,
    photo_quality: 'high',
    gps_tracking: true,
    auto_backup: true,
    cellular_sync: false
  },
  language: 'en',
  accessibility_preferences: {
    font_size: 'medium',
    high_contrast: false,
    reduce_motion: false,
    screen_reader: false,
    keyboard_navigation: false
  }
};

const timeZones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Australia/Sydney'
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' }
];

const availableShortcuts = [
  'My Tasks', 'Create Project', 'Time Tracking', 'Reports', 'Team Calendar',
  'Documents', 'Safety Forms', 'Equipment', 'Contacts', 'Financial Dashboard'
];

export const UserSettings = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      loadPreferences();
    }
  }, [userProfile]);

  const loadPreferences = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          ...data,
          dashboard_layout: data.dashboard_layout as any,
          email_notifications: data.email_notifications as any,
          sms_notifications: data.sms_notifications as any,
          in_app_notifications: data.in_app_notifications as any,
          working_hours: data.working_hours as any,
          mobile_preferences: data.mobile_preferences as any,
          accessibility_preferences: data.accessibility_preferences as any,
          favorite_shortcuts: data.favorite_shortcuts as any
        } as UserPreferences);
      } else {
        // Create default preferences for new user
        const newPrefs = { ...defaultPreferences, user_id: userProfile.id };
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!userProfile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          ...preferences,
          user_id: userProfile.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreferences = (path: string, value: any) => {
    setPreferences(prev => {
      const keys = path.split('.');
      const newPrefs = { ...prev };
      let current: any = newPrefs;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPrefs;
    });
  };

  const toggleFavoriteShortcut = (shortcut: string) => {
    const current = preferences.favorite_shortcuts;
    const updated = current.includes(shortcut)
      ? current.filter(s => s !== shortcut)
      : [...current, shortcut];
    updatePreferences('favorite_shortcuts', updated);
  };

  if (loading) {
    return (
      <DashboardLayout title="User Settings">
        <div className="text-center py-8">Loading your settings...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Personal Settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Personal Settings</h1>
              <p className="text-sm text-muted-foreground">
                Customize your experience and preferences
              </p>
            </div>
          </div>
          <Button onClick={savePreferences} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Accessibility className="h-4 w-4" />
              Accessibility
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Customization */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Dashboard Customization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Default Dashboard View</Label>
                  <Select 
                    value={preferences.dashboard_layout.defaultView} 
                    onValueChange={(value) => updatePreferences('dashboard_layout.defaultView', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="projects">Projects Focus</SelectItem>
                      <SelectItem value="tasks">Tasks Focus</SelectItem>
                      <SelectItem value="financial">Financial Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Favorite Shortcuts
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select shortcuts to display in your dashboard quick access
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableShortcuts.map((shortcut) => (
                      <div
                        key={shortcut}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          preferences.favorite_shortcuts.includes(shortcut)
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => toggleFavoriteShortcut(shortcut)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{shortcut}</span>
                          {preferences.favorite_shortcuts.includes(shortcut) && (
                            <Star className="h-3 w-3 fill-current" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {preferences.favorite_shortcuts.length} shortcuts selected
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Preferences */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Email Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(preferences.email_notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => 
                          updatePreferences(`email_notifications.${key}`, checked)
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SMS Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(preferences.sms_notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => 
                          updatePreferences(`sms_notifications.${key}`, checked)
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">In-App Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(preferences.in_app_notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => 
                          updatePreferences(`in_app_notifications.${key}`, checked)
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Time Zone & Working Hours */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Time Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={preferences.time_zone} 
                    onValueChange={(value) => updatePreferences('time_zone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeZones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Working Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(preferences.working_hours).map(([day, hours]) => (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{day}</Label>
                        <Switch
                          checked={hours.enabled}
                          onCheckedChange={(checked) => 
                            updatePreferences(`working_hours.${day}.enabled`, checked)
                          }
                        />
                      </div>
                      {hours.enabled && (
                        <div className="flex gap-2">
                          <Input
                            type="time"
                            value={hours.start}
                            onChange={(e) => 
                              updatePreferences(`working_hours.${day}.start`, e.target.value)
                            }
                          />
                          <span className="self-center">to</span>
                          <Input
                            type="time"
                            value={hours.end}
                            onChange={(e) => 
                              updatePreferences(`working_hours.${day}.end`, e.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mobile App Preferences */}
          <TabsContent value="mobile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Mobile App Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        <Label>Offline Sync</Label>
                      </div>
                      <Switch
                        checked={preferences.mobile_preferences.offline_sync}
                        onCheckedChange={(checked) => 
                          updatePreferences('mobile_preferences.offline_sync', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <Label>GPS Tracking</Label>
                      </div>
                      <Switch
                        checked={preferences.mobile_preferences.gps_tracking}
                        onCheckedChange={(checked) => 
                          updatePreferences('mobile_preferences.gps_tracking', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Auto Backup</Label>
                      <Switch
                        checked={preferences.mobile_preferences.auto_backup}
                        onCheckedChange={(checked) => 
                          updatePreferences('mobile_preferences.auto_backup', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Cellular Data Sync</Label>
                      <Switch
                        checked={preferences.mobile_preferences.cellular_sync}
                        onCheckedChange={(checked) => 
                          updatePreferences('mobile_preferences.cellular_sync', checked)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Photo Quality
                    </Label>
                    <Select 
                      value={preferences.mobile_preferences.photo_quality} 
                      onValueChange={(value) => updatePreferences('mobile_preferences.photo_quality', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (faster upload)</SelectItem>
                        <SelectItem value="medium">Medium (balanced)</SelectItem>
                        <SelectItem value="high">High (best quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language & Accessibility */}
          <TabsContent value="accessibility" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>Language</Label>
                  <Select 
                    value={preferences.language} 
                    onValueChange={(value) => updatePreferences('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Accessibility className="h-5 w-5" />
                    Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Font Size
                    </Label>
                    <Select 
                      value={preferences.accessibility_preferences.font_size} 
                      onValueChange={(value) => updatePreferences('accessibility_preferences.font_size', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <Label>High Contrast</Label>
                    </div>
                    <Switch
                      checked={preferences.accessibility_preferences.high_contrast}
                      onCheckedChange={(checked) => 
                        updatePreferences('accessibility_preferences.high_contrast', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Reduce Motion</Label>
                    <Switch
                      checked={preferences.accessibility_preferences.reduce_motion}
                      onCheckedChange={(checked) => 
                        updatePreferences('accessibility_preferences.reduce_motion', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <Label>Screen Reader Support</Label>
                    </div>
                    <Switch
                      checked={preferences.accessibility_preferences.screen_reader}
                      onCheckedChange={(checked) => 
                        updatePreferences('accessibility_preferences.screen_reader', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Keyboard Navigation</Label>
                    <Switch
                      checked={preferences.accessibility_preferences.keyboard_navigation}
                      onCheckedChange={(checked) => 
                        updatePreferences('accessibility_preferences.keyboard_navigation', checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};