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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Eye, Send, MessageSquare, Users, Camera, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ClientCommunication {
  id: string;
  project_id: string;
  communication_type: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  attachments: any;
  created_at: string;
  projects?: { name: string };
}

export const ClientCommunicationPortal: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [communications, setCommunications] = useState<ClientCommunication[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('communications');

  const [communicationForm, setCommunicationForm] = useState({
    project_id: '',
    communication_type: 'update',
    subject: '',
    message: '',
    priority: 'medium'
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

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (projectsError) throw projectsError;

      setCommunications(communicationsData || []);
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

  const handleSubmit = async () => {
    if (!userProfile?.company_id || !communicationForm.project_id || !communicationForm.subject) return;

    try {
      const communicationData = {
        company_id: userProfile.company_id,
        sent_by: userProfile.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        attachments: [],
        ...communicationForm
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
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving communication:', error);
      toast({
        title: "Error",
        description: "Failed to send communication",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setCommunicationForm({
      project_id: '',
      communication_type: 'update',
      subject: '',
      message: '',
      priority: 'medium'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'read': return 'default';
      case 'replied': return 'default';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Send className="h-4 w-4 mr-2" />
              Send Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Client Communication</DialogTitle>
              <DialogDescription>
                Send updates, reports, or messages to your clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
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
                      <SelectItem value="update">Progress Update</SelectItem>
                      <SelectItem value="milestone">Milestone Report</SelectItem>
                      <SelectItem value="change_notification">Change Notification</SelectItem>
                      <SelectItem value="schedule_update">Schedule Update</SelectItem>
                      <SelectItem value="issue_alert">Issue Alert</SelectItem>
                      <SelectItem value="general">General Communication</SelectItem>
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
                  rows={6}
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
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>Send Communication</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="communications">Communications ({communications.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Communications</CardTitle>
              <CardDescription>All communications sent to clients</CardDescription>
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
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communications.map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell>{comm.projects?.name}</TableCell>
                        <TableCell className="capitalize">{comm.communication_type.replace('_', ' ')}</TableCell>
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
                        <TableCell>{format(new Date(comm.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Weekly Progress Report
                </CardTitle>
                <CardDescription>Standard weekly update template</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Project progress, completed tasks, upcoming milestones, and any issues
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Photo Update
                </CardTitle>
                <CardDescription>Visual progress documentation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Progress photos with descriptions and milestone updates
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Change Notification
                </CardTitle>
                <CardDescription>Project change communication</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Notify clients about project changes, scope modifications, or timeline adjustments
                </p>
              </CardContent>
            </Card>
          </div>
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
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {communications.length > 0 ? 
                    Math.round((communications.filter(c => c.status === 'replied').length / communications.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Client engagement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3 days</div>
                <p className="text-xs text-muted-foreground">
                  Client response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {communications.filter(c => c.priority === 'high').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Urgent communications
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};