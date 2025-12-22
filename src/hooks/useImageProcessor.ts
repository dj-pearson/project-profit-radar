/**
 * Image Processor Hook
 * Provides client-side integration with the image processing edge function
 * Supports WebP/AVIF conversion, thumbnails, and responsive sizes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface ProcessingOptions {
  generateThumbnail?: boolean;
  generateResponsiveSizes?: boolean;
  convertToModernFormats?: boolean;
  quality?: number;
}

export interface ProcessedVersion {
  format: string;
  size: string;
  path: string;
  width?: number;
  height?: number;
}

export interface ProcessingResult {
  success: boolean;
  original: {
    path: string;
    size: number;
    format: string;
    width?: number;
    height?: number;
  };
  processed: ProcessedVersion[];
  thumbnail?: string;
  savings?: {
    originalSize: number;
    processedSize: number;
    percentage: number;
  };
  error?: string;
}

export interface ProcessingQueueItem {
  id: string;
  site_id: string;
  company_id?: string;
  original_path: string;
  bucket: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  attempts: number;
  created_at: string;
  processed_at?: string;
}

export interface ProcessedImage {
  id: string;
  site_id: string;
  document_id?: string;
  original_path: string;
  original_size: number;
  original_format: string;
  bucket: string;
  versions: ProcessedVersion[];
  thumbnail_path?: string;
  thumbnail_url?: string;
  total_processed_size?: number;
  savings_percentage?: number;
  width?: number;
  height?: number;
  created_at: string;
}

// Supported image formats
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Available sizes
export const IMAGE_SIZES = {
  thumbnail: { width: 200, height: 200 },
  small: { width: 640, height: null },
  medium: { width: 1024, height: null },
  large: { width: 1920, height: null },
  original: { width: null, height: null },
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Hook to process an image through the edge function
 */
export function useProcessImage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storagePath,
      bucket,
      options = {},
      documentId,
      companyId,
    }: {
      storagePath: string;
      bucket: string;
      options?: ProcessingOptions;
      documentId?: string;
      companyId?: string;
    }): Promise<ProcessingResult> => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      if (!siteId) {
        throw new Error('No site_id available');
      }

      const response = await supabase.functions.invoke('image-processor', {
        body: {
          storagePath,
          bucket,
          siteId,
          companyId,
          documentId,
          generateThumbnail: options.generateThumbnail ?? true,
          generateResponsiveSizes: options.generateResponsiveSizes ?? true,
          convertToModernFormats: options.convertToModernFormats ?? true,
          quality: options.quality,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process image');
      }

      return response.data as ProcessingResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processed-images'] });
      queryClient.invalidateQueries({ queryKey: ['processing-queue'] });
    },
  });
}

/**
 * Hook to get processing queue status
 */
export function useProcessingQueue(options?: { enabled?: boolean }) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['processing-queue', siteId],
    queryFn: async (): Promise<ProcessingQueueItem[]> => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('image_processing_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as ProcessingQueueItem[]) || [];
    },
    enabled: !!siteId && (options?.enabled !== false),
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });
}

/**
 * Hook to get pending processing jobs count
 */
export function usePendingProcessingCount() {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['processing-queue-count', siteId],
    queryFn: async (): Promise<number> => {
      if (!siteId) throw new Error('No site_id available');

      const { count, error } = await supabase
        .from('image_processing_queue')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'processing']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!siteId,
    refetchInterval: 10000,
  });
}

/**
 * Hook to get processed images
 */
export function useProcessedImages(documentId?: string, options?: { enabled?: boolean }) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['processed-images', siteId, documentId],
    queryFn: async (): Promise<ProcessedImage[]> => {
      if (!siteId) throw new Error('No site_id available');

      let query = supabase
        .from('processed_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (documentId) {
        query = query.eq('document_id', documentId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return (data as ProcessedImage[]) || [];
    },
    enabled: !!siteId && (options?.enabled !== false),
  });
}

/**
 * Hook to get a single processed image by original path
 */
export function useProcessedImage(originalPath: string, options?: { enabled?: boolean }) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['processed-image', siteId, originalPath],
    queryFn: async (): Promise<ProcessedImage | null> => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('processed_images')
        .select('*')
        .eq('original_path', originalPath)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ProcessedImage | null;
    },
    enabled: !!siteId && !!originalPath && (options?.enabled !== false),
  });
}

/**
 * Hook to get optimized image URL
 */
