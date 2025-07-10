import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  Eye
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
  type: string;
  status: string;
  submitted_by: string;
  reviewed_by: string;
  due_date: string;
  submitted_date: string;
  reviewed_date: string;
  approval_status: string;
  revision_number: number;
  comments: string;
  created_at: string;
  updated_at: string;
  projects: { name: string; client_name: string };
  submitter: { first_name: string; last_name: string };
  reviewer: { first_name: string; last_name: string };
  attachments: SubmittalAttachment[];
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
  const [reviewComments, setReviewComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  
  const [newSubmittal, setNewSubmittal] = useState({
    project_id: '',
    title: '',
    description: '',
    type: 'drawings',
    due_date: '',
    comments: ''
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

      // Load submittals (simulated data for now)
      // In a real implementation, this would query the submittals table
      const submittalsData: Submittal[] = [];

      // For now, we'll set empty data since the table doesn't exist yet
      setSubmittals([]);

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
      // In a real implementation, this would create the submittal record
      toast({
        title: "Success",
        description: "Submittal created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewSubmittal({
        project_id: '',
        title: '',
        description: '',
        type: 'drawings',
        due_date: '',
        comments: ''
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
      // In a real implementation, this would update the submittal review
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'drawings':
        return <Badge variant="outline">Drawings</Badge>;
      case 'specifications':
        return <Badge variant="outline">Specifications</Badge>;
      case 'product_data':
        return <Badge variant="outline">Product Data</Badge>;
      case 'samples':
        return <Badge variant="outline">Samples</Badge>;
      case 'calculations':
        return <Badge variant="outline">Calculations</Badge>;
      case 'certifications':
        return <Badge variant="outline">Certifications</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredSubmittals = selectedProject && selectedProject !== 'all'
    ? submittals.filter(submittal => submittal.project_id === selectedProject)
    : submittals;

  if (loading || loadingSubmittals) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submittals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">Submittals Workflow</h1>
                <p className="text-sm text-muted-foreground">Submit and track drawings, product data, and samples for approval</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Submittal
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select value={newSubmittal.type} onValueChange={(value) => setNewSubmittal({...newSubmittal, type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="drawings">Drawings</SelectItem>
                          <SelectItem value="specifications">Specifications</SelectItem>
                          <SelectItem value="product_data">Product Data</SelectItem>
                          <SelectItem value="samples">Samples</SelectItem>
                          <SelectItem value="calculations">Calculations</SelectItem>
                          <SelectItem value="certifications">Certifications</SelectItem>
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

                  <div>
                    <Label htmlFor="comments">Comments</Label>
                    <Textarea
                      id="comments"
                      placeholder="Additional comments or instructions..."
                      value={newSubmittal.comments}
                      onChange={(e) => setNewSubmittal({...newSubmittal, comments: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSubmittal}>
                      Create Submittal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                        {getTypeBadge(submittal.type)}
                        <Badge variant="outline">Rev {submittal.revision_number}</Badge>
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
                          {submittal.submitter?.first_name} {submittal.submitter?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submittal.submitted_date && new Date(submittal.submitted_date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Reviewed By
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {submittal.reviewer?.first_name} {submittal.reviewer?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submittal.reviewed_date && new Date(submittal.reviewed_date).toLocaleDateString()}
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

                    {submittal.comments && (
                      <div>
                        <h4 className="font-medium mb-2">Comments</h4>
                        <p className="text-sm text-muted-foreground">{submittal.comments}</p>
                      </div>
                    )}

                    {submittal.attachments && submittal.attachments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Attachments ({submittal.attachments.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {submittal.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-muted rounded-md">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground flex-1">{attachment.file_name}</span>
                              <Button variant="ghost" size="sm">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedSubmittal(submittal);
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
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
  );
};

export default Submittals;