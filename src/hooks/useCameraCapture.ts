import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface CaptureOptions {
  resultType?: CameraResultType;
  source?: CameraSource;
  quality?: number;
  allowEditing?: boolean;
  saveToGallery?: boolean;
}

interface CameraPhoto {
  base64String?: string;
  dataUrl?: string;
  format: string;
  saved: boolean;
  webPath?: string;
  path?: string;
}

export const useCameraCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);

  const capturePhoto = useCallback(async (options: CaptureOptions = {}): Promise<CameraPhoto | null> => {
    if (!Capacitor.isNativePlatform() && !navigator.mediaDevices) {
      toast({
        title: "Camera Not Available",
        description: "Camera access is not available in this environment.",
        variant: "destructive"
      });
      return null;
    }

    setIsCapturing(true);

    try {
      const image = await Camera.getPhoto({
        quality: options.quality || 90,
        allowEditing: options.allowEditing || false,
        resultType: options.resultType || CameraResultType.Uri,
        source: options.source || CameraSource.Camera,
        saveToGallery: options.saveToGallery || true
      });

      return {
        base64String: image.base64String,
        dataUrl: image.dataUrl,
        format: image.format,
        saved: true,
        webPath: image.webPath,
        path: image.path
      };
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const captureFromGallery = useCallback(async (): Promise<CameraPhoto | null> => {
    return capturePhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.Uri
    });
  }, [capturePhoto]);

  const captureWithCamera = useCallback(async (): Promise<CameraPhoto | null> => {
    return capturePhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri
    });
  }, [capturePhoto]);

  // Save photo to device filesystem
  const savePhoto = useCallback(async (photo: CameraPhoto, filename: string): Promise<string | null> => {
    try {
      if (Capacitor.isNativePlatform()) {
        // On native platforms, save to filesystem
        const base64Data = photo.base64String;
        if (!base64Data) return null;

        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Data
        });

        return result.uri;
      } else {
        // On web, return the webPath
        return photo.webPath || null;
      }
    } catch (error) {
      console.error('Save photo error:', error);
      toast({
        title: "Save Error",
        description: "Failed to save photo.",
        variant: "destructive"
      });
      return null;
    }
  }, []);

  // Check if camera is available
  const checkCameraPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const permissions = await Camera.checkPermissions();
      
      if (permissions.camera !== 'granted' && permissions.camera !== 'limited') {
        const requested = await Camera.requestPermissions();
        return requested.camera === 'granted' || requested.camera === 'limited';
      }
      
      return true;
    } catch (error) {
      console.error('Camera permissions error:', error);
      return false;
    }
  }, []);

  return {
    capturePhoto,
    captureFromGallery,
    captureWithCamera,
    savePhoto,
    checkCameraPermissions,
    isCapturing
  };
};

// Hook for categorizing photos by project/location
export const usePhotoCategorization = () => {
  const [categories, setCategories] = useState<{
    [key: string]: {
      projectId?: string;
      location?: string;
      timestamp: Date;
      tags: string[];
    }
  }>({});

  const categorizePhoto = useCallback((
    photoId: string, 
    projectId?: string, 
    location?: string, 
    tags: string[] = []
  ) => {
    setCategories(prev => ({
      ...prev,
      [photoId]: {
        projectId,
        location,
        timestamp: new Date(),
        tags
      }
    }));
  }, []);

  const getPhotoMetadata = useCallback((photoId: string) => {
    return categories[photoId] || null;
  }, [categories]);

  return {
    categorizePhoto,
    getPhotoMetadata,
    categories
  };
};