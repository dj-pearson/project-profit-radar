import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Eye, 
  Calendar, 
  MapPin, 
  User, 
  DollarSign,
  MoreHorizontal,
  Trash2,
  CalendarDays,
  FileText,
  Package,
  FilterX,
  SlidersHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  client_name: string;
  site_address: string;
  status: string;
  completion_percentage: number;
  budget: number;
  start_date: string;
  end_date: string;
  description?: string;
  project_manager_id?: string;
  created_at: string;
  updated_at: string;
  tasks?: Array<{ id: string; name: string; description?: string }>;
  materials?: Array<{ id: string; name: string; description?: string }>;
  documents?: Array<{ id: string; name: string; description?: string }>;
}

const Projects = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Advanced filter states
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [materialFilter, setMaterialFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('projects')
        .select(`
          *,
          tasks(id, name, description),
          materials(id, name, description),
          documents(id, name, description)
        `)
        .order('created_at', { ascending: false });

      if (userProfile?.role !== 'root_admin' && userProfile?.company_id) {
        query = query.eq('company_id', userProfile.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading projects",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { ...project, ...updates }
            : project
        )
      );

      toast({
        title: "Project updated",
        description: "Project has been updated successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating project",
        description: error.message
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.filter(project => project.id !== projectId));
      
      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting project",
        description: error.message
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      name: formData.get('name') as string,
      client_name: formData.get('client_name') as string,
      site_address: formData.get('site_address') as string,
      status: formData.get('status') as string,
      completion_percentage: parseInt(formData.get('completion_percentage') as string),
      budget: parseFloat(formData.get('budget') as string),
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      description: formData.get('description') as string,
    };

    await handleUpdateProject(editingProject.id, updates);
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      case 'planning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getHealthColor = (completion: number, status: string) => {
    if (status === 'completed') return 'text-green-600';
    if (completion >= 75) return 'text-green-600';
    if (completion >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBudgetMin('');
    setBudgetMax('');
    setStartDate(undefined);
    setEndDate(undefined);
    setMaterialFilter('');
    setTaskFilter('');
    setDocumentFilter('');
  };

  const filteredProjects = projects.filter(project => {
    // Basic search
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.site_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    // Budget range filter
    const matchesBudget = (!budgetMin || project.budget >= parseFloat(budgetMin)) &&
                         (!budgetMax || project.budget <= parseFloat(budgetMax));
    
    // Date range filters
    const projectStartDate = new Date(project.start_date);
    const projectEndDate = new Date(project.end_date);
    const matchesStartDate = !startDate || projectStartDate >= startDate;
    const matchesEndDate = !endDate || projectEndDate <= endDate;
    
    // Material filter
    const matchesMaterial = !materialFilter || 
      (project.materials && Array.isArray(project.materials) && 
       project.materials.some((material: any) => 
         material.name?.toLowerCase().includes(materialFilter.toLowerCase()) ||
         material.description?.toLowerCase().includes(materialFilter.toLowerCase())
       ));
    
    // Task filter
    const matchesTask = !taskFilter || 
      (project.tasks && Array.isArray(project.tasks) && 
       project.tasks.some((task: any) => 
         task.name?.toLowerCase().includes(taskFilter.toLowerCase()) ||
         task.description?.toLowerCase().includes(taskFilter.toLowerCase())
       ));
    
    // Document filter
    const matchesDocument = !documentFilter || 
      (project.documents && Array.isArray(project.documents) && 
       project.documents.some((doc: any) => 
         doc.name?.toLowerCase().includes(documentFilter.toLowerCase()) ||
         doc.description?.toLowerCase().includes(documentFilter.toLowerCase())
       ));
    
    return matchesSearch && matchesStatus && matchesBudget && 
           matchesStartDate && matchesEndDate && matchesMaterial && 
           matchesTask && matchesDocument;
  });

  const getProjectsByStatus = (status: string) => {
    return filteredProjects.filter(project => project.status === status);
  };

  const activeProjects = getProjectsByStatus('active').concat(getProjectsByStatus('in_progress'));
  const completedProjects = getProjectsByStatus('completed');
  const onHoldProjects = getProjectsByStatus('on_hold');
  const planningProjects = getProjectsByStatus('planning');

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">{project.client_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(project.status)} className="text-xs">
              {project.status.replace('_', ' ')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/project/${project.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Project Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setEditingProject(project);
                  setEditDialogOpen(true);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{project.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.site_address && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{project.site_address}</span>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className={getHealthColor(project.completion_percentage, project.status)}>
              {project.completion_percentage}%
            </span>
          </div>
          <Progress value={project.completion_percentage} className="h-2" />
        </div>

        {project.budget && (
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">Budget: ${project.budget.toLocaleString()}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{new Date(project.start_date).toLocaleDateString()}</span>
          </div>
          <div className="truncate ml-2">
            Due: {new Date(project.end_date).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LoadingState message="Loading projects..." />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1">
          {/* Header */}
          <nav className="border-b bg-background/95 backdrop-blur-sm">
            <div className="flex justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
              <div className="flex items-center min-w-0 flex-1">
                <SidebarTrigger className="mr-2 sm:mr-3 lg:mr-4 flex-shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">Projects</h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-shrink-0">
                <Button onClick={() => navigate('/create-project')} size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Project</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <ResponsiveContainer className="py-6">
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              {/* Main Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects, clients, addresses, descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="px-3"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Advanced
                  </Button>
                  {(budgetMin || budgetMax || startDate || endDate || materialFilter || taskFilter || documentFilter) && (
                    <Button
                      variant="ghost"
                      onClick={clearAllFilters}
                      className="px-3"
                    >
                      <FilterX className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Budget Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Budget Range</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Min ($)"
                          type="number"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Max ($)"
                          type="number"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Start Date Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Date From</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Pick start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* End Date Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Date To</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Pick end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Materials Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Materials</Label>
                      <div className="relative">
                        <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search materials..."
                          value={materialFilter}
                          onChange={(e) => setMaterialFilter(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Tasks Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tasks</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tasks..."
                          value={taskFilter}
                          onChange={(e) => setTaskFilter(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Documents Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Documents</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search documents..."
                          value={documentFilter}
                          onChange={(e) => setDocumentFilter(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Results Count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {filteredProjects.length} of {projects.length} projects
                </span>
                {filteredProjects.length !== projects.length && (
                  <span>
                    {projects.length - filteredProjects.length} projects filtered out
                  </span>
                )}
              </div>
            </div>

            {/* Projects Tabs */}
            <Tabs defaultValue="active" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="active">
                  Active ({activeProjects.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedProjects.length})
                </TabsTrigger>
                <TabsTrigger value="on_hold">
                  On Hold ({onHoldProjects.length})
                </TabsTrigger>
                <TabsTrigger value="planning">
                  Planning ({planningProjects.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {activeProjects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No active projects</h3>
                      <p className="text-muted-foreground mb-4">Get started by creating your first project.</p>
                      <Button onClick={() => navigate('/create-project')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} className="gap-6">
                    {activeProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </ResponsiveGrid>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {completedProjects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No completed projects</h3>
                      <p className="text-muted-foreground">Completed projects will appear here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} className="gap-6">
                    {completedProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </ResponsiveGrid>
                )}
              </TabsContent>

              <TabsContent value="on_hold" className="space-y-4">
                {onHoldProjects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No projects on hold</h3>
                      <p className="text-muted-foreground">Projects on hold will appear here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} className="gap-6">
                    {onHoldProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </ResponsiveGrid>
                )}
              </TabsContent>

              <TabsContent value="planning" className="space-y-4">
                {planningProjects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No projects in planning</h3>
                      <p className="text-muted-foreground">Projects in planning phase will appear here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} className="gap-6">
                    {planningProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </ResponsiveGrid>
                )}
              </TabsContent>
            </Tabs>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" name="name" defaultValue={editingProject.name} required />
                </div>
                <div>
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input id="client_name" name="client_name" defaultValue={editingProject.client_name} required />
                </div>
              </div>
              
              <div>
                <Label htmlFor="site_address">Site Address</Label>
                <Input id="site_address" name="site_address" defaultValue={editingProject.site_address} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingProject.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="completion_percentage">Completion %</Label>
                  <Input 
                    id="completion_percentage" 
                    name="completion_percentage" 
                    type="number" 
                    min="0" 
                    max="100" 
                    defaultValue={editingProject.completion_percentage} 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input 
                  id="budget" 
                  name="budget" 
                  type="number" 
                  step="0.01" 
                  defaultValue={editingProject.budget} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input 
                    id="start_date" 
                    name="start_date" 
                    type="date" 
                    defaultValue={editingProject.start_date} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input 
                    id="end_date" 
                    name="end_date" 
                    type="date" 
                    defaultValue={editingProject.end_date} 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  defaultValue={editingProject.description} 
                  rows={3} 
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Project</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Projects;