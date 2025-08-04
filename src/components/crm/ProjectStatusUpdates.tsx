import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Image,
  FileText,
  Plus,
  Eye,
  Edit3,
  Upload,
  MessageSquare
} from 'lucide-react';

interface ProjectStatusUpdate {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status_type: string;
  visibility: string;
  images: any;
  attachments: any;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  projects?: { name: string };
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

export const ProjectStatusUpdates = () => {
  const { profile } = useAuth();
  const [updates, setUpdates] = useState<ProjectStatusUpdate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [newUpdate, setNewUpdate] = useState({
    project_id: '',
    title: '',
    description: '',
    status_type: 'milestone',
    visibility: 'client',
    is_published: false
  });

  useEffect(() => {
    if (profile?.company_id) {
      loadStatusUpdates();
    }
  }, [profile?.company_id]);

  const loadStatusUpdates = async () => {
    try {
      setLoading(true);

      // Load status updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('project_status_updates')
        .select(`
          *,
          projects:project_id (name)
        `)
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name, status')
        .eq('company_id', profile?.company_id)
        .order('name', { ascending: true });

      if (projectsError) throw projectsError;

      setUpdates((updatesData as any) || []);
      setProjects((projectsData as any) || []);

    } catch (error: any) {
      console.error('Error loading status updates:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load status updates"
      });
    } finally {
      setLoading(false);
    }
  };

  const createStatusUpdate = async () => {
    if (!newUpdate.project_id || !newUpdate.title || !newUpdate.description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('project_status_updates')
        .insert({
          company_id: profile?.company_id,
          project_id: newUpdate.project_id,
          title: newUpdate.title,
          description: newUpdate.description,
          status_type: newUpdate.status_type,
          visibility: newUpdate.visibility,
          is_published: newUpdate.is_published,
          published_at: newUpdate.is_published ? new Date().toISOString() : null,
          created_by: profile?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Status update created successfully"
      });

      setNewUpdate({
        project_id: '',
        title: '',
        description: '',
        status_type: 'milestone',
        visibility: 'client',
        is_published: false
      });

      loadStatusUpdates();

    } catch (error: any) {
      console.error('Error creating status update:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create status update"
      });
    }
  };

  const togglePublishStatus = async (updateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('project_status_updates')
        .update({
          is_published: !currentStatus,
          published_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', updateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Update ${!currentStatus ? 'published' : 'unpublished'}`
      });

      loadStatusUpdates();

    } catch (error: any) {
      console.error('Error updating publish status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update publish status"
      });
    }
  };

  const getStatusTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Target className="h-4 w-4 text-green-500" />;
      case 'delay':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completion':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'issue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'bg-green-100 text-green-800';
      case 'delay':
        return 'bg-yellow-100 text-yellow-800';
      case 'completion':
        return 'bg-blue-100 text-blue-800';
      case 'issue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUpdates = selectedProject 
    ? updates.filter(update => update.project_id === selectedProject)
    : updates;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading status updates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Status Updates</h2>
          <p className="text-muted-foreground">Keep clients informed about project progress</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Status Update</DialogTitle>
              <DialogDescription>
                Share project progress with your clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={newUpdate.project_id} onValueChange={(value) => setNewUpdate(prev => ({ ...prev, project_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} - {project.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status_type">Update Type</Label>
                  <Select value={newUpdate.status_type} onValueChange={(value) => setNewUpdate(prev => ({ ...prev, status_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="delay">Delay</SelectItem>
                      <SelectItem value="completion">Completion</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={newUpdate.visibility} onValueChange={(value) => setNewUpdate(prev => ({ ...prev, visibility: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Only</SelectItem>
                      <SelectItem value="client">Client Visible</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="title">Update Title</Label>
                <Input
                  id="title"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Foundation work completed"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide details about the progress or update..."
                  rows={4}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newUpdate.is_published}
                  onCheckedChange={(checked) => setNewUpdate(prev => ({ ...prev, is_published: checked }))}
                />
                <Label>Publish immediately</Label>
              </div>
              
              <Button onClick={createStatusUpdate} className="w-full">
                Create Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Updates</p>
                <p className="text-2xl font-bold">{updates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">
                  {updates.filter(update => update.is_published).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold">
                  {updates.filter(update => update.status_type === 'milestone').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {updates.filter(update => 
                    new Date(update.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Label htmlFor="project_filter">Filter by Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Updates</CardTitle>
          <CardDescription>Recent project status updates and announcements</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredUpdates.map((update) => (
                <div key={update.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusTypeIcon(update.status_type)}
                        <h4 className="font-medium">{update.title}</h4>
                        <Badge className={getStatusTypeColor(update.status_type)}>
                          {update.status_type}
                        </Badge>
                        <Badge variant={update.is_published ? 'default' : 'secondary'}>
                          {update.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        <Badge variant="outline">{update.visibility}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {update.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Project: {update.projects?.name || 'Unknown'}</span>
                        <span>Created: {new Date(update.created_at).toLocaleDateString()}</span>
                        {update.published_at && (
                          <span>Published: {new Date(update.published_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      
                      <Switch
                        checked={update.is_published}
                        onCheckedChange={() => togglePublishStatus(update.id, update.is_published)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredUpdates.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {selectedProject ? 'No updates for this project' : 'No status updates yet'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};