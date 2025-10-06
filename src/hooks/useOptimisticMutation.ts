import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';

interface UseOptimisticMutationOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string[];
  updateFn: (oldData: TData[], variables: TVariables) => TData[];
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void;
}

export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  updateFn,
  onSuccess,
  onError,
}: UseOptimisticMutationOptions<TData, TVariables, { previousData?: TData[] }>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, { previousData?: TData[] }>({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData[]>(queryKey);

      // Optimistically update to the new value
      if (previousData) {
        queryClient.setQueryData<TData[]>(queryKey, updateFn(previousData, variables));
      }

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (error: Error, variables: TVariables, context?: { previousData?: TData[] }) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      onError?.(error, variables, context);
    },
    onSuccess,
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
