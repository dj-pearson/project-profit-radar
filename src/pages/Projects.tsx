import { useEffect, useState } from "react";
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
import { AccessibleModal } from "@/components/accessibility/AccessibleModal";
import { EditProjectForm, EDIT_PROJECT_FORM_ID } from "./projects/EditProjectForm";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingRegion, ProjectCardSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoProjects } from "@/components/ui/EmptyStates";
import { ResponsiveGrid } from "@/components/layout/ResponsiveContainer";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { SharedElement, sharedId } from "@/components/mobile/SharedElementTransition";
import { useToast } from "@/hooks/use-toast";
import { gtag } from "@/hooks/useGoogleAnalytics";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Building2, Search, Filter, Plus, Edit, Eye, Calendar, MapPin, User, DollarSign, MoreHorizontal, Trash2, FilterX, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { projectService, ProjectWithRelations } from "@/services/projectService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { SaveAsTemplateDialog } from "@/components/projects/SaveAsTemplateDialog";
import { BulkActionsToolbar } from "@/components/projects/BulkActionsToolbar";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterPresetsManager } from "@/components/filters/FilterPresetsManager";
import { CSVImportButton } from "@/components/smart-import";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { ProjectHealthBadge } from "@/components/projects/ProjectHealthBadge";
import { AdvancedFilters } from "./projects/AdvancedFilters";
import { filterAndSortProjects, type SortDirection, type SortField } from "./projects/projectFilters";

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
  // A failed load used to fall through to "No active projects" behind a
  // toast. Keep it so the page says the load failed and offers a retry.
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = usePersistedState<string>("projects-search", "");
  const [statusFilter, setStatusFilter] = usePersistedState<string>("projects-status-filter", "all");
  const [activeTab, setActiveTab] = usePersistedState<string>("projects-active-tab", "active");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [saveTemplateProject, setSaveTemplateProject] = useState<ProjectWithRelations | null>(null);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string } | null>(null);

  // Advanced filter states with persistence
  const [budgetMin, setBudgetMin] = usePersistedState<string>("projects-budget-min", "");
  const [budgetMax, setBudgetMax] = usePersistedState<string>("projects-budget-max", "");
  const [startDate, setStartDate] = usePersistedState<Date | undefined>("projects-start-date", undefined);
  const [endDate, setEndDate] = usePersistedState<Date | undefined>("projects-end-date", undefined);
  const [showAdvancedFilters, setShowAdvancedFilters] = usePersistedState<boolean>("projects-show-advanced", false);
  const [materialFilter, setMaterialFilter] = usePersistedState<string>("projects-material-filter", "");
  const [taskFilter, setTaskFilter] = usePersistedState<string>("projects-task-filter", "");
  const [documentFilter, setDocumentFilter] = usePersistedState<string>("projects-document-filter", "");

  // Sort state
  const [sortField, setSortField] = usePersistedState<SortField>("projects-sort-field", "name");
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>("projects-sort-dir", "asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" aria-hidden="true" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" aria-hidden="true" />
      : <ArrowDown className="h-3 w-3 ml-1" aria-hidden="true" />;
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const companyId = userProfile?.role !== "root_admin" ? userProfile?.company_id : undefined;
      const data = await projectService.getProjects(companyId);
      setProjects(data || []);
    } catch (error: unknown) {
      setLoadError(true);
      toast({
        variant: "destructive",
        title: "Error loading projects",
        description: error instanceof Error ? error.message : "Unknown error",
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
    updates: Partial<Project>
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
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error updating project",
        description: error instanceof Error ? error.message : "Unknown error",
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
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error deleting project",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleEditSubmit = async (updates: Parameters<typeof handleUpdateProject>[1]) => {
    if (!editingProject) return;

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
      documentFilter,
      sortField,
      sortDirection
    };
  };

  const handleLoadPreset = (filters: Record<string, unknown>) => {
    setSearchTerm((filters.searchTerm as string) || "");
    setStatusFilter((filters.statusFilter as string) || "all");
    setBudgetMin((filters.budgetMin as string) || "");
    setBudgetMax((filters.budgetMax as string) || "");
    setStartDate(filters.startDate ? new Date(filters.startDate as string) : undefined);
    setEndDate(filters.endDate ? new Date(filters.endDate as string) : undefined);
    setMaterialFilter((filters.materialFilter as string) || "");
    setTaskFilter((filters.taskFilter as string) || "");
    setDocumentFilter((filters.documentFilter as string) || "");
    if (filters.sortField) setSortField(filters.sortField as SortField);
    if (filters.sortDirection) setSortDirection(filters.sortDirection as SortDirection);
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

  const filteredProjects = filterAndSortProjects(projects, {
    searchTerm,
    statusFilter,
    budgetMin,
    budgetMax,
    startDate,
    endDate,
    materialFilter,
    taskFilter,
    documentFilter,
    sortField,
    sortDirection,
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
    const projectCardId = `project-${project.id}`;

    return (
      <SharedElement id={sharedId('project', project.id)} className="block">
      <Card
        className={`hover:shadow-md transition-all ${isSelected ? 'border-primary bg-primary/5' : ''}`}
        role="article"
        aria-labelledby={`${projectCardId}-title`}
      >
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div className="pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleProjectSelection(project.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select project ${project.name}`}
              />
            </div>

            <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
              <div className="space-y-1 min-w-0 flex-1">
                <CardTitle id={`${projectCardId}-title`} className="text-base sm:text-lg leading-tight break-words">
                  {project.name}
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-3 w-3 mr-1 shrink-0" aria-hidden="true" />
                  <span className="break-words">{project.client_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <ProjectHealthBadge
                  budget={project.total_budget}
                  spent={project.actual_cost || 0}
                  completion_percentage={project.completion_percentage}
                  start_date={project.start_date}
                  end_date={project.end_date}
                  status={project.status}
                  className="hidden sm:flex"
                />
                <Badge
                  variant={getStatusColor(project.status)}
                  className="text-xs px-1.5 py-0.5"
                  aria-label={`Status: ${project.status.replace("_", " ")}`}
                >
                  <span className="hidden sm:inline">
                    {project.status.replace("_", " ")}
                  </span>
                  <span className="sm:hidden" aria-hidden="true">
                    {project.status.charAt(0).toUpperCase()}
                  </span>
                </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Actions for project ${project.name}`}>
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                  View Project Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                  Edit Project
                </DropdownMenuItem>
                {['admin', 'root_admin'].includes(userProfile?.role || '') && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSaveTemplateProject(project);
                      setSaveTemplateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Save as Template
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => setDeletingProject({ id: project.id, name: project.name })}
                >
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
        {project.site_address && (
          <div className="flex items-start text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1 mt-0.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{project.site_address}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span id={`${projectCardId}-progress-label`}>Progress</span>
            <span
              className={getHealthColor(
                project.completion_percentage,
                project.status
              )}
              aria-label={`${project.completion_percentage}% complete`}
            >
              {project.completion_percentage}%
            </span>
          </div>
          <Progress
            value={project.completion_percentage}
            className="h-2"
            aria-labelledby={`${projectCardId}-progress-label`}
            aria-valuenow={project.completion_percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {project.budget && (
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3 mr-1 shrink-0" aria-hidden="true" />
            <span className="break-words">
              Budget: ${project.budget.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">
              <span className="sr-only">Start date: </span>
              {new Date(project.start_date).toLocaleDateString()}
            </span>
          </div>
          <div className="whitespace-nowrap">
            <span className="sr-only">End date: </span>
            Due: {new Date(project.end_date).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
    </SharedElement>
    );
  };

  if (loading) {
    return (
      <AccessiblePageWrapper pageTitle="Projects">
        <DashboardLayout title="Projects" showTrialBanner={false} hasAccessibleWrapper>
          <LoadingRegion label="Loading projects" className="space-y-6">
            <div className="flex justify-end">
              <Skeleton className="h-9 w-32" />
            </div>
            <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} className="gap-6">
              {[...Array(6)].map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </ResponsiveGrid>
          </LoadingRegion>
        </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Projects">
    <DashboardLayout title="Projects" showTrialBanner={false} hasAccessibleWrapper>
      <div className="flex justify-end gap-2 mb-4 sm:mb-6">
        <CSVImportButton
          dataType="projects"
          onImportComplete={loadProjects}
          variant="outline"
          size="sm"
        />
        <Button
          onClick={handleCreateProject}
          size="sm"
          className="text-sm"
          aria-label="Create new project"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
          <kbd className="ml-2 hidden lg:inline-block px-2 py-0.5 text-xs bg-muted rounded border border-border" aria-hidden="true">
            Ctrl+N
          </kbd>
        </Button>
      </div>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6" role="search" aria-label="Filter projects">
        {/* Main Search Bar */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="project-search" className="sr-only">Search projects</label>
            <Input
              id="project-search"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              aria-label="Search projects by name, client, address, or description"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full" aria-label="Filter by project status">
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
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
                aria-expanded={showAdvancedFilters}
                aria-controls="advanced-filters"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" aria-hidden="true" />
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
                  aria-label="Clear all filters"
                >
                  <FilterX className="h-4 w-4 mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Clear</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <AdvancedFilters
            budgetMin={budgetMin}
            setBudgetMin={setBudgetMin}
            budgetMax={budgetMax}
            setBudgetMax={setBudgetMax}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            materialFilter={materialFilter}
            setMaterialFilter={setMaterialFilter}
            taskFilter={taskFilter}
            setTaskFilter={setTaskFilter}
            documentFilter={documentFilter}
            setDocumentFilter={setDocumentFilter}
          />
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground" role="status" aria-live="polite">
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

      {/* Sort Bar */}
      <div className="flex items-center gap-1 mb-4 text-xs text-muted-foreground overflow-x-auto pb-1" role="toolbar" aria-label="Sort projects">
        <span className="font-medium mr-1 whitespace-nowrap">Sort by:</span>
        {([
          { field: 'name' as SortField, label: 'Name' },
          { field: 'status' as SortField, label: 'Status' },
          { field: 'budget' as SortField, label: 'Budget' },
          { field: 'start_date' as SortField, label: 'Start Date' },
          { field: 'completion_percentage' as SortField, label: 'Progress' },
        ]).map(({ field, label }) => (
          <Button
            key={field}
            variant={sortField === field ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => toggleSort(field)}
            aria-label={`Sort by ${label} ${sortField === field ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
            aria-pressed={sortField === field}
          >
            {label}
            <SortIcon field={field} />
          </Button>
        ))}
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
      {loadError ? (
        <ErrorState
          title="Projects did not load"
          description="We could not load your projects. Nothing has been deleted; try again."
          onRetry={loadProjects}
        />
      ) : projects.length === 0 ? (
        <NoProjects onCreate={() => handleCreateProject("empty_state_click")} />
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" aria-label="Projects by status">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto" aria-label="Project status categories">
          <TabsTrigger value="active" className="text-xs sm:text-sm py-2" aria-label={`Active projects: ${activeProjects.length}`}>
            <span className="hidden sm:inline">
              Active ({activeProjects.length})
            </span>
            <span className="sm:hidden" aria-hidden="true">Active</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm py-2" aria-label={`Completed projects: ${completedProjects.length}`}>
            <span className="hidden sm:inline">
              Completed ({completedProjects.length})
            </span>
            <span className="sm:hidden" aria-hidden="true">Done</span>
          </TabsTrigger>
          <TabsTrigger value="on_hold" className="text-xs sm:text-sm py-2" aria-label={`On hold projects: ${onHoldProjects.length}`}>
            <span className="hidden sm:inline">
              On Hold ({onHoldProjects.length})
            </span>
            <span className="sm:hidden" aria-hidden="true">Hold</span>
          </TabsTrigger>
          <TabsTrigger value="planning" className="text-xs sm:text-sm py-2" aria-label={`Planning projects: ${planningProjects.length}`}>
            <span className="hidden sm:inline">
              Planning ({planningProjects.length})
            </span>
            <span className="sm:hidden" aria-hidden="true">Plan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold mb-2">
                  No active projects
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first project.
                </p>
                <Button onClick={() => handleCreateProject("empty_state_click")}>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <VirtualizedGrid
              items={activeProjects}
              renderItem={(project) => (
                <ProjectCard key={project.id} project={project} />
              )}
              columns={3}
              estimateRowHeight={280}
              virtualizeThreshold={50}
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold mb-2">
                  No completed projects
                </h3>
                <p className="text-muted-foreground">
                  Completed projects will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <VirtualizedGrid
              items={completedProjects}
              renderItem={(project) => (
                <ProjectCard key={project.id} project={project} />
              )}
              columns={3}
              estimateRowHeight={280}
              virtualizeThreshold={50}
            />
          )}
        </TabsContent>

        <TabsContent value="on_hold" className="space-y-4">
          {onHoldProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold mb-2">
                  No projects on hold
                </h3>
                <p className="text-muted-foreground">
                  Projects on hold will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <VirtualizedGrid
              items={onHoldProjects}
              renderItem={(project) => (
                <ProjectCard key={project.id} project={project} />
              )}
              columns={3}
              estimateRowHeight={280}
              virtualizeThreshold={50}
            />
          )}
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          {planningProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold mb-2">
                  No projects in planning
                </h3>
                <p className="text-muted-foreground">
                  Projects in planning phase will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <VirtualizedGrid
              items={planningProjects}
              renderItem={(project) => (
                <ProjectCard key={project.id} project={project} />
              )}
              columns={3}
              estimateRowHeight={280}
              virtualizeThreshold={50}
            />
          )}
        </TabsContent>
      </Tabs>
      )}

      {/* Edit Project Modal */}
      <AccessibleModal
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit Project"
        description="Edit project details including name, client, address, status, and dates."
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form={EDIT_PROJECT_FORM_ID}>Update Project</Button>
          </>
        }
      >
        {editingProject && (
          <EditProjectForm
            key={editingProject.id}
            project={editingProject}
            onSubmit={handleEditSubmit}
          />
        )}
      </AccessibleModal>

      {/* Delete Project Confirmation Modal */}
      <AccessibleModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        title="Delete Project"
        description={`Are you sure you want to delete "${deletingProject?.name || ''}"? This action cannot be undone.`}
        size="sm"
        disableClickOutside
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingProject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deletingProject) { handleDeleteProject(deletingProject.id); setDeletingProject(null); } }}>Delete</Button>
          </>
        }
      />

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
    </AccessiblePageWrapper>
  );
};

export default Projects;
