import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { 
  ArrowLeft, 
  FileText,
  Upload,
  PlusCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Download,
  Eye,
  Edit
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

interface Submittal {
  id: string;
  project_id: string;
  submittal_number: string;
  title: string;
  description: string;
  spec_section: string;
  status: string;
  priority: string;
  due_date: string;
  submitted_date: string;
  approved_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  company_id: string;
  projects?: { name: string; client_name: string };
  submitter?: { first_name: string; last_name: string };
  reviewer?: { first_name: string; last_name: string };
}

interface SubmittalAttachment {
  id: string;
  submittal_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

const Submittals = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loadingSubmittals, setLoadingSubmittals] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSubmittal, setSelectedSubmittal] = useState<Submittal | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubmittal, setEditingSubmittal] = useState<Submittal | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  
  const [newSubmittal, setNewSubmittal] = useState({
    project_id: '',
    title: '',
    description: '',
    spec_section: '',
    due_date: '',
    priority: 'medium'
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
        description: "You don't have permission to access submittals."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingSubmittals(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name, status')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load submittals
      let submittalsQuery = supabase
        .from('submittals')
        .select(`
          *,
          projects:project_id (name, client_name)
        `)
        .eq('company_id', userProfile?.company_id);

      if (selectedProject && selectedProject !== 'all') {
        submittalsQuery = submittalsQuery.eq('project_id', selectedProject);
      }

      const { data: submittalsData, error: submittalsError } = await submittalsQuery
        .order('created_at', { ascending: false });

      if (submittalsError) {
        console.error('Error loading submittals:', submittalsError);
      }

      setSubmittals(submittalsData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load submittals data"
      });
    } finally {
      setLoadingSubmittals(false);
    }
  };

  const handleCreateSubmittal = async () => {
    if (!newSubmittal.project_id || !newSubmittal.title || !newSubmittal.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      // Default SLA: 10 days if not provided
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 10);
      const dueDateVal = newSubmittal.due_date || defaultDue.toISOString().split('T')[0];

      // Generate submittal number
      const submittalCount = submittals.length + 1;
      const submittalNumber = `SUB-${new Date().getFullYear()}-${submittalCount.toString().padStart(3, '0')}`;

      const { error } = await supabase
        .from('submittals')
        .insert({
          company_id: userProfile?.company_id,
          project_id: newSubmittal.project_id,
          title: newSubmittal.title,
          description: newSubmittal.description,
          spec_section: newSubmittal.spec_section,
          due_date: dueDateVal,
          priority: newSubmittal.priority,
          status: 'draft',
          submittal_number: submittalNumber,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submittal created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewSubmittal({
        project_id: '',
        title: '',
        description: '',
        spec_section: '',
        due_date: '',
        priority: 'medium'
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error creating submittal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create submittal"
      });
    }
  };

  const handleReviewSubmittal = async () => {
    if (!reviewStatus) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a review status."
      });
      return;
    }

    try {
      if (!selectedSubmittal) return;

      const { error } = await supabase
        .from('submittals')
        .update({
          status: reviewStatus,
          approved_date: reviewStatus === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', selectedSubmittal.id);

      if (error) throw error;

      // Log review entry for accountability
      await (supabase as any)
        .from('submittal_reviews')
        .insert({
          submittal_id: selectedSubmittal.id,
          reviewer_id: user?.id,
          review_status: reviewStatus,
          comments: reviewComments || null,
          company_id: userProfile?.company_id
        });

      toast({
        title: "Success",
        description: "Submittal reviewed successfully"
      });

      setIsReviewDialogOpen(false);
      setReviewComments('');
      setReviewStatus('');
      setSelectedSubmittal(null);
      
      loadData();
    } catch (error: any) {
      console.error('Error reviewing submittal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to review submittal"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'submitted':
        return <Badge variant="secondary"><Upload className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'under_review':
        return <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'revise_resubmit':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Revise & Resubmit</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
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

  const handleEditSubmittal = (submittal: Submittal) => {
    setEditingSubmittal({
      ...submittal
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmittal = async () => {
    if (!editingSubmittal || !editingSubmittal.title || !editingSubmittal.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('submittals')
        .update({
          title: editingSubmittal.title,
          description: editingSubmittal.description,
          spec_section: editingSubmittal.spec_section,
          due_date: editingSubmittal.due_date || null,
          priority: editingSubmittal.priority
        })
        .eq('id', editingSubmittal.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submittal updated successfully"
      });

      setIsEditDialogOpen(false);
      setEditingSubmittal(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating submittal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update submittal"
      });
    }
  };

  const filteredSubmittals = selectedProject && selectedProject !== 'all'
    ? submittals.filter(submittal => submittal.project_id === selectedProject)
    : submittals;

  if (loading || loadingSubmittals) {
    return (
      <DashboardLayout title="Submittals">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading submittals...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Submittals">
      <Helmet>
        <title>Submittals Tracker – Approvals & Accountability | BuildDesk</title>
        <meta name="description" content="Manage submittals with formal approvals, due dates, and review history for full accountability." />
        <link rel="canonical" href="/submittals" />
      </Helmet>
      <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 sm:h-16">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-xl font-semibold">Submittals Workflow</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Submit and track drawings, product data, and samples for approval</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Create Submittal</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Submittal</DialogTitle>
                  <DialogDescription>
                    Submit drawings, product data, or samples for approval before construction.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <Select value={newSubmittal.project_id} onValueChange={(value) => setNewSubmittal({...newSubmittal, project_id: value})}>
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
                      placeholder="Brief description of the submittal"
                      value={newSubmittal.title}
                      onChange={(e) => setNewSubmittal({...newSubmittal, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of what is being submitted..."
                      value={newSubmittal.description}
                      onChange={(e) => setNewSubmittal({...newSubmittal, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="spec-section">Specification Section</Label>
                     <Input
                       id="spec-section"
                       placeholder="e.g., 03 30 00 - Cast-in-Place Concrete"
                       value={newSubmittal.spec_section}
                       onChange={(e) => setNewSubmittal({...newSubmittal, spec_section: e.target.value})}
                     />
                   </div>
                     
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={newSubmittal.priority} onValueChange={(value) => setNewSubmittal({...newSubmittal, priority: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
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
                          value={newSubmittal.due_date}
                          onChange={(e) => setNewSubmittal({...newSubmittal, due_date: e.target.value})}
                        />
                      </div>
                   </div>


                   <div className="flex flex-col sm:flex-row justify-end gap-2">
                     <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                       Cancel
                     </Button>
                     <Button onClick={handleCreateSubmittal} className="w-full sm:w-auto">
                       Create Submittal
                     </Button>
                   </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Edit Submittal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Submittal</DialogTitle>
            <DialogDescription>
              Update submittal information and details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="Brief description of the submittal"
                value={editingSubmittal?.title || ''}
                onChange={(e) => setEditingSubmittal(prev => prev ? {...prev, title: e.target.value} : null)}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                placeholder="Detailed description of what is being submitted..."
                value={editingSubmittal?.description || ''}
                onChange={(e) => setEditingSubmittal(prev => prev ? {...prev, description: e.target.value} : null)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-spec-section">Specification Section</Label>
              <Input
                id="edit-spec-section"
                placeholder="e.g., 03 30 00 - Cast-in-Place Concrete"
                value={editingSubmittal?.spec_section || ''}
                onChange={(e) => setEditingSubmittal(prev => prev ? {...prev, spec_section: e.target.value} : null)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select 
                  value={editingSubmittal?.priority || ''} 
                  onValueChange={(value) => setEditingSubmittal(prev => prev ? {...prev, priority: value} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-due-date">Due Date</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={editingSubmittal?.due_date || ''}
                  onChange={(e) => setEditingSubmittal(prev => prev ? {...prev, due_date: e.target.value} : null)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingSubmittal(null);
                }} 
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateSubmittal} className="w-full sm:w-auto">
                Update Submittal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

          {/* Main Content */}
         <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
           {/* Filters */}
           <Card className="mb-4 sm:mb-6">
             <CardContent className="p-4 sm:p-6">
               <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                 <div className="flex-1">
                   <Label htmlFor="project-filter" className="text-sm sm:text-base">Filter by Project</Label>
                   <Select value={selectedProject} onValueChange={setSelectedProject}>
                     <SelectTrigger className="w-full">
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

        {/* Submittals List */}
        <div className="space-y-6">
          {filteredSubmittals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Submittals</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedProject ? 'No submittals found for selected project' : 'No submittals have been created yet'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Submittal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredSubmittals.map((submittal) => (
                <Card key={submittal.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Upload className="h-5 w-5 text-construction-blue" />
                          <span>{submittal.title}</span>
                          <Badge variant="outline">#{submittal.submittal_number}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {submittal.projects?.name} - {submittal.projects?.client_name}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                         {getStatusBadge(submittal.status)}
                         {getPriorityBadge(submittal.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{submittal.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Submitted By
                        </h4>
                         <p className="text-sm text-muted-foreground">
                           {submittal.created_by || 'Unknown'}
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {submittal.submitted_date && new Date(submittal.submitted_date).toLocaleDateString()}
                         </p>
                       </div>
                       
                       <div>
                         <h4 className="font-medium mb-2 flex items-center">
                           <User className="h-4 w-4 mr-2" />
                           Priority
                         </h4>
                         <p className="text-sm text-muted-foreground">
                           {submittal.priority}
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {submittal.spec_section && submittal.spec_section}
                         </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Due Date
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {submittal.due_date ? new Date(submittal.due_date).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>


                     <div className="flex justify-end space-x-2">
                       <Button size="sm" variant="outline">
                         <Eye className="h-4 w-4 mr-1" />
                         View
                       </Button>
                       <Button 
                         size="sm" 
                         variant="outline"
                         onClick={() => handleEditSubmittal(submittal)}
                       >
                         <Edit className="h-4 w-4 mr-1" />
                         Edit
                       </Button>
                       <Button 
                         size="sm" 
                         onClick={() => {
                           setSelectedSubmittal(submittal);
                           setIsReviewDialogOpen(true);
                         }}
                       >
                         <CheckCircle className="h-4 w-4 mr-1" />
                         Review
                       </Button>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Submittal</DialogTitle>
            <DialogDescription>
              Review and approve/reject submittal: {selectedSubmittal?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="review_status">Review Status *</Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select review status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="revise_resubmit">Revise & Resubmit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="review_comments">Comments</Label>
              <Textarea
                id="review_comments"
                placeholder="Add review comments..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReviewSubmittal}>
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Submittals;