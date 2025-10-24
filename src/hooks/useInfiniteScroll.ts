import { useCallback, useRef, useEffect } from 'react';
import { useInfiniteQuery, UseInfiniteQueryOptions, InfiniteData } from '@tanstack/react-query';

interface UseInfiniteScrollOptions<T> {
  queryKey: string[];
  queryFn: (pageParam: number) => Promise<{ data: T[]; hasMore: boolean }>;
  staleTime?: number;
  enabled?: boolean;
}

export function useInfiniteScroll<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000,
  enabled = true,
}: UseInfiniteScrollOptions<T>) {
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) => queryFn(pageParam as number),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length : undefined,
    initialPageParam: 0,
    staleTime,
    enabled,
  });

  const loadMoreRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingNextPage) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        {
          rootMargin: '100px', // Start loading before reaching the bottom
        }
      );

      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const allData = data?.pages?.flatMap((page) => page.data) ?? [];

  return {
    data: allData,
    loadMoreRef,
    isFetchingNextPage,
    hasNextPage,
    isLoading,
    error,
  };
}
