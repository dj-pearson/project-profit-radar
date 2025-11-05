import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Key,
  Mail,
  Calendar,
  Globe,
  Users,
  Lock,
  Unlock,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2
} from 'lucide-react';

interface ClientPortalAccess {
  id: string;
  project_id: string;
  client_email: string;
  access_token: string;
  access_level: string;
  is_active: boolean;
  expires_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  projects?: { name: string };
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  client_email: string;
}

export const ClientPortalAccess = () => {
  const { user, userProfile } = useAuth();
  const [portalAccess, setPortalAccess] = useState<ClientPortalAccess[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAccess, setNewAccess] = useState({
    project_id: '',
    client_email: '',
    access_level: 'read_only',
    expires_at: ''
  });

  useEffect(() => {
    if (userProfile?.company_id) {
      loadPortalData();
    }
  }, [userProfile?.company_id]);

  const loadPortalData = async () => {
    try {
      setLoading(true);

      // Load existing portal access
      const { data: accessData, error: accessError } = await supabase
        .from('client_portal_access')
        .select(`
          *,
          projects:project_id (name)
        `)
        .order('created_at', { ascending: false });

      if (accessError) throw accessError;

      // Load projects for dropdown
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name, client_email')
        .eq('company_id', userProfile?.company_id)
        .order('name', { ascending: true });

      if (projectsError) throw projectsError;

      setPortalAccess((accessData as any) || []);
      setProjects((projectsData as any) || []);

    } catch (error: any) {
      console.error('Error loading portal data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load portal access data"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAccessToken = () => {
    return 'portal_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const createPortalAccess = async () => {
    if (!newAccess.project_id || !newAccess.client_email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a project and enter client email"
      });
      return;
    }

    try {
      const accessToken = generateAccessToken();
      const expiresAt = newAccess.expires_at ? new Date(newAccess.expires_at).toISOString() : null;

      const { error } = await supabase
        .from('client_portal_access')
        .insert({
          company_id: userProfile?.company_id,
          project_id: newAccess.project_id,
          client_email: newAccess.client_email,
          access_token: accessToken,
          access_level: newAccess.access_level,
          expires_at: expiresAt,
          created_by: userProfile?.id
        } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portal access created successfully"
      });

      setNewAccess({
        project_id: '',
        client_email: '',
        access_level: 'read_only',
        expires_at: ''
      });

      loadPortalData();

    } catch (error: any) {
      console.error('Error creating portal access:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create portal access"
      });
    }
  };

  const toggleAccessStatus = async (accessId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('client_portal_access')
        .update({ is_active: !currentStatus })
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Portal access ${!currentStatus ? 'activated' : 'deactivated'}`
      });

      loadPortalData();

    } catch (error: any) {
      console.error('Error updating portal access:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update portal access"
      });
    }
  };

  const copyAccessLink = (token: string) => {
    const portalUrl = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(portalUrl);
    toast({
      title: "Success",
      description: "Portal link copied to clipboard"
    });
  };

  const deletePortalAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('client_portal_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portal access deleted successfully"
      });

      loadPortalData();

    } catch (error: any) {
      console.error('Error deleting portal access:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete portal access"
      });
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'read_only':
        return 'bg-blue-100 text-blue-800';
      case 'read_write':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading portal access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Client Portal Access</h2>
          <p className="text-muted-foreground">Manage client access to project portals</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Grant Access
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Portal Access</DialogTitle>
              <DialogDescription>
                Give a client access to their project portal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={newAccess.project_id} onValueChange={(value) => setNewAccess(prev => ({ ...prev, project_id: value }))}>
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
              
              <div>
                <Label htmlFor="client_email">Client Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={newAccess.client_email}
                  onChange={(e) => setNewAccess(prev => ({ ...prev, client_email: e.target.value }))}
                  placeholder="client@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="access_level">Access Level</Label>
                <Select value={newAccess.access_level} onValueChange={(value) => setNewAccess(prev => ({ ...prev, access_level: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read_only">Read Only</SelectItem>
                    <SelectItem value="read_write">Read & Comment</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={newAccess.expires_at}
                  onChange={(e) => setNewAccess(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>
              
              <Button onClick={createPortalAccess} className="w-full">
                Create Portal Access
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Access</p>
                <p className="text-2xl font-bold">{portalAccess.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Unlock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {portalAccess.filter(access => access.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recently Used</p>
                <p className="text-2xl font-bold">
                  {portalAccess.filter(access => 
                    access.last_accessed_at && 
                    new Date(access.last_accessed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">
                  {portalAccess.filter(access => 
                    access.expires_at && new Date(access.expires_at) < new Date()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal Access Management</CardTitle>
          <CardDescription>Manage client access to project portals</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {portalAccess.map((access) => (
                <div key={access.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium">{access.projects?.name || 'Unknown Project'}</h4>
                      <Badge className={getAccessLevelColor(access.access_level)}>
                        {access.access_level.replace('_', ' ')}
                      </Badge>
                      <Badge variant={access.is_active ? 'default' : 'secondary'}>
                        {access.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-4 w-4" />
                        <span>{access.client_email}</span>
                      </div>
                      {access.last_accessed_at && (
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>Last accessed: {new Date(access.last_accessed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {access.expires_at && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Expires: {new Date(access.expires_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Token: {access.access_token.substring(0, 20)}...
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyAccessLink(access.access_token)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </Button>
                    
                    <Switch
                      checked={access.is_active}
                      onCheckedChange={() => toggleAccessStatus(access.id, access.is_active)}
                    />
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deletePortalAccess(access.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {portalAccess.length === 0 && (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No portal access granted yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};