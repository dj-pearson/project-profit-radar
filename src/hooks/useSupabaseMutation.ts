import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PostgrestError } from '@supabase/supabase-js';

interface UseSupabaseMutationOptions<TData, TVariables> 
  extends Omit<UseMutationOptions<TData, PostgrestError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: PostgrestError | null }>;
  invalidateQueries?: string[][];
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Enhanced useMutation hook with built-in error handling and query invalidation
 */
export function useSupabaseMutation<TData = any, TVariables = void>({
  mutationFn,
  invalidateQueries = [],
  showSuccessToast = false,
  showErrorToast = true,
  successMessage = 'Operation completed successfully',
  errorMessage = 'Operation failed',
  onSuccess,
  onError,
  ...options
}: UseSupabaseMutationOptions<TData, TVariables>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const { data, error } = await mutationFn(variables);
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });

      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }

      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      console.error('Mutation error:', error);
      onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook for inserting records with optimistic updates
 */
export function useInsertMutation<T>({
  tableName,
  invalidateQueries = [],
  showSuccessToast = true,
  successMessage = 'Record created successfully',
}: {
  tableName: string;
  invalidateQueries?: string[][];
  showSuccessToast?: boolean;
  successMessage?: string;
}) {
  return useSupabaseMutation<T, Partial<T>>({
    mutationFn: async (data) => {
      return await (supabase as any)
        .from(tableName)
        .insert(data)
        .select()
        .single();
    },
    invalidateQueries,
    showSuccessToast,
    successMessage,
    errorMessage: `Failed to create ${tableName} record`,
  });
}

/**
 * Hook for updating records
 */
export function useUpdateMutation<T>({
  tableName,
  invalidateQueries = [],
  showSuccessToast = true,
  successMessage = 'Record updated successfully',
}: {
  tableName: string;
  invalidateQueries?: string[][];
  showSuccessToast?: boolean;
  successMessage?: string;
}) {
  return useSupabaseMutation<T, { id: string; data: Partial<T> }>({
    mutationFn: async ({ id, data }) => {
      return await (supabase as any)
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },
    invalidateQueries,
    showSuccessToast,
    successMessage,
    errorMessage: `Failed to update ${tableName} record`,
  });
}

/**
 * Hook for deleting records
 */
export function useDeleteMutation({
  tableName,
  invalidateQueries = [],
  showSuccessToast = true,
  successMessage = 'Record deleted successfully',
}: {
  tableName: string;
  invalidateQueries?: string[][];
  showSuccessToast?: boolean;
  successMessage?: string;
}) {
  return useSupabaseMutation<void, string>({
    mutationFn: async (id) => {
      return await (supabase as any)
        .from(tableName)
        .delete()
        .eq('id', id);
    },
    invalidateQueries,
    showSuccessToast,
    successMessage,
    errorMessage: `Failed to delete ${tableName} record`,
  });
}

/**
 * Batch operations with transaction-like behavior
 */
export function useBatchMutation<T>({
  operations,
  invalidateQueries = [],
  showSuccessToast = true,
  successMessage = 'Batch operation completed',
}: {
  operations: Array<() => Promise<any>>;
  invalidateQueries?: string[][];
  showSuccessToast?: boolean;
  successMessage?: string;
}) {
  return useSupabaseMutation<T[], void>({
    mutationFn: async () => {
      const results = await Promise.all(operations.map(op => op()));
      
      // Check if any operation failed
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
      
      return { data: results.map(r => r.data), error: null };
    },
    invalidateQueries,
    showSuccessToast,
    successMessage,
    errorMessage: 'Batch operation failed',
  });
}
