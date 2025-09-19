import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useOptimisticUpdate = <T>(
  initialData: T,
  updateFunction: (data: T) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
) => {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateOptimistically = useCallback(async (newData: T) => {
    // Immediately update UI with optimistic data
    const previousData = data;
    setData(newData);
    setError(null);
    setIsLoading(true);

    try {
      // Attempt to update on server
      const result = await updateFunction(newData);
      setData(result);
      
      if (options.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }
      
      options.onSuccess?.(result);
    } catch (err) {
      // Rollback to previous data on error
      setData(previousData);
      const error = err as Error;
      setError(error);
      
      toast({
        title: "Error",
        description: options.errorMessage || error.message,
        variant: "destructive",
      });
      
      options.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [data, updateFunction, options]);

  return {
    data,
    isLoading,
    error,
    updateOptimistically,
    setData
  };
};

// Specialized hook for toggle operations (like task completion)
export const useOptimisticToggle = (
  initialValue: boolean,
  toggleFunction: (value: boolean) => Promise<boolean>,
  options: OptimisticUpdateOptions<boolean> = {}
) => {
  const { data: value, updateOptimistically, isLoading, error } = useOptimisticUpdate(
    initialValue,
    toggleFunction,
    options
  );

  const toggle = useCallback(() => {
    updateOptimistically(!value);
  }, [value, updateOptimistically]);

  return {
    value,
    toggle,
    isLoading,
    error
  };
};