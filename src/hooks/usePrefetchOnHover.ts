import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UsePrefetchOnHoverOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  staleTime?: number;
}

export function usePrefetchOnHover<T>({
  queryKey,
  queryFn,
  staleTime = 5000,
}: UsePrefetchOnHoverOptions<T>) {
  const queryClient = useQueryClient();

  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
    });
  }, [queryKey, queryFn, staleTime, queryClient]);

  return {
    onMouseEnter: prefetch,
    onTouchStart: prefetch, // Mobile support
  };
}
