import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PostgrestError } from '@supabase/supabase-js';

interface UseSupabaseQueryOptions<T> extends Omit<UseQueryOptions<T, PostgrestError>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>;
  showErrorToast?: boolean;
  errorMessage?: string;
}

/**
 * Enhanced useQuery hook with built-in error handling for Supabase queries
 */
export function useSupabaseQuery<T>({
  queryKey,
  queryFn,
  showErrorToast = true,
  errorMessage = 'Failed to load data',
  ...options
}: UseSupabaseQueryOptions<T>) {
  const { toast } = useToast();

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      
      if (error) {
        if (showErrorToast) {
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
        throw error;
      }
      
      return data;
    },
    retry: (failureCount, error) => {
      // Don't retry on auth errors or RLS violations
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
}

interface PaginatedData<T> {
  data: T[];
  count: number | null;
  hasMore: boolean;
}

interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  tableName: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  pageSize?: number;
  page: number;
  showErrorToast?: boolean;
}

/**
 * Hook for paginated Supabase queries with loading states
 */
export function usePaginatedQuery<T>({
  queryKey,
  tableName,
  select = '*',
  filters = {},
  orderBy,
  pageSize = 20,
  page,
  showErrorToast = true,
}: UsePaginatedQueryOptions<T>) {
  const { toast } = useToast();

  return useQuery({
    queryKey: [...queryKey, page, pageSize, JSON.stringify(filters), JSON.stringify(orderBy)],
    queryFn: async (): Promise<PaginatedData<T>> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = (supabase as any)
        .from(tableName)
        .select(select, { count: 'exact' })
        .range(from, to);

      // Apply filters (including site_id for tenant isolation)
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data, error, count } = await query;

      if (error) {
        if (showErrorToast) {
          toast({
            title: 'Error loading data',
            description: error.message,
            variant: 'destructive',
          });
        }
        throw error;
      }

      return {
        data: (data as T[]) ?? [],
        count,
        hasMore: count ? from + pageSize < count : false,
      };
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Safe single record fetch - returns null instead of throwing on not found
 */
export async function fetchSingleRecord<T>(
  tableName: string,
  select: string,
  filters: Record<string, any>
): Promise<{ data: T | null; error: PostgrestError | null }> {
  let query = (supabase as any).from(tableName).select(select);

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  // Use maybeSingle instead of single to avoid errors when no record found
  return await query.maybeSingle();
}

/**
 * Hook for fetching a single record safely
 */
export function useSingleRecord<T>({
  queryKey,
  tableName,
  select = '*',
  filters,
  enabled = true,
  showErrorToast = true,
}: {
  queryKey: string[];
  tableName: string;
  select?: string;
  filters: Record<string, any>;
  enabled?: boolean;
  showErrorToast?: boolean;
}) {
  return useSupabaseQuery<T | null>({
    queryKey: [...queryKey, JSON.stringify(filters)],
    queryFn: () => fetchSingleRecord<T>(tableName, select, filters),
    enabled: enabled && Object.values(filters).every(v => v !== undefined && v !== null),
    showErrorToast,
    errorMessage: `Failed to load ${tableName} record`,
  });
}
