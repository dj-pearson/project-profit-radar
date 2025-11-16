import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/loading-spinner";
import { ProjectCardSkeleton } from "@/components/ui/loading-skeleton";
import {
  ResponsiveContainer,
  ResponsiveGrid,
} from "@/components/layout/ResponsiveContainer";
import { TaskManager } from "@/components/tasks/TaskManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { usePersistedState } from "@/hooks/usePersistedState";
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
  SlidersHorizontal,
} from "lucide-react";
import { projectService, ProjectWithRelations } from "@/services/projectService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { SaveAsTemplateDialog } from "@/components/projects/SaveAsTemplateDialog";
import { BulkActionsToolbar } from "@/components/projects/BulkActionsToolbar";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterPresetsManager } from "@/components/filters/FilterPresetsManager";

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
  const { checkLimit, getUpgradeRequirement, subscriptionData, usage } = useSubscription();

  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = usePersistedState<string>("projects-search", "");
  const [statusFilter, setStatusFilter] = usePersistedState<string>("projects-status-filter", "all");
  const [activeTab, setActiveTab] = usePersistedState<string>("projects-active-tab", "active");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [saveTemplateProject, setSaveTemplateProject] = useState<ProjectWithRelations | null>(null);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  // Advanced filter states with persistence
  const [budgetMin, setBudgetMin] = usePersistedState<string>("projects-budget-min", "");
  const [budgetMax, setBudgetMax] = usePersistedState<string>("projects-budget-max", "");
  const [startDate, setStartDate] = usePersistedState<Date | undefined>("projects-start-date", undefined);
  const [endDate, setEndDate] = usePersistedState<Date | undefined>("projects-end-date", undefined);
  const [showAdvancedFilters, setShowAdvancedFilters] = usePersistedState<boolean>("projects-show-advanced", false);
  const [materialFilter, setMaterialFilter] = usePersistedState<string>("projects-material-filter", "");
  const [taskFilter, setTaskFilter] = usePersistedState<string>("projects-task-filter", "");
  const [documentFilter, setDocumentFilter] = usePersistedState<string>("projects-document-filter", "");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const companyId = userProfile?.role !== "root_admin" ? userProfile?.company_id : undefined;
      const data = await projectService.getProjects(companyId);
      setProjects(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading projects",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = (trackingLabel: string = "new_project_click") => {
    // Check subscription limit before navigating
    const limitCheck = checkLimit('projects', 1);

    if (!limitCheck.canAdd) {
      setShowUpgradePrompt(true);
      return;
    }

    // Track and navigate
    gtag.trackProject("create", trackingLabel);
    navigate("/create-project");
  };

  const handleUpdateProject = async (
    projectId: string,
    updates: any
  ) => {
    try {
      // Pass company_id to enforce access control (null for root_admin)
      const companyId = userProfile?.role !== 'root_admin' ? userProfile?.company_id : undefined;
      await projectService.updateProject(projectId, updates, companyId);

      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, ...updates } : project
        )
      );

      toast({
        title: "Project updated",
        description: "Project has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating project",
        description: error.message,
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // Pass company_id to enforce access control (null for root_admin)
      const companyId = userProfile?.role !== 'root_admin' ? userProfile?.company_id : undefined;
      await projectService.deleteProject(projectId, companyId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));

      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting project",
        description: error.message,
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      name: formData.get("name") as string,
      client_name: formData.get("client_name") as string,
      site_address: formData.get("site_address") as string,
      status: formData.get("status") as string,
      completion_percentage: parseInt(
        formData.get("completion_percentage") as string
      ),
      budget: parseFloat(formData.get("budget") as string),
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      description: formData.get("description") as string,
    };

    await handleUpdateProject(editingProject.id, updates);
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "in_progress":
        return "default";
      case "completed":
        return "secondary";
      case "on_hold":
        return "outline";
      case "planning":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getHealthColor = (completion: number, status: string) => {
    if (status === "completed") return "text-green-600";
    if (completion >= 75) return "text-green-600";
    if (completion >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setBudgetMin("");
    setBudgetMax("");
    setStartDate(undefined);
    setEndDate(undefined);
    setMaterialFilter("");
    setTaskFilter("");
    setDocumentFilter("");
  };

  const getCurrentFilters = () => {
    return {
      searchTerm,
      statusFilter,
      budgetMin,
      budgetMax,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      materialFilter,
      taskFilter,
      documentFilter
    };
  };

  const handleLoadPreset = (filters: any) => {
    setSearchTerm(filters.searchTerm || "");
    setStatusFilter(filters.statusFilter || "all");
    setBudgetMin(filters.budgetMin || "");
    setBudgetMax(filters.budgetMax || "");
    setStartDate(filters.startDate ? new Date(filters.startDate) : undefined);
    setEndDate(filters.endDate ? new Date(filters.endDate) : undefined);
    setMaterialFilter(filters.materialFilter || "");
    setTaskFilter(filters.taskFilter || "");
    setDocumentFilter(filters.documentFilter || "");
  };

  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const selectAllProjects = () => {
    setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedProjects(new Set());
  };

  const filteredProjects = projects.filter((project) => {
    // Basic search
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.site_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    // Budget range filter
    const matchesBudget =
      (!budgetMin || project.budget >= parseFloat(budgetMin)) &&
      (!budgetMax || project.budget <= parseFloat(budgetMax));

    // Date range filters
    const projectStartDate = new Date(project.start_date);
    const projectEndDate = new Date(project.end_date);
    const matchesStartDate = !startDate || projectStartDate >= startDate;
    const matchesEndDate = !endDate || projectEndDate <= endDate;

    // Material filter
    const matchesMaterial =
      !materialFilter ||
      (project.materials &&
        Array.isArray(project.materials) &&
        project.materials.some(
          (material: any) =>
            material.name
              ?.toLowerCase()
              .includes(materialFilter.toLowerCase()) ||
            material.description
              ?.toLowerCase()
              .includes(materialFilter.toLowerCase())
        ));

    // Task filter
    const matchesTask =
      !taskFilter ||
      (project.tasks &&
        Array.isArray(project.tasks) &&
        project.tasks.some(
          (task: any) =>
            task.name?.toLowerCase().includes(taskFilter.toLowerCase()) ||
            task.description?.toLowerCase().includes(taskFilter.toLowerCase())
        ));

    // Document filter
    const matchesDocument =
      !documentFilter ||
      (project.documents &&
        Array.isArray(project.documents) &&
        project.documents.some(
          (doc: any) =>
            doc.name?.toLowerCase().includes(documentFilter.toLowerCase()) ||
            doc.description
              ?.toLowerCase()
              .includes(documentFilter.toLowerCase())
        ));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesBudget &&
      matchesStartDate &&
      matchesEndDate &&
      matchesMaterial &&
      matchesTask &&
      matchesDocument
    );
  });

  const getProjectsByStatus = (status: string) => {
    return filteredProjects.filter((project) => project.status === status);
  };

  const activeProjects = getProjectsByStatus("active").concat(
    getProjectsByStatus("in_progress")
  );
  const completedProjects = getProjectsByStatus("completed");
  const onHoldProjects = getProjectsByStatus("on_hold");
  const planningProjects = getProjectsByStatus("planning");

  const ProjectCard = ({ project }: { project: ProjectWithRelations }) => {
    const isSelected = selectedProjects.has(project.id);

    return (
      <Card className={`hover:shadow-md transition-all ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div className="pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleProjectSelection(project.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
              <div className="space-y-1 min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg leading-tight break-words">
                  {project.name}
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-3 w-3 mr-1 shrink-0" />
                  <span className="break-words">{project.client_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Badge
                  variant={getStatusColor(project.status)}
                  className="text-xs px-1.5 py-0.5"
                >
                  <span className="hidden sm:inline">
                    {project.status.replace("_", " ")}
                  </span>
                  <span className="sm:hidden">
                    {project.status.charAt(0).toUpperCase()}
                  </span>
                </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Project actions menu">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Project Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                {['admin', 'root_admin'].includes(userProfile?.role || '') && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSaveTemplateProject(project);
                      setSaveTemplateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Save as Template
                  </DropdownMenuItem>
                )}
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
                        Are you sure you want to delete "{project.name}"? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
        {project.site_address && (
          <div className="flex items-start text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
            <span className="break-words">{project.site_address}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span
              className={getHealthColor(
                project.completion_percentage,
                project.status
              )}
            >
              {project.completion_percentage}%
            </span>
          </div>
          <Progress value={project.completion_percentage} className="h-2" />
        </div>

        {project.budget && (
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3 mr-1 shrink-0" />
            <span className="break-words">
              Budget: ${project.budget.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1 shrink-0" />
            <span className="whitespace-nowrap">
              {new Date(project.start_date).toLocaleDateString()}
            </span>
          </div>
          <div className="whitespace-nowrap">
            Due: {new Date(project.end_date).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Projects" showTrialBanner={false}>
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="h-9 w-32 bg-muted animate-pulse rounded-md" />
          </div>
          <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} className="gap-6">
            {[...Array(6)].map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </ResponsiveGrid>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Projects" showTrialBanner={false}>
      <div className="flex justify-end mb-4 sm:mb-6">
        <Button
          onClick={handleCreateProject}
          size="sm"
          className="text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
          <kbd className="ml-2 hidden lg:inline-block px-2 py-0.5 text-xs bg-muted rounded border border-border">
            Ctrl+N
          </kbd>
        </Button>
      </div>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Main Search Bar */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
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
            <FilterPresetsManager
              context="projects"
              currentFilters={getCurrentFilters()}
              onLoadPreset={handleLoadPreset}
              userId={userProfile?.id}
              companyId={userProfile?.company_id}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex-1 sm:flex-none"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Advanced</span>
                <span className="sm:hidden">Filters</span>
              </Button>
              {(budgetMin ||
                budgetMax ||
                startDate ||
                endDate ||
                materialFilter ||
                taskFilter ||
                documentFilter) && (
                <Button
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="flex-1 sm:flex-none"
                >
                  <FilterX className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Clear</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Card className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedProjects.size}
        totalCount={filteredProjects.length}
        onSelectAll={selectAllProjects}
        onClearSelection={clearSelection}
        selectedProjectIds={Array.from(selectedProjects)}
        onActionComplete={loadProjects}
        allSelected={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
      />

      {/* Projects Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="active" className="text-xs sm:text-sm py-2">
            <span className="hidden sm:inline">
              Active ({activeProjects.length})
            </span>
            <span className="sm:hidden">Active</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm py-2">
            <span className="hidden sm:inline">
              Completed ({completedProjects.length})
            </span>
            <span className="sm:hidden">Done</span>
          </TabsTrigger>
          <TabsTrigger value="on_hold" className="text-xs sm:text-sm py-2">
            <span className="hidden sm:inline">
              On Hold ({onHoldProjects.length})
            </span>
            <span className="sm:hidden">Hold</span>
          </TabsTrigger>
          <TabsTrigger value="planning" className="text-xs sm:text-sm py-2">
            <span className="hidden sm:inline">
              Planning ({planningProjects.length})
            </span>
            <span className="sm:hidden">Plan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No active projects
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first project.
                </p>
                <Button onClick={() => handleCreateProject("empty_state_click")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ResponsiveGrid
              cols={{ default: 1, md: 2, lg: 3 }}
              className="gap-6"
            >
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
                <h3 className="text-lg font-semibold mb-2">
                  No completed projects
                </h3>
                <p className="text-muted-foreground">
                  Completed projects will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ResponsiveGrid
              cols={{ default: 1, md: 2, lg: 3 }}
              className="gap-6"
            >
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
                <h3 className="text-lg font-semibold mb-2">
                  No projects on hold
                </h3>
                <p className="text-muted-foreground">
                  Projects on hold will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ResponsiveGrid
              cols={{ default: 1, md: 2, lg: 3 }}
              className="gap-6"
            >
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
                <h3 className="text-lg font-semibold mb-2">
                  No projects in planning
                </h3>
                <p className="text-muted-foreground">
                  Projects in planning phase will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ResponsiveGrid
              cols={{ default: 1, md: 2, lg: 3 }}
              className="gap-6"
            >
              {planningProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </ResponsiveGrid>
          )}
        </TabsContent>
      </Tabs>

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
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProject.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    name="client_name"
                    defaultValue={editingProject.client_name}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="site_address">Site Address</Label>
                <Input
                  id="site_address"
                  name="site_address"
                  defaultValue={editingProject.site_address}
                />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Project</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        currentTier={subscriptionData?.subscription_tier || 'starter'}
        requiredTier={getUpgradeRequirement('projects')}
        limitType="projects"
        currentUsage={usage.projects}
        currentLimit={checkLimit('projects').limit}
      />

      {/* Save as Template Dialog */}
      {saveTemplateProject && (
        <SaveAsTemplateDialog
          open={saveTemplateDialogOpen}
          onOpenChange={setSaveTemplateDialogOpen}
          project={saveTemplateProject}
          companyId={userProfile?.company_id}
        />
      )}
    </DashboardLayout>
  );
};

export default Projects;
