import type { ProjectWithRelations } from "@/services/projectService";

export type SortField = 'name' | 'status' | 'budget' | 'start_date' | 'completion_percentage';
export type SortDirection = 'asc' | 'desc';

export interface ProjectFilterCriteria {
  searchTerm: string;
  statusFilter: string;
  budgetMin: string;
  budgetMax: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  materialFilter: string;
  taskFilter: string;
  documentFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
}

/** Applies the Projects page search, status and advanced filters, then the chosen sort. */
export function filterAndSortProjects(
  projects: ProjectWithRelations[],
  {
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
  }: ProjectFilterCriteria,
): ProjectWithRelations[] {
  return projects.filter((project) => {
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
      (!budgetMin || (project.budget ?? 0) >= parseFloat(budgetMin)) &&
      (!budgetMax || (project.budget ?? 0) <= parseFloat(budgetMax));

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
          (material) =>
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
          (task) =>
            task.name?.toLowerCase().includes(taskFilter.toLowerCase()) ||
            task.description?.toLowerCase().includes(taskFilter.toLowerCase())
        ));

    // Document filter
    const matchesDocument =
      !documentFilter ||
      (project.documents &&
        Array.isArray(project.documents) &&
        project.documents.some(
          (doc) =>
            doc.name?.toLowerCase().includes(documentFilter.toLowerCase()) ||
            doc.file_path
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
  }).sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        return dir * a.name.localeCompare(b.name);
      case 'status':
        return dir * a.status.localeCompare(b.status);
      case 'budget':
        return dir * ((a.budget || 0) - (b.budget || 0));
      case 'start_date':
        return dir * (new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      case 'completion_percentage':
        return dir * ((a.completion_percentage || 0) - (b.completion_percentage || 0));
      default:
        return 0;
    }
  });
}
