import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCcw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface EnhancedMobileCameraProps {
  onCapture: (file: File, metadata?: any) => void;
  onCancel: () => void;
  maxPhotos?: number;
  showPreview?: boolean;
}

const EnhancedMobileCamera: React.FC<EnhancedMobileCameraProps> = ({
  onCapture,
  onCancel,
  maxPhotos = 5,
  showPreview = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Helper function to get GPS coordinates
  const getCurrentPosition = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      if ((window as any).Capacitor) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const position = await Geolocation.getCurrentPosition();
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } else {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }),
            () => resolve(null),
            { timeout: 5000 }
          );
        });
      }
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  };

  const startCamera = useCallback(async () => {
    try {
      // Try native camera first (mobile)
      if ((window as any).Capacitor) {
        return; // Camera will be handled by native capture
      }
      
      // Fallback to web camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      // Fallback to file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      // Use native camera if available (mobile)
      if ((window as any).Capacitor) {
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera
        });

        if (image.dataUrl) {
          // Convert data URL to blob and create file
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          if (showPreview) {
            setCapturedPhoto(image.dataUrl);
          } else {
            onCapture(file, { 
              timestamp: new Date(), 
              location: 'native_camera',
              gps: await getCurrentPosition()
            });
            stopCamera();
          }
        }
        return;
      }

      // Fallback to web camera
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const photoUrl = URL.createObjectURL(blob);
          
          if (showPreview) {
            setCapturedPhoto(photoUrl);
          } else {
            onCapture(file, { timestamp: new Date(), location: 'web_camera' });
            stopCamera();
          }
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Failed to capture photo:', error);
      // Fallback to file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, showPreview, stopCamera]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onCapture(file, { 
        timestamp: new Date(), 
        location: 'gallery',
        gps: await getCurrentPosition()
      });
    }
  }, [onCapture]);

  const confirmPhoto = useCallback(async () => {
    if (capturedPhoto && canvasRef.current) {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file, { 
            timestamp: new Date(), 
            location: 'camera',
            gps: await getCurrentPosition()
          });
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  }, [capturedPhoto, onCapture, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }
  }, [capturedPhoto]);

  const handleCancel = useCallback(() => {
    stopCamera();
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }
    onCancel();
  }, [stopCamera, capturedPhoto, onCancel]);

  React.useEffect(() => {
    // Only start web camera if not on mobile
    if (!(window as any).Capacitor) {
      startCamera();
    }
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  if (capturedPhoto) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative">
          <img 
            src={capturedPhoto} 
            alt="Captured" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="p-4 bg-background">
          <div className="flex justify-center gap-4">
            <Button onClick={retakePhoto} variant="outline" size="lg">
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake
            </Button>
            <Button onClick={confirmPhoto} size="lg">
              <CheckCircle className="h-5 w-5 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-background">
        <Button onClick={handleCancel} variant="ghost" size="sm">
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium">Take Photo</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 relative">
        {/* Show video preview only on web */}
        {!(window as any).Capacitor && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Show placeholder on mobile */}
        {(window as any).Capacitor && (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Tap camera button to take photo</p>
            </div>
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-6 bg-background">
        <div className="flex justify-center gap-6 items-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="lg"
            className="rounded-full"
          >
            Gallery
          </Button>

          <Button
            onClick={capturePhoto}
            size="lg"
            className="rounded-full h-16 w-16 p-0"
            disabled={isCapturing}
          >
            <Camera className="h-8 w-8" />
          </Button>

          <div className="w-16" /> {/* Spacer for symmetry */}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default EnhancedMobileCamera;