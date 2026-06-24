/**
 * useVideoUpload Hook
 * Provides video upload functionality with progress tracking, validation, and metadata extraction
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Supported video formats
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/mpeg',
];

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  fileName: string;
  fileType: string;
}

export interface UploadConfig {
  config_name: string;
  file_category: string;
  allowed_extensions: string[];
  allowed_mime_types: string[];
  max_file_size_bytes: number;
  max_width: number | null;
  max_height: number | null;
  max_duration_seconds: number | null;
  auto_compress: boolean;
  generate_thumbnail: boolean;
}

export interface VideoUploadResult {
  url: string;
  filePath: string;
  metadata: VideoMetadata;
  documentId?: string;
}

export interface UseVideoUploadOptions {
  bucket?: string;
  path?: string;
  projectId?: string;
  autoCreateDocument?: boolean;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: VideoUploadResult) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to fetch upload configuration for video files
 */
export function useUploadConfig(fileCategory: string = 'video') {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['upload-config', companyId, fileCategory],
    queryFn: async () => {
            const { data, error } = await supabase.rpc('get_upload_config', {
        p_company_id: companyId || null,
        p_file_category: fileCategory,
      });

      if (error) throw error;
      return data as UploadConfig[] | null;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Extract metadata from a video file
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      // Return partial metadata if extraction fails
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
      });
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Validate video file against configuration
 */
export function validateVideoFile(
  file: File,
  config?: UploadConfig | null,
  metadata?: VideoMetadata
): { valid: boolean; error?: string } {
  // Default max size: 100MB
  const maxSize = config?.max_file_size_bytes || 100 * 1024 * 1024;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${formatFileSize(maxSize)}. Your file is ${formatFileSize(file.size)}.`,
    };
  }

  // Check file type
  const allowedTypes = config?.allowed_mime_types || SUPPORTED_VIDEO_FORMATS;
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported video format. Supported formats: MP4, WebM, MOV, AVI, WMV, MPEG`,
    };
  }

  // Check duration if metadata available
  if (metadata && config?.max_duration_seconds) {
    if (metadata.duration > config.max_duration_seconds) {
      return {
        valid: false,
        error: `Video duration must be less than ${formatDuration(config.max_duration_seconds)}. Your video is ${formatDuration(metadata.duration)}.`,
      };
    }
  }

  // Check dimensions if metadata available
  if (metadata) {
    if (config?.max_width && metadata.width > config.max_width) {
      return {
        valid: false,
        error: `Video width must be less than ${config.max_width}px. Your video is ${metadata.width}px wide.`,
      };
    }
    if (config?.max_height && metadata.height > config.max_height) {
      return {
        valid: false,
        error: `Video height must be less than ${config.max_height}px. Your video is ${metadata.height}px tall.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Main video upload hook
 */
export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const {
    bucket = 'project-documents',
    path,
    projectId,
    autoCreateDocument = true,
    onProgress,
    onSuccess,
    onError,
  } = options;

  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: uploadConfig } = useUploadConfig('video');
  const config = uploadConfig?.[0] || null;

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<VideoUploadResult> => {
            setIsUploading(true);
      setProgress(0);

      // Extract metadata
      const metadata = await extractVideoMetadata(file);

      // Validate file
      const validation = validateVideoFile(file, config, metadata);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const basePath = path || (projectId ? `projects/${projectId}/videos` : 'videos');
      const filePath = `${basePath}/${fileName}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = Math.min(prev + 10, 90);
          onProgress?.(newProgress);
          return newProgress;
        });
      }, 200);

      try {
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        clearInterval(progressInterval);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);

        let documentId: string | undefined;

        // Create document record if enabled
        if (autoCreateDocument) {
          const { data: document, error: docError } = await supabase
            .from('documents')
            .insert({
              company_id: companyId,
              project_id: projectId || null,
              name: file.name,
              file_path: publicUrl,
              file_type: file.type,
              file_size: file.size,
              media_type: 'video',
              video_duration: metadata.duration || null,
              video_width: metadata.width || null,
              video_height: metadata.height || null,
            })
            .select('id')
            .single();

          if (docError) {
            console.error('Failed to create document record:', docError);
          } else {
            documentId = document.id;

            // If project ID provided, also create project_videos record
            if (projectId) {
              await supabase.from('project_videos').insert({
                company_id: companyId,
                project_id: projectId,
                document_id: documentId,
                title: file.name,
                video_type: 'documentation',
                created_by: userProfile?.id,
              });
            }
          }
        }

        setProgress(100);
        onProgress?.(100);

        const result: VideoUploadResult = {
          url: publicUrl,
          filePath,
          metadata,
          documentId,
        };

        return result;
      } finally {
        clearInterval(progressInterval);
      }
    },
    onSuccess: (result) => {
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['project_videos'] });
      toast.success('Video uploaded successfully');
      onSuccess?.(result);
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setProgress(0);
      toast.error(`Upload failed: ${error.message}`);
      onError?.(error.message);
    },
  });

  const upload = useCallback(
    (file: File) => {
      return uploadMutation.mutateAsync(file);
    },
    [uploadMutation]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setIsUploading(false);
  }, []);

  return {
    upload,
    reset,
    progress,
    isUploading,
    config,
    error: uploadMutation.error?.message,
  };
}

/**
 * Hook to fetch project videos
 */
export function useProjectVideos(projectId: string | undefined) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['project_videos', projectId, companyId],
    queryFn: async () => {
            const { data, error } = await supabase
        .from('project_videos')
        .select(`
          *,
          document:documents(*)
        `)
        .eq('project_id', projectId)
        .eq('company_id', companyId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!projectId,
  });
}

/**
 * Hook to delete a video
 */
export function useDeleteVideo() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, filePath }: { documentId: string; filePath?: string }) => {
            // Delete from storage if file path provided
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('project-documents')
          .remove([filePath]);

        if (storageError) {
          console.error('Failed to delete from storage:', storageError);
        }
      }

      // Delete document record (cascades to project_videos)
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('company_id', companyId);

      if (docError) throw docError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['project_videos'] });
      toast.success('Video deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete video: ${error.message}`);
    },
  });
}

// Utility functions
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins}m ${secs}s`;
}
