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
import { Plus, Edit, Eye, CheckCircle, XCircle, Clock, FileText, MessageSquare, Send, Upload } from 'lucide-react';
import { format } from 'date-fns';

interface RFI {
  id: string;
  rfi_number: string;
  project_id: string;
  subject: string;
  description?: string;
  priority: string;
  status: string;
  created_by?: string;
  submitted_to?: string;
  due_date?: string;
  response_date?: string;
  created_at: string;
  projects?: { name: string };
}

interface Submittal {
  id: string;
  submittal_number: string;
  project_id: string;
  title: string;
  description?: string;
  spec_section?: string;
  priority: string;
  status: string;
  created_by?: string;
  due_date?: string;
  approved_date?: string;
  created_at: string;
  projects?: { name: string };
}

export const RFISubmittalManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfiDialogOpen, setRfiDialogOpen] = useState(false);
  const [submittalDialogOpen, setSubmittalDialogOpen] = useState(false);
  const [editingRfi, setEditingRfi] = useState<RFI | null>(null);
  const [editingSubmittal, setEditingSubmittal] = useState<Submittal | null>(null);
  const [activeTab, setActiveTab] = useState('rfis');

  const [rfiForm, setRfiForm] = useState({
    project_id: '',
    subject: '',
    description: '',
    priority: 'medium',
    submitted_to: '',
    due_date: ''
  });

  const [submittalForm, setSubmittalForm] = useState({
    project_id: '',
    title: '',
    description: '',
    spec_section: '',
    priority: 'medium',
    due_date: ''
  });

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load RFIs
      const { data: rfisData, error: rfisError } = await supabase
        .from('rfis')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (rfisError) throw rfisError;

      // Load Submittals
      const { data: submittalsData, error: submittalsError } = await supabase
        .from('submittals')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (submittalsError) throw submittalsError;

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (projectsError) throw projectsError;

      // Load team members
      const { data: teamData, error: teamError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('company_id', userProfile.company_id);

      if (teamError) throw teamError;

      setRfis(rfisData || []);
      setSubmittals(submittalsData || []);
      setProjects(projectsData || []);
      setTeamMembers(teamData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load RFI and submittal data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRfiSubmit = async () => {
    if (!userProfile?.company_id || !rfiForm.project_id || !rfiForm.subject) return;

    try {
      const rfiData = {
        ...rfiForm,
        company_id: userProfile.company_id,
        rfi_number: `RFI-${Date.now().toString().slice(-8)}`,
        created_by: userProfile.id,
        status: 'open'
      };

      if (editingRfi) {
        const { error } = await supabase
          .from('rfis')
          .update(rfiData)
          .eq('id', editingRfi.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "RFI updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('rfis')
          .insert([rfiData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "RFI created successfully"
        });
      }

      setRfiDialogOpen(false);
      setEditingRfi(null);
      resetRfiForm();
      loadData();
    } catch (error) {
      console.error('Error saving RFI:', error);
      toast({
        title: "Error",
        description: "Failed to save RFI",
        variant: "destructive"
      });
    }
  };

  const handleSubmittalSubmit = async () => {
    if (!userProfile?.company_id || !submittalForm.project_id || !submittalForm.title) return;

    try {
      const submittalData = {
        ...submittalForm,
        company_id: userProfile.company_id,
        submittal_number: `SUB-${Date.now().toString().slice(-8)}`,
        created_by: userProfile.id,
        status: 'not_submitted'
      };

      if (editingSubmittal) {
        const { error } = await supabase
          .from('submittals')
          .update(submittalData)
          .eq('id', editingSubmittal.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Submittal updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('submittals')
          .insert([submittalData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Submittal created successfully"
        });
      }

      setSubmittalDialogOpen(false);
      setEditingSubmittal(null);
      resetSubmittalForm();
      loadData();
    } catch (error) {
      console.error('Error saving submittal:', error);
      toast({
        title: "Error",
        description: "Failed to save submittal",
        variant: "destructive"
      });
    }
  };

  const updateRfiStatus = async (rfiId: string, newStatus: string, response?: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'closed') {
        updateData.response_date = new Date().toISOString();
        if (response) updateData.response = response;
      }

      const { error } = await supabase
        .from('rfis')
        .update(updateData)
        .eq('id', rfiId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `RFI ${newStatus} successfully`
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating RFI:', error);
      toast({
        title: "Error",
        description: "Failed to update RFI",
        variant: "destructive"
      });
    }
  };

  const updateSubmittalStatus = async (submittalId: string, newStatus: string, comments?: string) => {
    try {
      const updateData: any = { status: newStatus };
      const now = new Date().toISOString();
      
      if (newStatus === 'submitted') {
        updateData.submitted_date = now;
      } else if (newStatus === 'approved') {
        updateData.approved_date = now;
      }

      const { error } = await supabase
        .from('submittals')
        .update(updateData)
        .eq('id', submittalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Submittal ${newStatus.replace('_', ' ')} successfully`
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating submittal:', error);
      toast({
        title: "Error",
        description: "Failed to update submittal",
        variant: "destructive"
      });
    }
  };

  const resetRfiForm = () => {
    setRfiForm({
      project_id: '',
      subject: '',
      description: '',
      priority: 'medium',
      submitted_to: '',
      due_date: ''
    });
  };

  const resetSubmittalForm = () => {
    setSubmittalForm({
      project_id: '',
      title: '',
      description: '',
      spec_section: '',
      priority: 'medium',
      due_date: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'closed': return 'default';
      case 'not_submitted': return 'secondary';
      case 'submitted': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
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
          <h2 className="text-2xl font-bold">RFIs & Submittals</h2>
          <p className="text-muted-foreground">Manage requests for information and submittal workflows</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={rfiDialogOpen} onOpenChange={setRfiDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingRfi(null);
                resetRfiForm();
              }}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Create RFI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRfi ? 'Edit RFI' : 'Create New RFI'}</DialogTitle>
                <DialogDescription>
                  Submit a request for information about project details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select 
                    value={rfiForm.project_id} 
                    onValueChange={(value) => setRfiForm(prev => ({ ...prev, project_id: value }))}
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
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={rfiForm.subject}
                    onChange={(e) => setRfiForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief description of the request"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={rfiForm.description}
                    onChange={(e) => setRfiForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of what information is needed"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={rfiForm.priority} 
                      onValueChange={(value) => setRfiForm(prev => ({ ...prev, priority: value }))}
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
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={rfiForm.due_date}
                      onChange={(e) => setRfiForm(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setRfiDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleRfiSubmit}>
                    {editingRfi ? 'Update' : 'Create'} RFI
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={submittalDialogOpen} onOpenChange={setSubmittalDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => {
                setEditingSubmittal(null);
                resetSubmittalForm();
              }}>
                <Upload className="h-4 w-4 mr-2" />
                Create Submittal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSubmittal ? 'Edit Submittal' : 'Create New Submittal'}</DialogTitle>
                <DialogDescription>
                  Create a submittal for project documentation review
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select 
                    value={submittalForm.project_id} 
                    onValueChange={(value) => setSubmittalForm(prev => ({ ...prev, project_id: value }))}
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
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={submittalForm.title}
                    onChange={(e) => setSubmittalForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Submittal title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={submittalForm.description}
                    onChange={(e) => setSubmittalForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the submittal"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spec_section">Specification Section</Label>
                    <Input
                      id="spec_section"
                      value={submittalForm.spec_section}
                      onChange={(e) => setSubmittalForm(prev => ({ ...prev, spec_section: e.target.value }))}
                      placeholder="e.g., 03 30 00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={submittalForm.priority} 
                      onValueChange={(value) => setSubmittalForm(prev => ({ ...prev, priority: value }))}
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
                </div>

                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={submittalForm.due_date}
                    onChange={(e) => setSubmittalForm(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSubmittalDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmittalSubmit}>
                    {editingSubmittal ? 'Update' : 'Create'} Submittal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rfis">RFIs ({rfis.length})</TabsTrigger>
          <TabsTrigger value="submittals">Submittals ({submittals.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rfis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requests for Information</CardTitle>
              <CardDescription>Track and manage project information requests</CardDescription>
            </CardHeader>
            <CardContent>
              {rfis.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No RFIs</h3>
                  <p className="text-muted-foreground mb-4">Create your first request for information</p>
                  <Button onClick={() => setRfiDialogOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Create RFI
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfis.map((rfi) => (
                      <TableRow key={rfi.id}>
                        <TableCell className="font-medium">{rfi.rfi_number}</TableCell>
                        <TableCell>{rfi.projects?.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{rfi.subject}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(rfi.priority)}>
                            {rfi.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(rfi.status)}>
                            {rfi.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rfi.due_date ? format(new Date(rfi.due_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{format(new Date(rfi.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {rfi.status === 'open' && (
                              <Button
                                size="sm"
                                onClick={() => updateRfiStatus(rfi.id, 'closed', 'Information provided')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingRfi(rfi);
                                setRfiForm({
                                  project_id: rfi.project_id,
                                  subject: rfi.subject,
                                  description: rfi.description || '',
                                  priority: rfi.priority,
                                  submitted_to: rfi.submitted_to || '',
                                  due_date: rfi.due_date || ''
                                });
                                setRfiDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submittals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submittals</CardTitle>
              <CardDescription>Manage project documentation and approval workflows</CardDescription>
            </CardHeader>
            <CardContent>
              {submittals.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Submittals</h3>
                  <p className="text-muted-foreground mb-4">Create your first submittal</p>
                  <Button onClick={() => setSubmittalDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Create Submittal
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submittals.map((submittal) => (
                      <TableRow key={submittal.id}>
                        <TableCell className="font-medium">{submittal.submittal_number}</TableCell>
                        <TableCell>{submittal.projects?.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{submittal.title}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(submittal.priority)}>
                            {submittal.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(submittal.status)}>
                            {submittal.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submittal.due_date ? format(new Date(submittal.due_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {submittal.status === 'not_submitted' && (
                              <Button
                                size="sm"
                                onClick={() => updateSubmittalStatus(submittal.id, 'submitted')}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {submittal.status === 'submitted' && ['admin', 'project_manager'].includes(userProfile?.role) && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateSubmittalStatus(submittal.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateSubmittalStatus(submittal.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSubmittal(submittal);
                                setSubmittalForm({
                                  project_id: submittal.project_id,
                                  title: submittal.title,
                                  description: submittal.description || '',
                                  spec_section: submittal.spec_section || '',
                                  priority: submittal.priority,
                                  due_date: submittal.due_date || ''
                                });
                                setSubmittalDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open RFIs</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rfis.filter(rfi => rfi.status === 'open').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {rfis.filter(rfi => rfi.priority === 'high' && rfi.status === 'open').length} high priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Submittals</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {submittals.filter(s => s.status === 'submitted').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RFI Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  3.2 days
                </div>
                <p className="text-xs text-muted-foreground">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {submittals.filter(s => s.status === 'approved').length > 0 ? 
                    Math.round((submittals.filter(s => s.status === 'approved').length / submittals.filter(s => ['approved', 'rejected'].includes(s.status)).length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  First submission approval
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};