export function useOptimizedImageUrl(
  originalPath: string | undefined,
  size: ImageSize = 'medium',
  format: 'webp' | 'avif' = 'webp'
) {
  const { data: processedImage, isLoading } = useProcessedImage(originalPath || '', {
    enabled: !!originalPath,
  });

  if (!originalPath || isLoading || !processedImage) {
    return { url: originalPath, isOptimized: false, isLoading };
  }

  // Find the requested version
  const version = processedImage.versions.find(
    (v) => v.format === format && v.size === size
  );

  if (version) {
    return { url: version.path, isOptimized: true, isLoading: false };
  }

  // Fallback to original size in requested format
  const originalVersion = processedImage.versions.find(
    (v) => v.format === format && v.size === 'original'
  );

  if (originalVersion) {
    return { url: originalVersion.path, isOptimized: true, isLoading: false };
  }

  // Return original path if no optimized version found
  return { url: originalPath, isOptimized: false, isLoading: false };
}

/**
 * Hook to cancel a processing job
 */
export function useCancelProcessingJob() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string): Promise<void> => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('image_processing_queue')
        .delete()
        .eq('id', jobId)
        .in('status', ['pending']); // Can only cancel pending jobs

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-queue'] });
      queryClient.invalidateQueries({ queryKey: ['processing-queue-count'] });
    },
  });
}

/**
 * Hook to retry a failed processing job
 */
export function useRetryProcessingJob() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string): Promise<void> => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('image_processing_queue')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('status', 'failed');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-queue'] });
      queryClient.invalidateQueries({ queryKey: ['processing-queue-count'] });
    },
  });
}

/**
 * Hook to delete a processed image record
 */
export function useDeleteProcessedImage() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string): Promise<void> => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('processed_images')
        .delete()
        .eq('id', imageId)
        .eq('site_id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processed-images'] });
    },
  });
}

/**
 * Hook to get image processing statistics
 */
export function useImageProcessingStats() {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['image-processing-stats', siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id available');

      // Get queue stats
      const { data: queueData, error: queueError } = await supabase
        .from('image_processing_queue')
        .select('status')
        .eq('site_id', siteId);

      if (queueError) throw queueError;

      // Get processed images stats
      const { data: processedData, error: processedError } = await supabase
        .from('processed_images')
        .select('original_size, total_processed_size, savings_percentage')
        .eq('site_id', siteId);

      if (processedError) throw processedError;

      // Calculate stats
      const queueStats = {
        pending: queueData?.filter((q) => q.status === 'pending').length || 0,
        processing: queueData?.filter((q) => q.status === 'processing').length || 0,
        completed: queueData?.filter((q) => q.status === 'completed').length || 0,
        failed: queueData?.filter((q) => q.status === 'failed').length || 0,
      };

      const processedStats = {
        totalImages: processedData?.length || 0,
        totalOriginalSize: processedData?.reduce((sum, p) => sum + (p.original_size || 0), 0) || 0,
        totalProcessedSize: processedData?.reduce((sum, p) => sum + (p.total_processed_size || 0), 0) || 0,
        averageSavings:
          processedData?.length > 0
            ? processedData.reduce((sum, p) => sum + (p.savings_percentage || 0), 0) /
              processedData.length
            : 0,
      };

      return {
        queue: queueStats,
        processed: processedStats,
        totalSavings: processedStats.totalOriginalSize - processedStats.totalProcessedSize,
      };
    },
    enabled: !!siteId,
  });
}

/**
 * Upload and process an image in one step
 */
export function useUploadAndProcessImage() {
  const { session } = useAuth();
  const processImage = useProcessImage();

  return useMutation({
    mutationFn: async ({
      file,
      bucket,
      path,
      options = {},
      documentId,
      companyId,
    }: {
      file: File;
      bucket: string;
      path: string;
      options?: ProcessingOptions;
      documentId?: string;
      companyId?: string;
    }): Promise<ProcessingResult> => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      if (!siteId) {
        throw new Error('No site_id available');
      }

      // Validate file type
      if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
        throw new Error(
          `Unsupported format: ${file.type}. Supported: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`
        );
      }

      // Upload the original file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Process the uploaded image
      const result = await processImage.mutateAsync({
        storagePath: path,
        bucket,
        options,
        documentId,
        companyId,
      });

      return result;
    },
  });
}

/**
 * Utility function to get the best image URL for a given screen size
 */
export function getBestImageSize(screenWidth: number): ImageSize {
  if (screenWidth <= 400) return 'thumbnail';
  if (screenWidth <= 768) return 'small';
  if (screenWidth <= 1200) return 'medium';
  return 'large';
}

/**
 * Utility function to format file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Utility function to check if browser supports WebP
 */
export async function supportsWebP(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Utility function to check if browser supports AVIF
 */
export async function supportsAVIF(): Promise<boolean> {
  if (typeof Image === 'undefined') return false;

  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = () => resolve(true);
    avif.onerror = () => resolve(false);
    // Minimal AVIF image
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABpAQ0AIAFBgAFBAQBBIADBQAEAgAABQgAAAs';
  });
}
