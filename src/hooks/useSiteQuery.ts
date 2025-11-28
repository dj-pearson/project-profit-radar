import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Site-aware query hook that automatically filters by site_id
 * 
 * Usage:
 * const { data } = useSiteQuery('projects', async (siteId) => {
 *   return supabase
 *     .from('projects')
 *     .select('*')
 *     .eq('site_id', siteId);
 * });
 */
export function useSiteQuery<TData = any>(
  queryKey: string | readonly unknown[],
  queryFn: (siteId: string) => Promise<{ data: TData | null; error: any }>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: Array.isArray(queryKey) ? [...queryKey, siteId] : [queryKey, siteId],
    queryFn: async () => {
      if (!siteId) {
        throw new Error('No site_id available. Please ensure you are logged in.');
      }

      const { data, error } = await queryFn(siteId);
      if (error) throw error;
      return data;
    },
    enabled: !!siteId && (options?.enabled !== false),
    ...options,
  });
}

