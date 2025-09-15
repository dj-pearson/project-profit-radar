import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Enhanced React Query configuration for optimal performance
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus for better mobile experience
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Error handling
      onError: (error: any) => {
        console.error('Query error:', error);
        if (error?.message && !error.message.includes('aborted')) {
          toast({
            title: "Data Loading Error",
            description: error.message,
            variant: "destructive",
          });
        }
      },
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Error handling for mutations
      onError: (error: any) => {
        console.error('Mutation error:', error);
        if (error?.message) {
          toast({
            title: "Operation Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      },
    },
  },
});

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  // User and auth
  user: ['user'] as const,
  userProfile: ['user', 'profile'] as const,
  
  // Projects
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectTasks: (projectId: string) => ['projects', projectId, 'tasks'] as const,
  projectExpenses: (projectId: string) => ['projects', projectId, 'expenses'] as const,
  projectDocuments: (projectId: string) => ['projects', projectId, 'documents'] as const,
  projectMaterials: (projectId: string) => ['projects', projectId, 'materials'] as const,
  projectInvoices: (projectId: string) => ['projects', projectId, 'invoices'] as const,
  
  // Financial
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,
  expenses: ['expenses'] as const,
  expense: (id: string) => ['expenses', id] as const,
  budgets: ['budgets'] as const,
  budget: (id: string) => ['budgets', id] as const,
  
  // CRM
  leads: ['leads'] as const,
  lead: (id: string) => ['leads', id] as const,
  opportunities: ['opportunities'] as const,
  opportunity: (id: string) => ['opportunities', id] as const,
  contacts: ['contacts'] as const,
  contact: (id: string) => ['contacts', id] as const,
  
  // Materials and inventory
  materials: ['materials'] as const,
  material: (id: string) => ['materials', id] as const,
  inventory: ['inventory'] as const,
  
  // Team and HR
  employees: ['employees'] as const,
  employee: (id: string) => ['employees', id] as const,
  timeEntries: ['time-entries'] as const,
  
  // Documents
  documents: ['documents'] as const,
  document: (id: string) => ['documents', id] as const,
  
  // Analytics and reports
  analytics: ['analytics'] as const,
  dashboardData: ['dashboard'] as const,
  reports: ['reports'] as const,
  report: (type: string) => ['reports', type] as const,
  
  // Settings
  companySettings: ['settings', 'company'] as const,
  userSettings: ['settings', 'user'] as const,
  
  // Real-time data
  activityFeed: ['activity-feed'] as const,
  notifications: ['notifications'] as const,
} as const;

/**
 * Cache invalidation helpers
 */
export const invalidateQueries = {
  // Invalidate all project-related queries
  projects: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  },
  
  // Invalidate specific project
  project: (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.project(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projectTasks(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projectExpenses(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projectDocuments(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projectMaterials(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projectInvoices(id) });
  },
  
  // Invalidate financial data
  financial: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
  },
  
  // Invalidate CRM data
  crm: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leads });
    queryClient.invalidateQueries({ queryKey: queryKeys.opportunities });
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
  },
  
  // Invalidate dashboard data
  dashboard: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardData });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
  },
  
  // Invalidate all data (use sparingly)
  all: () => {
    queryClient.invalidateQueries();
  },
};

/**
 * Prefetch helpers for better UX
 */
export const prefetchQueries = {
  // Prefetch project data when navigating to projects
  project: async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.project(id),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  },
  
  // Prefetch dashboard data on app load
  dashboard: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.dashboardData,
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  },
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  // Get cached data without triggering a fetch
  getCachedData: <T>(queryKey: readonly unknown[]) => {
    return queryClient.getQueryData<T>(queryKey);
  },
  
  // Set data in cache
  setCachedData: <T>(queryKey: readonly unknown[], data: T) => {
    queryClient.setQueryData(queryKey, data);
  },
  
  // Remove data from cache
  removeFromCache: (queryKey: readonly unknown[]) => {
    queryClient.removeQueries({ queryKey });
  },
  
  // Clear all cache
  clearCache: () => {
    queryClient.clear();
  },
  
  // Get cache stats
  getCacheStats: () => {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
      cacheSize: JSON.stringify(queryCache).length,
    };
  },
};

/**
 * Development helpers
 */
export const devTools = {
  // Log all queries and their states
  logQueries: () => {
    if (process.env.NODE_ENV === 'development') {
      const queries = queryClient.getQueryCache().getAll();
      console.table(
        queries.map(query => ({
          queryKey: JSON.stringify(query.queryKey),
          state: query.state.status,
          dataUpdatedAt: new Date(query.state.dataUpdatedAt).toLocaleTimeString(),
          isStale: query.isStale(),
          isFetching: query.isFetching(),
        }))
      );
    }
  },
  
  // Clear cache and show notification
  clearCacheWithNotification: () => {
    queryClient.clear();
    toast({
      title: "Cache Cleared",
      description: "All cached data has been cleared. Fresh data will be loaded.",
    });
  },
};
