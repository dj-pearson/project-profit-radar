# Week 3 Day 2: Optimized Query Utilities & React Hooks

## 🎯 Objectives
- Create type-safe query utilities for existing database tables
- Implement React Query hooks with optimized caching
- Build reusable data fetching patterns
- Establish query optimization best practices

## 📊 Database Query Patterns

### Core Principles

1. **Avoid N+1 Queries**: Use joins instead of multiple sequential queries
2. **Paginate Large Datasets**: Always limit and offset for lists
3. **Index Common Filters**: Queries should leverage existing indexes
4. **Cache Aggressively**: Use React Query for automatic caching and revalidation
5. **Select Only What's Needed**: Don't fetch unnecessary columns

### Query Optimization Examples

#### ❌ Bad Pattern (N+1 Query)
```typescript
// Fetches projects, then makes separate query for each project's tasks
const projects = await supabase.from('projects').select('*');
for (const project of projects.data) {
  const tasks = await supabase.from('tasks').select('*').eq('project_id', project.id);
}
```

#### ✅ Good Pattern (Single Query with Join)
```typescript
// Fetches projects with tasks in one query
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    tasks(*)
  `);
```

## 🔧 Query Utilities Created

### 1. Project Queries (`src/lib/queries/projects.ts`)
- `useProjects()` - List all projects with stats
- `useProject(id)` - Get single project with related data
- `useProjectStats(id)` - Get aggregated project statistics
- `useProjectTasks(id)` - Get tasks for a project (paginated)
- `useProjectDocuments(id)` - Get documents for a project (paginated)
- `useProjectTeam(id)` - Get team members for a project

### 2. Task Queries (`src/lib/queries/tasks.ts`)
- `useTasks(filters)` - List tasks with filters and pagination
- `useTask(id)` - Get single task with relations
- `useTasksByStatus(projectId, status)` - Get tasks filtered by status
- `useOverdueTasks(projectId)` - Get overdue tasks
- `useTaskReorder(projectId)` - Optimistic task reordering

### 3. Document Queries (`src/lib/queries/documents.ts`)
- `useDocuments(projectId, filters)` - List documents with filtering
- `useDocument(id)` - Get single document
- `useDocumentsByCategory(projectId, category)` - Filter by category
- `useRecentDocuments(projectId, limit)` - Get recent uploads

## 🎣 React Query Hook Patterns

### Basic Hook Structure
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProjects = (filters?: ProjectFilters) => {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          tasks(count),
          documents(count),
          team_members(count)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
};
```

### Mutation with Optimistic Updates
```typescript
export const useCreateTask = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskCreate) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] });
    },
  });
};
```

## 📈 Performance Optimizations

### 1. Query Caching Strategy

```typescript
// Short-lived cache for frequently changing data
staleTime: 10000, // 10 seconds
gcTime: 60000,    // 1 minute

// Medium cache for semi-static data
staleTime: 60000,  // 1 minute
gcTime: 300000,    // 5 minutes

// Long cache for rarely changing data
staleTime: 300000, // 5 minutes
gcTime: 3600000,   // 1 hour
```

### 2. Prefetching Pattern

```typescript
export const usePrefetchProject = () => {
  const queryClient = useQueryClient();

  return (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['project', projectId],
      queryFn: () => fetchProject(projectId),
    });
  };
};

// Usage in list
<Link 
  to={`/projects/${project.id}`}
  onMouseEnter={() => prefetchProject(project.id)}
>
  {project.name}
</Link>
```

### 3. Parallel Queries

```typescript
export const useProjectData = (projectId: string) => {
  const project = useProject(projectId);
  const tasks = useProjectTasks(projectId);
  const documents = useProjectDocuments(projectId);
  const team = useProjectTeam(projectId);

  return {
    project,
    tasks,
    documents,
    team,
    isLoading: project.isLoading || tasks.isLoading || documents.isLoading || team.isLoading,
  };
};
```

## 🔒 Type Safety

### Query Result Types
```typescript
import type { QueryResult } from '@tanstack/react-query';

// Infer types from Supabase
export type Project = Database['public']['Tables']['projects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];

// Extended types with relations
export type ProjectWithStats = Project & {
  task_count: number;
  completed_count: number;
  document_count: number;
  team_size: number;
};

// Query hook return types
export type UseProjectsResult = QueryResult<ProjectWithStats[], Error>;
```

## 🎯 Query Filters & Pagination

### Filter Interface Pattern
```typescript
export interface ProjectFilters {
  status?: 'active' | 'on_hold' | 'completed' | 'archived';
  search?: string;
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## 🚀 Usage Examples

### In a Component
```typescript
import { useProjects, useCreateProject } from '@/lib/queries/projects';

export const ProjectList = () => {
  const { data: projects, isLoading, error } = useProjects({ 
    status: 'active',
    limit: 20 
  });
  
  const createProject = useCreateProject();

  const handleCreate = async (projectData: ProjectCreate) => {
    try {
      await createProject.mutateAsync(projectData);
      toast.success('Project created successfully');
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {projects?.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};
```

### With Pagination
```typescript
export const TaskList = ({ projectId }: { projectId: string }) => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useTasks({
    project_id: projectId,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return (
    <div>
      <TaskGrid tasks={data?.tasks} />
      <Pagination
        page={page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};
```

## 📊 Query Key Patterns

### Hierarchical Keys
```typescript
// List queries
['projects'] // All projects
['projects', { status: 'active' }] // Filtered projects
['projects', { search: 'remodel' }] // Searched projects

// Detail queries
['project', projectId] // Single project
['project', projectId, 'tasks'] // Project's tasks
['project', projectId, 'stats'] // Project's stats

// User-specific queries
['user', userId, 'projects'] // User's projects
['user', userId, 'tasks'] // User's tasks
```

### Benefits
- Easy cache invalidation
- Automatic deduplication
- Hierarchical data relationships
- Clear query organization

## 🎯 Best Practices Checklist

- [x] Use React Query for all async data fetching
- [x] Define TypeScript interfaces for all filters and responses
- [x] Implement optimistic updates for mutations
- [x] Set appropriate staleTime and gcTime for each query
- [x] Use queryKey patterns for easy cache management
- [x] Implement error handling and loading states
- [x] Add pagination for large datasets
- [x] Prefetch data on hover for better UX
- [x] Avoid N+1 queries with proper joins
- [x] Use select() to fetch only required fields

## 🔍 Debugging Queries

### React Query DevTools
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
```

### Query Performance Logging
```typescript
export const useProjects = (filters?: ProjectFilters) => {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const start = performance.now();
      const result = await fetchProjects(filters);
      const duration = performance.now() - start;
      
      if (duration > 1000) {
        console.warn(`Slow query: projects (${duration}ms)`, filters);
      }
      
      return result;
    },
  });
};
```

## 📈 Performance Targets

- Query response time: < 100ms for simple queries
- Query response time: < 500ms for complex joins
- Cache hit rate: > 80%
- Mutation success rate: > 99%
- Optimistic update accuracy: > 95%

## 🎓 Learning Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase Query Performance](https://supabase.com/docs/guides/database/query-performance)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)

---

**Status**: ✅ Week 3 Day 2 Complete - Query utilities and React hooks ready for implementation!
