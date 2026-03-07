import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type IndexingAction = 'URL_UPDATED' | 'URL_DELETED';

interface IndexingResult {
  url: string;
  success: boolean;
  status?: number;
  error?: string;
  urlNotificationMetadata?: {
    url: string;
    latestUpdate?: { type: string; notifyTime: string };
    latestRemove?: { type: string; notifyTime: string };
  };
}

interface IndexingResponse {
  success: boolean;
  data: {
    submitted: number;
    succeeded: number;
    failed: number;
    action: IndexingAction;
    results: IndexingResult[];
  };
  timestamp: string;
}

interface SubmitUrlsParams {
  urls: string[];
  action: IndexingAction;
}

export const useGoogleIndexing = () => {
  return useMutation({
    mutationFn: async ({ urls, action }: SubmitUrlsParams): Promise<IndexingResponse> => {
      const { data, error } = await supabase.functions.invoke('google-indexing-api', {
        body: { urls, action },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Indexing request failed');

      return data;
    },
    onSuccess: (data) => {
      const { succeeded, failed } = data.data;
      if (failed === 0) {
        toast.success(`Successfully submitted ${succeeded} URL(s) for indexing`);
      } else {
        toast.warning(`${succeeded} succeeded, ${failed} failed`);
      }
    },
    onError: (error: Error) => {
      console.error('Google Indexing API error:', error);
      toast.error(`Indexing failed: ${error.message}`);
    },
  });
};

export const useSubmitUrlForIndexing = () => {
  const mutation = useGoogleIndexing();

  const submitUpdated = (urls: string[]) =>
    mutation.mutateAsync({ urls, action: 'URL_UPDATED' });

  const submitDeleted = (urls: string[]) =>
    mutation.mutateAsync({ urls, action: 'URL_DELETED' });

  return {
    ...mutation,
    submitUpdated,
    submitDeleted,
  };
};
