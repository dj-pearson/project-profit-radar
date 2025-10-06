import { useState } from 'react';
import { platform } from '@/lib/platform';

interface CameraHookReturn {
  takePicture: () => Promise<string | null>;
  selectFromGallery: () => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for camera access using Capacitor Camera plugin
 * Falls back to web file input if not on native platform
 */
export function useCamera(): CameraHookReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePicture = async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!platform.isNative) {
        // Web fallback - use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';

        return new Promise((resolve) => {
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              resolve(url);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      }

      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      return photo.webPath || null;
    } catch (err: any) {
      if (err.message !== 'User cancelled photos app') {
        setError('Failed to take picture');
        console.error('Camera error:', err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromGallery = async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!platform.isNative) {
        // Web fallback - use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        return new Promise((resolve) => {
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              resolve(url);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      }

      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      return photo.webPath || null;
    } catch (err: any) {
      if (err.message !== 'User cancelled photos app') {
        setError('Failed to select photo');
        console.error('Gallery error:', err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    takePicture,
    selectFromGallery,
    isLoading,
    error,
  };
}
