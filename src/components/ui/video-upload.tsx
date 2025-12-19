/**
 * VideoUpload Component
 * Reusable video upload component with preview, progress, and validation
 * Supports multiple video formats and configurable size limits
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Video,
  Upload,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Supported video formats
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-ms-wmv', // .wmv
  'video/mpeg',
];

export const VIDEO_FILE_EXTENSIONS = '.mp4,.webm,.ogg,.mov,.avi,.wmv,.mpeg,.mpg';

interface VideoUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  bucket?: string;
  path?: string;
  maxSizeMB?: number;
  accept?: string;
  disabled?: boolean;
  showPreview?: boolean;
  className?: string;
  onUploadStart?: () => void;
  onUploadComplete?: (url: string, metadata: VideoMetadata) => void;
  onUploadError?: (error: string) => void;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  fileName: string;
  fileType: string;
}

export function VideoUpload({
  value,
  onChange,
  label = 'Upload Video',
  placeholder = 'Click to upload or drag and drop',
  bucket = 'project-documents',
  path,
  maxSizeMB = 100, // Default 100MB for videos
  accept = VIDEO_FILE_EXTENSIONS,
  disabled = false,
  showPreview = true,
  className,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `File size must be less than ${maxSizeMB}MB. Your file is ${formatFileSize(file.size)}.`;
      }

      // Check file type
      if (!SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
        return `Unsupported video format. Supported formats: MP4, WebM, OGG, MOV, AVI, WMV, MPEG`;
      }

      return null;
    },
    [maxSizeMB]
  );

  const extractVideoMetadata = useCallback((file: File): Promise<VideoMetadata> => {
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
        // Return partial metadata if video metadata extraction fails
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
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        onUploadError?.(validationError);
        return;
      }

      setUploading(true);
      setProgress(0);
      onUploadStart?.();

      try {
        // Extract video metadata
        const metadata = await extractVideoMetadata(file);
        setVideoMetadata(metadata);

        // Generate unique filename
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = path ? `${path}/${fileName}` : fileName;

        // Simulate progress for better UX (Supabase doesn't provide upload progress)
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

        clearInterval(progressInterval);

        if (error) {
          throw error;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(data.path);

        setProgress(100);
        onChange(publicUrl);
        onUploadComplete?.(publicUrl, metadata);

        toast.success('Video uploaded successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        toast.error(`Failed to upload video: ${errorMessage}`);
        onUploadError?.(errorMessage);
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [bucket, path, validateFile, extractVideoMetadata, onChange, onUploadStart, onUploadComplete, onUploadError]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleUpload]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleRemove = useCallback(() => {
    onChange('');
    setVideoMetadata(null);
    setIsPlaying(false);
  }, [onChange]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}

      {value && showPreview ? (
        // Video Preview
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            src={value}
            className="w-full h-full object-contain"
            muted={isMuted}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Video Controls Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={togglePlay}
                className="rounded-full"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={toggleMute}
                className="rounded-full"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={handleFullscreen}
                className="rounded-full"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Remove Button */}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Video Info */}
          {videoMetadata && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
              <div className="flex justify-between">
                <span>{videoMetadata.fileName}</span>
                <span>{formatDuration(videoMetadata.duration)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>
                  {videoMetadata.width}x{videoMetadata.height}
                </span>
                <span>{formatFileSize(videoMetadata.fileSize)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Upload Zone
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />

          <div className="flex flex-col items-center justify-center text-center">
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <p className="text-sm font-medium">Uploading video...</p>
                <Progress value={progress} className="w-full max-w-xs mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
              </>
            ) : (
              <>
                <div className="p-3 bg-primary/10 rounded-full mb-3">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium">{placeholder}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP4, WebM, MOV up to {maxSizeMB}MB
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3" disabled={disabled}>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Video
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VideoUpload;
