import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys, invalidateQueries } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

/**
 * Optimized project queries with intelligent caching
 */
export const useOptimizedProjects = (options?: Partial<UseQueryOptions>) => {
  const { userProfile } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      if (!userProfile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          budget,
          start_date,
          end_date,
          completion_percentage,
          client_name,
          project_type,
          created_at,
          updated_at
        `)
        .eq('company_id', userProfile.company_id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

/**
 * Optimized single project query with related data
 */
export const useOptimizedProject = (projectId: string, options?: Partial<UseQueryOptions>) => {
  const { userProfile } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () => {
      if (!userProfile?.company_id || !projectId) throw new Error('Missing required data');
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks:tasks(
            id,
            name,
            status,
            priority,
            due_date,
            assigned_to,
            completion_percentage
          ),
          recent_expenses:expenses(
            id,
            amount,
            description,
            expense_date,
            category
          ),
          recent_documents:documents(
            id,
            name,
            file_path,
            file_type,
            uploaded_at
          )
        `)
        .eq('id', projectId)
        .eq('company_id', userProfile.company_id)
        .limit(10, { foreignTable: 'recent_expenses' })
        .limit(5, { foreignTable: 'recent_documents' })
        .order('expense_date', { foreignTable: 'recent_expenses', ascending: false })
        .order('uploaded_at', { foreignTable: 'recent_documents', ascending: false })
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.company_id && !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Optimized financial data queries
 */
export const useOptimizedInvoices = (options?: Partial<UseQueryOptions>) => {
  const { userProfile } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: async () => {
      if (!userProfile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          status,
          due_date,
          client_name,
          project_id,
          created_at
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(100); // Reasonable limit for performance
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Optimized dashboard data with aggregations
 */
export const useOptimizedDashboard = (options?: Partial<UseQueryOptions>) => {
  const { userProfile } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.dashboardData,
    queryFn: async () => {
      if (!userProfile?.company_id) throw new Error('No company ID');
      
      // Use parallel queries for better performance
      const [projectsRes, invoicesRes, expensesRes, tasksRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, status, budget, completion_percentage')
          .eq('company_id', userProfile.company_id),
        
        supabase
          .from('invoices')
          .select('id, amount, status, due_date')
          .eq('company_id', userProfile.company_id)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('expenses')
          .select('id, amount, expense_date')
          .eq('company_id', userProfile.company_id)
          .gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('tasks')
          .select('id, status, priority, due_date, project_id')
          .eq('company_id', userProfile.company_id)
          .neq('status', 'completed')
      ]);
      
      // Process and aggregate data
      const projects = projectsRes.data || [];
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const tasks = tasksRes.data || [];
      
      return {
        projects: {
          total: projects.length,
          active: projects.filter(p => p.status === 'active').length,
          completed: projects.filter(p => p.status === 'completed').length,
          totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
          avgCompletion: projects.length > 0 
            ? projects.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / projects.length
            : 0,
        },
        financial: {
          totalInvoiced: invoices.reduce((sum, i) => sum + i.amount, 0),
          paidInvoices: invoices.filter(i => i.status === 'paid').length,
          overdueInvoices: invoices.filter(i => 
            i.status !== 'paid' && new Date(i.due_date) < new Date()
          ).length,
          monthlyExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        },
        tasks: {
          total: tasks.length,
          highPriority: tasks.filter(t => t.priority === 'high').length,
          overdue: tasks.filter(t => 
            t.due_date && new Date(t.due_date) < new Date()
          ).length,
        },
        lastUpdated: new Date().toISOString(),
      };
    },
    enabled: !!userProfile?.company_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Optimized CRM queries
 */
export const useOptimizedOpportunities = (options?: Partial<UseQueryOptions>) => {
  const { userProfile } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.opportunities,
    queryFn: async () => {
      if (!userProfile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id,
          name,
          stage,
          estimated_value,
          probability_percent,
          expected_close_date,
          created_at,
          contact_name,
          project_type
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Optimized mutation hooks with automatic cache updates
 */
export const useOptimizedProjectMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectData: any) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Update cache optimistically
      queryClient.setQueryData(queryKeys.projects, (old: any[] = []) => [data, ...old]);
      queryClient.setQueryData(queryKeys.project(data.id), data);
      
      // Invalidate related queries
      invalidateQueries.dashboard();
      
      toast({
        title: "Project Created",
        description: `"${data.name}" has been created successfully.`,
      });
    },
  });
};

export const useOptimizedTaskMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, taskData }: { projectId: string; taskData: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, project_id: projectId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Update project cache with new task
      queryClient.setQueryData(queryKeys.project(variables.projectId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: [data, ...(old.tasks || [])],
        };
      });
      
      // Invalidate dashboard to update task counts
      invalidateQueries.dashboard();
      
      toast({
        title: "Task Created",
        description: `"${data.name}" has been added to the project.`,
      });
    },
  });
};

export const useOptimizedInvoiceMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoiceData: any) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Update invoices cache
      queryClient.setQueryData(queryKeys.invoices, (old: any[] = []) => [data, ...old]);
      
      // Invalidate financial and dashboard data
      invalidateQueries.financial();
      invalidateQueries.dashboard();
      
      toast({
        title: "Invoice Created",
        description: `Invoice #${data.invoice_number} has been created.`,
      });
    },
  });
};

/**
 * Background sync hook for real-time updates
 */
export const useBackgroundSync = () => {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  
  // Set up real-time subscriptions for critical data
  React.useEffect(() => {
    if (!userProfile?.company_id) return;
    
    const channels: any[] = [];
    
    // Projects subscription
    const projectsChannel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `company_id=eq.${userProfile.company_id}`,
        },
        (payload) => {
          // Invalidate projects cache on any change
          invalidateQueries.projects();
          invalidateQueries.dashboard();
        }
      )
      .subscribe();
    
    channels.push(projectsChannel);
    
    // Tasks subscription
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `company_id=eq.${userProfile.company_id}`,
        },
        (payload) => {
          // Invalidate specific project if we know which one
          if (payload.new?.project_id) {
            invalidateQueries.project(payload.new.project_id);
          }
          invalidateQueries.dashboard();
        }
      )
      .subscribe();
    
    channels.push(tasksChannel);
    
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [userProfile?.company_id, queryClient]);
};

/**
 * Performance monitoring hook
 */
export const useQueryPerformance = () => {
  const queryClient = useQueryClient();
  
  return {
    getCacheStats: () => {
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.getAll();
      
      return {
        totalQueries: queries.length,
        staleQueries: queries.filter(q => q.isStale()).length,
        fetchingQueries: queries.filter(q => q.isFetching()).length,
        errorQueries: queries.filter(q => q.isError()).length,
      };
    },
    
    clearStaleQueries: () => {
      const queryCache = queryClient.getQueryCache();
      const staleQueries = queryCache.getAll().filter(q => q.isStale());
      
      staleQueries.forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });
      
      return staleQueries.length;
    },
  };
};
