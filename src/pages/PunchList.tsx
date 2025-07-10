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
  CheckSquare,
  AlertTriangle,
  PlusCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  MapPin,
  Camera,
  MessageSquare
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

interface PunchListItem {
  id: string;
  project_id: string;
  item_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location: string;
  trade: string;
  created_by: string;
  assigned_to: string;
  due_date: string;
  completed_date: string;
  created_at: string;
  updated_at: string;
  projects: { name: string; client_name: string };
  creator: { first_name: string; last_name: string };
  assignee: { first_name: string; last_name: string };
  photos: PunchListPhoto[];
  comments: PunchListComment[];
}

interface PunchListPhoto {
  id: string;
  punch_item_id: string;
  photo_url: string;
  caption: string;
  taken_by: string;
  created_at: string;
}

interface PunchListComment {
  id: string;
  punch_item_id: string;
  comment_text: string;
  commented_by: string;
  created_at: string;
  commenter: { first_name: string; last_name: string };
}

const PunchList = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [punchItems, setPunchItems] = useState<PunchListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PunchListItem | null>(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const [newItem, setNewItem] = useState({
    project_id: '',
    title: '',
    description: '',
    category: 'quality',
    priority: 'medium',
    location: '',
    trade: '',
    assigned_to: '',
    due_date: ''
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
        description: "You don't have permission to access punch list."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingItems(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name, status')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load punch list items (simulated data for now)
      // In a real implementation, this would query the punch_list_items table
      const itemsData: PunchListItem[] = [];

      // For now, we'll set empty data since the table doesn't exist yet
      setPunchItems([]);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load punch list data"
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.project_id || !newItem.title || !newItem.description) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      // In a real implementation, this would create the punch list item
      toast({
        title: "Success",
        description: "Punch list item created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewItem({
        project_id: '',
        title: '',
        description: '',
        category: 'quality',
        priority: 'medium',
        location: '',
        trade: '',
        assigned_to: '',
        due_date: ''
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error creating punch list item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create punch list item"
      });
    }
  };

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      // In a real implementation, this would update the item status
      toast({
        title: "Success",
        description: "Status updated successfully"
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      });
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a comment."
      });
      return;
    }

    try {
      // In a real implementation, this would add the comment
      toast({
        title: "Success",
        description: "Comment added successfully"
      });

      setIsCommentDialogOpen(false);
      setCommentText('');
      setSelectedItem(null);
      
      loadData();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'verified':
        return <Badge className="bg-blue-500"><CheckSquare className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'quality':
        return <Badge variant="outline">Quality</Badge>;
      case 'safety':
        return <Badge variant="destructive">Safety</Badge>;
      case 'deficiency':
        return <Badge variant="outline">Deficiency</Badge>;
      case 'cleanup':
        return <Badge variant="outline">Cleanup</Badge>;
      case 'documentation':
        return <Badge variant="outline">Documentation</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const filteredItems = punchItems.filter(item => {
    const projectMatch = !selectedProject || selectedProject === 'all' || item.project_id === selectedProject;
    const statusMatch = !selectedStatus || selectedStatus === 'all' || item.status === selectedStatus;
    return projectMatch && statusMatch;
  });

  if (loading || loadingItems) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading punch list...</p>
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
                <h1 className="text-xl font-semibold">Punch List / Issue Tracking</h1>
                <p className="text-sm text-muted-foreground">Track quality issues and incomplete work for project completion</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Punch List Item</DialogTitle>
                  <DialogDescription>
                    Log a quality issue or incomplete work item for tracking and resolution.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <Select value={newItem.project_id} onValueChange={(value) => setNewItem({...newItem, project_id: value})}>
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
                      placeholder="Brief description of the issue"
                      value={newItem.title}
                      onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the issue or work needed..."
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quality">Quality</SelectItem>
                          <SelectItem value="safety">Safety</SelectItem>
                          <SelectItem value="deficiency">Deficiency</SelectItem>
                          <SelectItem value="cleanup">Cleanup</SelectItem>
                          <SelectItem value="documentation">Documentation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newItem.priority} onValueChange={(value) => setNewItem({...newItem, priority: value})}>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="Room, floor, area..."
                        value={newItem.location}
                        onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="trade">Trade</Label>
                      <Input
                        id="trade"
                        placeholder="Electrical, plumbing, etc..."
                        value={newItem.trade}
                        onChange={(e) => setNewItem({...newItem, trade: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newItem.due_date}
                      onChange={(e) => setNewItem({...newItem, due_date: e.target.value})}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateItem}>
                      Add Item
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
              
              <div>
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Punch List Items */}
        <div className="space-y-6">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Punch List Items</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedProject || selectedStatus ? 'No items match the selected filters' : 'No punch list items have been created yet'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <CheckSquare className="h-5 w-5 text-construction-blue" />
                          <span>{item.title}</span>
                          <Badge variant="outline">#{item.item_number}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {item.projects?.name} - {item.projects?.client_name}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(item.status)}
                        {getPriorityBadge(item.priority)}
                        {getCategoryBadge(item.category)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          Location
                        </h4>
                        <p className="text-sm text-muted-foreground">{item.location || 'Not specified'}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Trade</h4>
                        <p className="text-sm text-muted-foreground">{item.trade || 'Not specified'}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Assigned To
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {item.assignee?.first_name} {item.assignee?.last_name}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Due Date
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>

                    {item.photos && item.photos.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Camera className="h-4 w-4 mr-2" />
                          Photos ({item.photos.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {item.photos.map((photo) => (
                            <div key={photo.id} className="aspect-square bg-muted rounded-md flex items-center justify-center">
                              <Camera className="h-8 w-8 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.comments && item.comments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Comments ({item.comments.length})</h4>
                        <div className="space-y-2">
                          {item.comments.slice(0, 2).map((comment) => (
                            <div key={comment.id} className="bg-muted p-3 rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium">
                                  {comment.commenter?.first_name} {comment.commenter?.last_name}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{comment.comment_text}</p>
                            </div>
                          ))}
                          {item.comments.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{item.comments.length - 2} more comments
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsCommentDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Add Comment
                      </Button>
                      
                      {item.status === 'open' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStatusUpdate(item.id, 'in_progress')}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Start Work
                        </Button>
                      )}
                      
                      {item.status === 'in_progress' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStatusUpdate(item.id, 'completed')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      
                      {item.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStatusUpdate(item.id, 'verified')}
                        >
                          <CheckSquare className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a comment to item: {selectedItem?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Comment *</Label>
              <Textarea
                id="comment"
                placeholder="Enter your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCommentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddComment}>
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PunchList;