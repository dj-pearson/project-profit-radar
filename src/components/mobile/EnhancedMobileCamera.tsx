import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X, SwitchCamera } from 'lucide-react';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';

interface MobileCameraProps {
  onCapture: (file: File, metadata?: CameraMetadata) => void;
  onCancel: () => void;
  maxPhotos?: number;
  currentCount?: number;
  enableGeolocation?: boolean;
  quality?: number; // 0.1 to 1.0
}

interface CameraMetadata {
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  deviceInfo?: {
    platform: string;
    model: string;
  };
}

export const EnhancedMobileCamera = ({
  onCapture,
  onCancel,
  maxPhotos = 10,
  currentCount = 0,
  enableGeolocation = true,
  quality = 0.8
}: MobileCameraProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { deviceInfo, capabilities, triggerHapticFeedback } = useDeviceInfo();

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      if (!capabilities.hasCamera) {
        setError('Camera not available on this device');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        // Wait for video to load metadata
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  }, [facingMode, capabilities.hasCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    triggerHapticFeedback('medium');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const dataURL = canvas.toDataURL('image/jpeg', quality);
    setCapturedImage(dataURL);
    stopCamera();
  }, [triggerHapticFeedback, quality, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(async () => {
    if (!capturedImage || !canvasRef.current) return;

    // Convert data URL to File
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const timestamp = new Date();
    const filename = `photo-${timestamp.getTime()}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });

    // Gather metadata
    const metadata: CameraMetadata = {
      timestamp,
      deviceInfo: {
        platform: deviceInfo.platform,
        model: deviceInfo.model
      }
    };

    // Get location if enabled and available
    if (enableGeolocation && capabilities.hasGeolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
          });
        });

        metadata.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } catch (error) {
        console.warn('Could not get location for photo:', error);
      }
    }

    onCapture(file, metadata);
    triggerHapticFeedback('light');
  }, [capturedImage, deviceInfo, capabilities, enableGeolocation, onCapture, triggerHapticFeedback]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isStreaming) {
      stopCamera();
      // Small delay to ensure camera is stopped
      setTimeout(startCamera, 100);
    }
  }, [isStreaming, stopCamera, startCamera]);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  if (currentCount >= maxPhotos) {
    return (
      <Card className="p-6 text-center">
        <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Photo Limit Reached</h3>
        <p className="text-muted-foreground mb-4">
          You've reached the maximum of {maxPhotos} photos for this session.
        </p>
        <Button onClick={onCancel} variant="outline">
          Close Camera
        </Button>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <Camera className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={startCamera} variant="outline">
            Try Again
          </Button>
          <Button onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full flex flex-col">
        {/* Camera View */}
        <div className="flex-1 relative overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          )}
          
          {/* Photo Counter */}
          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentCount + 1} / {maxPhotos}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-black">
          {capturedImage ? (
            /* Captured Image Controls */
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={retakePhoto}
                size="lg"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Retake
              </Button>
              <Button
                onClick={confirmCapture}
                size="lg"
                className="bg-primary text-primary-foreground"
              >
                <Check className="w-5 h-5 mr-2" />
                Use Photo
              </Button>
            </div>
          ) : (
            /* Camera Controls */
            <div className="flex items-center justify-between">
              <Button
                onClick={onCancel}
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>

              <Button
                onClick={capturePhoto}
                disabled={!isStreaming}
                size="lg"
                className="w-16 h-16 rounded-full bg-white text-black hover:bg-gray-200"
              >
                <Camera className="w-8 h-8" />
              </Button>

              <Button
                onClick={switchCamera}
                disabled={!isStreaming}
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <SwitchCamera className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};