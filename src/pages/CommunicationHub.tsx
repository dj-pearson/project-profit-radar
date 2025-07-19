import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProjectCommunication } from '@/components/communication/ProjectCommunication';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare,
  Search,
  Building2,
  Clock,
  Users,
  Filter,
  ArrowRight
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name: string;
  client_email: string;
  status: string;
  unread_count?: number;
  last_message_at?: string;
}

interface ProjectMessage {
  id: string;
  project_id: string;
  project_name: string;
  message_text: string;
  sender_name: string;
  sender_type: 'client' | 'contractor';
  created_at: string;
  is_read: boolean;
}

const CommunicationHub = () => {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [recentMessages, setRecentMessages] = useState<ProjectMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userProfile?.company_id) {
      loadCommunicationData();
    }
  }, [userProfile?.company_id]);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);

      // Load projects with communication data
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          client_name,
          client_email,
          status
        `)
        .eq('company_id', userProfile?.company_id)
        .order('updated_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Load recent messages across all projects
      const { data: messagesData, error: messagesError } = await supabase
        .from('project_messages')
        .select(`
          id,
          project_id,
          message_text,
          sender_type,
          created_at,
          is_read,
          sender:user_profiles!project_messages_sender_id_fkey(first_name, last_name),
          projects:project_id (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (messagesError) throw messagesError;

      // Process messages to include project names and sender names
      const processedMessages = messagesData?.map(msg => ({
        id: msg.id,
        project_id: msg.project_id,
        project_name: (msg.projects as any)?.name || 'Unknown Project',
        message_text: msg.message_text || '',
        sender_name: msg.sender ? `${(msg.sender as any).first_name} ${(msg.sender as any).last_name}`.trim() : 'Unknown',
        sender_type: msg.sender_type as 'client' | 'contractor',
        created_at: msg.created_at,
        is_read: msg.is_read
      })) || [];

      // Calculate unread counts for each project
      const projectsWithCounts = projectsData?.map(project => {
        const unreadCount = processedMessages.filter(
          msg => msg.project_id === project.id && !msg.is_read && msg.sender_type === 'client'
        ).length;
        
        const lastMessage = processedMessages.find(msg => msg.project_id === project.id);
        
        return {
          ...project,
          unread_count: unreadCount,
          last_message_at: lastMessage?.created_at
        };
      }) || [];

      setProjects(projectsWithCounts);
      setRecentMessages(processedMessages);

      if (projectsWithCounts.length > 0) {
        setSelectedProject(projectsWithCounts[0]);
      }

    } catch (error: any) {
      console.error('Error loading communication data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load communication data"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
      case 'in_progress':
        return 'bg-blue-500';
      case 'on_hold':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout title="Communication Hub">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading communications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Communication Hub">
      <div className="space-y-6">
        {/* Header with quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                  <p className="text-2xl font-bold">{recentMessages.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Conversations</p>
                  <p className="text-2xl font-bold">{projects.filter(p => p.unread_count || 0 > 0).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Projects</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold">
                    {projects.reduce((sum, p) => sum + (p.unread_count || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="conversations">Active Conversations</TabsTrigger>
            <TabsTrigger value="recent">Recent Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project List */}
              <Card>
                <CardHeader>
                  <CardTitle>Projects with Communications</CardTitle>
                  <CardDescription>Select a project to view messages</CardDescription>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects or clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedProject?.id === project.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedProject(project)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium truncate">{project.name}</h4>
                                {project.unread_count && project.unread_count > 0 && (
                                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                                    {project.unread_count}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {project.client_name || 'No client assigned'}
                              </p>
                              {project.last_message_at && (
                                <p className="text-xs text-muted-foreground">
                                  Last message: {formatTimeAgo(project.last_message_at)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(project.status)}>
                                {project.status}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Selected Project Communication */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedProject ? selectedProject.name : 'Select a Project'}
                  </CardTitle>
                  <CardDescription>
                    {selectedProject
                      ? `Communicate with ${selectedProject.client_name || 'project team'}`
                      : 'Choose a project from the list to view messages'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedProject ? (
                    <div className="h-[400px]">
                      <ProjectCommunication
                        projectId={selectedProject.id}
                        userType="contractor"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[400px]">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Select a project to start communicating</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Conversations</CardTitle>
                <CardDescription>Projects with recent message activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects
                    .filter(project => project.unread_count && project.unread_count > 0)
                    .map((project) => (
                      <div key={project.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{project.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {project.client_name || 'No client assigned'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              {project.unread_count} unread
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedProject(project);
                                setActiveTab('overview');
                              }}
                            >
                              View Messages
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {projects.filter(p => p.unread_count && p.unread_count > 0).length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No active conversations</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>Latest messages across all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {recentMessages.map((message) => (
                      <div key={message.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="font-medium text-sm">{message.project_name}</h5>
                              <Badge
                                variant={message.sender_type === 'client' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {message.sender_type === 'client' ? 'Client' : 'Team'}
                              </Badge>
                              {!message.is_read && message.sender_type === 'client' && (
                                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {message.sender_name}
                            </p>
                            <p className="text-sm line-clamp-2">{message.message_text}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {recentMessages.length === 0 && (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent messages</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CommunicationHub;