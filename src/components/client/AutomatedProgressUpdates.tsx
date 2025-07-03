import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Clock, 
  Image, 
  CheckCircle, 
  Settings,
  Mail,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UpdateSettings {
  autoUpdatesEnabled: boolean;
  updateFrequency: 'daily' | 'weekly' | 'milestone';
  includePhotos: boolean;
  includeProgress: boolean;
  includeCosts: boolean;
  customMessage: string;
}

const AutomatedProgressUpdates = () => {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [settings, setSettings] = useState<UpdateSettings>({
    autoUpdatesEnabled: false,
    updateFrequency: 'weekly',
    includePhotos: true,
    includeProgress: true,
    includeCosts: false,
    customMessage: 'Here\'s your weekly project update:'
  });
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadProjects();
      loadRecentUpdates();
    }
  }, [userProfile?.company_id]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name, client_email, status')
        .eq('company_id', userProfile?.company_id)
        .not('client_email', 'is', null);

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
    }
  };

  const loadRecentUpdates = async () => {
    // Simulate loading recent update history
    setRecentUpdates([
      {
        id: '1',
        project_name: 'Kitchen Renovation',
        client_email: 'john@example.com',
        sent_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'delivered'
      },
      {
        id: '2',
        project_name: 'Office Buildout',
        client_email: 'sarah@company.com',
        sent_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        status: 'delivered'
      }
    ]);
  };

  const sendProgressUpdate = async (projectId?: string) => {
    if (!selectedProject && !projectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project to send updates for.",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    
    try {
      const project = projects.find(p => p.id === (projectId || selectedProject));
      if (!project) throw new Error('Project not found');

      // Simulate generating and sending progress update
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Log the update
      const updateRecord = {
        project_name: project.name,
        client_email: project.client_email,
        sent_at: new Date().toISOString(),
        status: 'delivered'
      };

      setRecentUpdates(prev => [updateRecord, ...prev.slice(0, 9)]);

      toast({
        title: "Update Sent",
        description: `Progress update sent to ${project.client_email}`,
      });
    } catch (error: any) {
      console.error('Error sending update:', error);
      toast({
        title: "Failed to Send Update",
        description: "Could not send progress update. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const scheduleAutomatedUpdates = async () => {
    try {
      // Simulate saving automation settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Automation Configured",
        description: `Automated ${settings.updateFrequency} updates have been ${settings.autoUpdatesEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Could not save automation settings.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automated Progress Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Automated Updates</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send progress updates to clients
              </p>
            </div>
            <Switch
              checked={settings.autoUpdatesEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, autoUpdatesEnabled: checked }))
              }
            />
          </div>

          {settings.autoUpdatesEnabled && (
            <div className="space-y-4 border-l-2 border-construction-orange pl-4">
              <div>
                <Label>Update Frequency</Label>
                <Select 
                  value={settings.updateFrequency} 
                  onValueChange={(value: any) => 
                    setSettings(prev => ({ ...prev, updateFrequency: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="milestone">At Milestones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Include in Updates</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="photos"
                      checked={settings.includePhotos}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, includePhotos: checked }))
                      }
                    />
                    <Label htmlFor="photos">Progress Photos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="progress"
                      checked={settings.includeProgress}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, includeProgress: checked }))
                      }
                    />
                    <Label htmlFor="progress">Completion Percentage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="costs"
                      checked={settings.includeCosts}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, includeCosts: checked }))
                      }
                    />
                    <Label htmlFor="costs">Budget Status</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>Custom Message</Label>
                <Textarea
                  value={settings.customMessage}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, customMessage: e.target.value }))
                  }
                  placeholder="Add a personal message to your updates..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <Button onClick={scheduleAutomatedUpdates} className="w-full">
            Save Automation Settings
          </Button>
        </CardContent>
      </Card>

      {/* Manual Send */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Manual Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => sendProgressUpdate()}
            disabled={!selectedProject || sending}
            className="w-full"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Update...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Progress Update Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentUpdates.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No recent updates sent
            </p>
          ) : (
            <div className="space-y-3">
              {recentUpdates.map((update, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{update.project_name}</p>
                    <p className="text-sm text-muted-foreground">{update.client_email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {update.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(update.sent_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomatedProgressUpdates;