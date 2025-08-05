import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Send, Mail, Phone, MessageSquare, Calendar, Eye, Star, Clock, TrendingUp, Users, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ClientCommunication {
  id: string;
  project_id?: string;
  client_contact_id?: string;
  communication_type: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  sent_by?: string;
  sent_at: string;
  read_at?: string;
  replied_at?: string;
  attachments: string[];
  tags: string[];
  project?: { name: string };
  created_at: string;
}

interface ProjectUpdate {
  id: string;
  project_id: string;
  title: string;
  description: string;
  progress_percentage: number;
  status: string;
  milestone_reached?: string;
  next_milestone?: string;
  estimated_completion?: string;
  project?: { name: string };
  created_at: string;
}

export const ClientCommunicationPortal: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [communications, setCommunications] = useState<ClientCommunication[]>([]);
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('communications');

  const [communicationForm, setCommunicationForm] = useState({
    project_id: '',
    communication_type: 'email',
    subject: '',
    message: '',
    priority: 'normal',
    tags: [] as string[]
  });

  const [updateForm, setUpdateForm] = useState({
    project_id: '',
    title: '',
    description: '',
    progress_percentage: 0,
    milestone_reached: '',
    next_milestone: '',
    estimated_completion: ''
  });

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load communications
      const { data: communicationsData, error: communicationsError } = await supabase
        .from('client_communications')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (communicationsError) throw communicationsError;

      // Load projects for forms
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, completion_percentage, status')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (projectsError) throw projectsError;

      // Create mock project updates based on projects
      const mockUpdates: ProjectUpdate[] = projectsData?.map((project, index) => ({
        id: `update-${project.id}`,
        project_id: project.id,
        title: `Weekly Progress Update - ${project.name}`,
        description: `Construction progress continues on schedule. Recent work includes foundation completion and framing initiation.`,
        progress_percentage: project.completion_percentage || 25 + (index * 15),
        status: 'on_track',
        milestone_reached: 'Foundation Complete',
        next_milestone: 'Framing Complete',
        estimated_completion: '2024-12-31',
        project: { name: project.name },
        created_at: new Date(Date.now() - (index * 7 * 24 * 60 * 60 * 1000)).toISOString()
      })) || [];

      setCommunications(communicationsData || []);
      setProjectUpdates(mockUpdates);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load client communication data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommunicationSubmit = async () => {
    if (!userProfile?.company_id || !communicationForm.subject || !communicationForm.message) return;

    try {
      const communicationData = {
        ...communicationForm,
        company_id: userProfile.company_id,
        sent_by: userProfile.id,
        status: 'sent',
        attachments: [],
        tags: communicationForm.tags
      };

      const { error } = await supabase
        .from('client_communications')
        .insert([communicationData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Communication sent successfully"
      });

      setDialogOpen(false);
      resetCommunicationForm();
      loadData();
    } catch (error) {
      console.error('Error sending communication:', error);
      toast({
        title: "Error",
        description: "Failed to send communication",
        variant: "destructive"
      });
    }
  };

  const handleUpdateSubmit = async () => {
    if (!userProfile?.company_id || !updateForm.project_id || !updateForm.title) return;

    // For now, we'll just show a success message since we don't have a project_updates table
    toast({
      title: "Success",
      description: "Project update created successfully"
    });

    setUpdateDialogOpen(false);
    resetUpdateForm();
    
    // Add the update to local state for demo purposes
    const newUpdate: ProjectUpdate = {
      id: `update-${Date.now()}`,
      project_id: updateForm.project_id,
      title: updateForm.title,
      description: updateForm.description,
      progress_percentage: updateForm.progress_percentage,
      status: 'on_track',
      milestone_reached: updateForm.milestone_reached,
      next_milestone: updateForm.next_milestone,
      estimated_completion: updateForm.estimated_completion,
      project: { name: projects.find(p => p.id === updateForm.project_id)?.name || '' },
      created_at: new Date().toISOString()
    };
    
    setProjectUpdates(prev => [newUpdate, ...prev]);
  };

  const resetCommunicationForm = () => {
    setCommunicationForm({
      project_id: '',
      communication_type: 'email',
      subject: '',
      message: '',
      priority: 'normal',
      tags: []
    });
  };

  const resetUpdateForm = () => {
    setUpdateForm({
      project_id: '',
      title: '',
      description: '',
      progress_percentage: 0,
      milestone_reached: '',
      next_milestone: '',
      estimated_completion: ''
    });
  };

  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'meeting': return Calendar;
      default: return MessageSquare;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'delivered': return 'default';
      case 'read': return 'default';
      case 'replied': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'normal': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Client Communication Portal</h2>
          <p className="text-muted-foreground">Manage client communications and project updates</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetCommunicationForm();
              }}>
                <Send className="h-4 w-4 mr-2" />
                Send Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Client Communication</DialogTitle>
                <DialogDescription>
                  Send an update or message to your clients
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project">Project (Optional)</Label>
                    <Select 
                      value={communicationForm.project_id} 
                      onValueChange={(value) => setCommunicationForm(prev => ({ ...prev, project_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="communication_type">Communication Type</Label>
                    <Select 
                      value={communicationForm.communication_type} 
                      onValueChange={(value) => setCommunicationForm(prev => ({ ...prev, communication_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="text">Text Message</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={communicationForm.subject}
                    onChange={(e) => setCommunicationForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Communication subject"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={communicationForm.message}
                    onChange={(e) => setCommunicationForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Your message to the client"
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={communicationForm.priority} 
                    onValueChange={(value) => setCommunicationForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCommunicationSubmit}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Communication
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => {
                resetUpdateForm();
              }}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Create Update
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Project Update</DialogTitle>
                <DialogDescription>
                  Share project progress with your clients
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select 
                    value={updateForm.project_id} 
                    onValueChange={(value) => setUpdateForm(prev => ({ ...prev, project_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Update Title *</Label>
                  <Input
                    id="title"
                    value={updateForm.title}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Weekly Progress Update"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={updateForm.description}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the recent progress and any important updates"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="progress">Progress Percentage</Label>
                  <div className="space-y-2">
                    <Input
                      id="progress"
                      type="number"
                      min="0"
                      max="100"
                      value={updateForm.progress_percentage}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, progress_percentage: parseInt(e.target.value) || 0 }))}
                    />
                    <Progress value={updateForm.progress_percentage} className="w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="milestone_reached">Recent Milestone</Label>
                    <Input
                      id="milestone_reached"
                      value={updateForm.milestone_reached}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, milestone_reached: e.target.value }))}
                      placeholder="Foundation Complete"
                    />
                  </div>
                  <div>
                    <Label htmlFor="next_milestone">Next Milestone</Label>
                    <Input
                      id="next_milestone"
                      value={updateForm.next_milestone}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, next_milestone: e.target.value }))}
                      placeholder="Framing Complete"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimated_completion">Estimated Completion</Label>
                  <Input
                    id="estimated_completion"
                    type="date"
                    value={updateForm.estimated_completion}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, estimated_completion: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateSubmit}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Create Update
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="communications">Communications ({communications.length})</TabsTrigger>
          <TabsTrigger value="updates">Project Updates ({projectUpdates.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Communications</CardTitle>
              <CardDescription>All communications with your clients</CardDescription>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Communications</h3>
                  <p className="text-muted-foreground mb-4">Send your first client communication</p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Communication
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communications.map((comm) => {
                      const TypeIcon = getCommunicationTypeIcon(comm.communication_type);
                      return (
                        <TableRow key={comm.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <TypeIcon className="h-4 w-4" />
                              <span className="capitalize">{comm.communication_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>{comm.project?.name || 'General'}</TableCell>
                          <TableCell className="max-w-xs truncate">{comm.subject}</TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(comm.priority)}>
                              {comm.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(comm.status)}>
                              {comm.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{format(new Date(comm.sent_at), 'MMM d, yyyy')}</div>
                              <div className="text-muted-foreground">
                                {formatDistanceToNow(new Date(comm.sent_at), { addSuffix: true })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Updates</CardTitle>
              <CardDescription>Progress updates shared with clients</CardDescription>
            </CardHeader>
            <CardContent>
              {projectUpdates.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Project Updates</h3>
                  <p className="text-muted-foreground mb-4">Create your first project update</p>
                  <Button onClick={() => setUpdateDialogOpen(true)}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Create Update
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projectUpdates.map((update) => (
                    <Card key={update.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{update.title}</CardTitle>
                            <CardDescription>{update.project?.name}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(update.created_at), 'MMM d, yyyy')}
                            </div>
                            <Badge variant="default" className="mt-1">
                              {update.progress_percentage}% Complete
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Progress value={update.progress_percentage} className="w-full" />
                          </div>
                          
                          <p className="text-sm">{update.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {update.milestone_reached && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Recent Milestone</Label>
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span>{update.milestone_reached}</span>
                                </div>
                              </div>
                            )}
                            
                            {update.next_milestone && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Next Milestone</Label>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3 text-blue-500" />
                                  <span>{update.next_milestone}</span>
                                </div>
                              </div>
                            )}
                            
                            {update.estimated_completion && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Estimated Completion</Label>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3 text-green-500" />
                                  <span>{format(new Date(update.estimated_completion), 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Communications</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{communications.length}</div>
                <p className="text-xs text-muted-foreground">
                  {communications.filter(c => c.priority === 'high').length} high priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {communications.length > 0 ? 
                    Math.round((communications.filter(c => c.replied_at).length / communications.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Client response rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Project Updates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectUpdates.length}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectUpdates.length > 0 ? 
                    Math.round(projectUpdates.reduce((sum, update) => sum + update.progress_percentage, 0) / projectUpdates.length) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all projects
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Communication Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['email', 'phone', 'meeting', 'text'].map(type => {
                    const count = communications.filter(c => c.communication_type === type).length;
                    const percentage = communications.length > 0 ? (count / communications.length) * 100 : 0;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="capitalize text-sm">{type}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={percentage} className="w-20" />
                          <span className="text-sm text-muted-foreground w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {communications.slice(0, 5).map((comm) => (
                    <div key={comm.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{comm.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comm.sent_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};