import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, 
  FileText,
  HelpCircle,
  PlusCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Edit
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

interface RFI {
  id: string;
  project_id: string;
  rfi_number: string;
  subject: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  submitted_to?: string;
  requested_by: string;
  assigned_to: string;
  due_date: string | null;
  response_date?: string | null;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  projects: { name: string; client_name: string };
  requester: { first_name: string; last_name: string };
  assignee: { first_name: string; last_name: string };
  responses: RFIResponse[];
}

interface RFIResponse {
  id: string;
  rfi_id: string;
  response_text: string;
  responded_by: string;
  response_date: string;
  is_final_response: boolean;
  responder: { first_name: string; last_name: string };
}

const RFIs = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [rfis, setRFIs] = useState<RFI[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loadingRFIs, setLoadingRFIs] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRFI, setEditingRFI] = useState<RFI | null>(null);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isFinalResponse, setIsFinalResponse] = useState(false);
  
  const [newRFI, setNewRFI] = useState({
    project_id: '',
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    due_date: ''
  });

  const [editedRFI, setEditedRFI] = useState({
    project_id: '',
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    status: 'submitted'
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    // Check role permissions
    if (!loading && userProfile && !['admin', 'project_manager', 'field_supervisor', 'office_staff', 'root_admin'].includes(userProfile.role)) {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access RFIs."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadData();
    }
    
    // Handle project filter from navigation state
    if (location.state?.projectFilter) {
      setSelectedProject(location.state.projectFilter);
    }
  }, [user, userProfile, loading, navigate, location.state]);

  const loadData = async () => {
    try {
      setLoadingRFIs(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name, status')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load RFIs with project details
      const { data: rfisData, error: rfisError } = await supabase
        .from('rfis')
        .select(`
          *,
          projects:project_id (
            name,
            client_name
          )
        `)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (rfisError) throw rfisError;
      
      // Transform data to match expected interface
      const transformedRFIs = (rfisData || []).map(rfi => ({
        ...rfi,
        rfi_number: rfi.rfi_number || `RFI-${rfi.id?.slice(-8)}`,
        title: rfi.subject || '',
        requested_by: rfi.created_by || '',
        assigned_to: rfi.submitted_to || '',
        closed_at: null,
        requester: { first_name: 'User', last_name: '' },
        assignee: { first_name: rfi.submitted_to || 'Unassigned', last_name: '' },
        responses: []
      }));

      // Fetch responses for these RFIs
      const rfiIds = (rfisData || []).map((r: any) => r.id);
      let responsesByRfi: Record<string, RFIResponse[]> = {};
      if (rfiIds.length > 0) {
        const { data: responsesData } = await (supabase as any)
          .from('rfi_responses')
          .select('*')
          .in('rfi_id', rfiIds)
          .order('response_date', { ascending: true });

        (responsesData || []).forEach((resp: any) => {
          const arr = responsesByRfi[resp.rfi_id] || [] as RFIResponse[];
          arr.push({
            ...resp,
            responder: { first_name: 'User', last_name: '' }
          } as RFIResponse);
          responsesByRfi[resp.rfi_id] = arr;
        });
      }

      const enrichedRFIs = transformedRFIs.map((r: any) => ({
        ...r,
        responses: responsesByRfi[r.id] || []
      }));

      setRFIs(enrichedRFIs);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load RFIs data"
      });
    } finally {
      setLoadingRFIs(false);
    }
  };

  const handleCreateRFI = async () => {
    if (!newRFI.project_id || !newRFI.title || !newRFI.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      // Default SLA: 7 days if not provided
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 7);
      const dueDateVal = newRFI.due_date || defaultDue.toISOString().split('T')[0];

      const { error } = await supabase
        .from('rfis')
        .insert({
          project_id: newRFI.project_id,
          subject: newRFI.title,
          description: newRFI.description,
          priority: newRFI.priority,
          submitted_to: newRFI.assigned_to || null,
          due_date: dueDateVal,
          status: 'submitted',
          company_id: userProfile?.company_id,
          created_by: user?.id,
          rfi_number: `RFI-${Date.now().toString().slice(-8)}`
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "RFI created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewRFI({
        project_id: '',
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: '',
        due_date: ''
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error creating RFI:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create RFI"
      });
    }
  };

  const handleEditRFI = (rfi: RFI) => {
    setEditingRFI(rfi);
    setEditedRFI({
      project_id: rfi.project_id,
      title: rfi.title,
      description: rfi.description,
      priority: rfi.priority,
      assigned_to: rfi.assigned_to || '',
      due_date: rfi.due_date || '',
      status: rfi.status
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRFI = async () => {
    if (!editingRFI || !editedRFI.title || !editedRFI.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rfis')
        .update({
          project_id: editedRFI.project_id,
          subject: editedRFI.title,
          description: editedRFI.description,
          priority: editedRFI.priority,
          submitted_to: editedRFI.assigned_to || null,
          due_date: editedRFI.due_date || null,
          status: editedRFI.status
        })
        .eq('id', editingRFI.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "RFI updated successfully"
      });

      setIsEditDialogOpen(false);
      setEditingRFI(null);
      setEditedRFI({
        project_id: '',
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: '',
        due_date: '',
        status: 'submitted'
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error updating RFI:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update RFI"
      });
    }
  };

  const handleAddResponse = async () => {
    if (!responseText.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a response."
      });
      return;
    }

    try {
      if (!selectedRFI || !user || !userProfile) return;

      const { error: insertErr } = await (supabase as any)
        .from('rfi_responses')
        .insert({
          rfi_id: selectedRFI.id,
          response_text: responseText.trim(),
          responded_by: user.id,
          is_final_response: isFinalResponse,
          company_id: userProfile.company_id
        });

      if (insertErr) throw insertErr;

      // Optionally close the RFI if marked final
      if (isFinalResponse) {
        await supabase
          .from('rfis')
          .update({ status: 'closed', response_date: new Date().toISOString() })
          .eq('id', selectedRFI.id);
      }

      toast({
        title: 'Success',
        description: 'Response added successfully'
      });

      setIsResponseDialogOpen(false);
      setResponseText('');
      setIsFinalResponse(false);
      setSelectedRFI(null);
      loadData();
    } catch (error: any) {
      console.error('Error adding response:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add response'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><MessageSquare className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'closed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Closed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const filteredRFIs = selectedProject && selectedProject !== 'all'
    ? rfis.filter(rfi => rfi.project_id === selectedProject)
    : rfis;

  if (loading || loadingRFIs) {
    return (
      <DashboardLayout title="Request for Information (RFI)">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading RFIs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_VIEWERS}>
      <DashboardLayout title="Request for Information (RFI)">
        <Helmet>
        <title>RFIs Tracker – Formal Questions & Approvals | BuildDesk</title>
        <meta name="description" content="Create and track RFIs with due dates, responses, and audit trail for accountability." />
        <link rel="canonical" href="/rfis" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Request for Information</h2>
            <p className="text-sm text-muted-foreground">Track formal questions and get written responses from stakeholders</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create RFI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Request for Information</DialogTitle>
                  <DialogDescription>
                    Create a new RFI to formally request information from clients, architects, or vendors.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <Select value={newRFI.project_id} onValueChange={(value) => setNewRFI({...newRFI, project_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
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
                      placeholder="Brief description of the information request"
                      value={newRFI.title}
                      onChange={(e) => setNewRFI({...newRFI, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the information being requested..."
                      value={newRFI.description}
                      onChange={(e) => setNewRFI({...newRFI, description: e.target.value})}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newRFI.priority} onValueChange={(value) => setNewRFI({...newRFI, priority: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={newRFI.due_date}
                        onChange={(e) => setNewRFI({...newRFI, due_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRFI}>
                      Create RFI
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        </div>
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="project-filter">Filter by Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RFIs List */}
        <div className="space-y-6">
          {filteredRFIs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No RFIs</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedProject ? 'No RFIs found for selected project' : 'No RFIs have been created yet'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First RFI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredRFIs.map((rfi) => (
                <Card key={rfi.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <HelpCircle className="h-5 w-5 text-construction-blue" />
                          <span>{rfi.title}</span>
                          <Badge variant="outline">#{rfi.rfi_number}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {rfi.projects?.name} - {rfi.projects?.client_name}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(rfi.status)}
                        {getPriorityBadge(rfi.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{rfi.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Requested By
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {rfi.requester?.first_name} {rfi.requester?.last_name}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Assigned To
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {rfi.assignee?.first_name} {rfi.assignee?.last_name}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Due Date
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {rfi.due_date ? new Date(rfi.due_date).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>

                    {rfi.responses && rfi.responses.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Responses ({rfi.responses.length})</h4>
                        <div className="space-y-2">
                          {rfi.responses.map((response) => (
                            <div key={response.id} className="bg-muted p-3 rounded-md">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">
                                  {response.responder?.first_name} {response.responder?.last_name}
                                </p>
                                <div className="flex items-center space-x-2">
                                  {response.is_final_response && (
                                    <Badge variant="outline" className="text-xs">Final</Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(response.response_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{response.response_text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditRFI(rfi)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedRFI(rfi);
                          setIsResponseDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Add Response
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit RFI Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Request for Information</DialogTitle>
            <DialogDescription>
              Update the RFI details and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-project">Project *</Label>
              <Select value={editedRFI.project_id} onValueChange={(value) => setEditedRFI({...editedRFI, project_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="Brief description of the information request"
                value={editedRFI.title}
                onChange={(e) => setEditedRFI({...editedRFI, title: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                placeholder="Detailed description of the information being requested..."
                value={editedRFI.description}
                onChange={(e) => setEditedRFI({...editedRFI, description: e.target.value})}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={editedRFI.priority} onValueChange={(value) => setEditedRFI({...editedRFI, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editedRFI.status} onValueChange={(value) => setEditedRFI({...editedRFI, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-assigned-to">Assigned To</Label>
                <Input
                  id="edit-assigned-to"
                  placeholder="Person or organization"
                  value={editedRFI.assigned_to}
                  onChange={(e) => setEditedRFI({...editedRFI, assigned_to: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-due-date">Due Date</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={editedRFI.due_date}
                  onChange={(e) => setEditedRFI({...editedRFI, due_date: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRFI}>
                Update RFI
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Response</DialogTitle>
            <DialogDescription>
              Add a response to RFI: {selectedRFI?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="response">Response *</Label>
              <Textarea
                id="response"
                placeholder="Enter your response..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="final_response"
                checked={isFinalResponse}
                onChange={(e) => setIsFinalResponse(e.target.checked)}
              />
              <Label htmlFor="final_response">Mark as final response</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddResponse}>
                Add Response
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default RFIs;