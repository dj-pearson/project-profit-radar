import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MobileCameraProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  maxPhotos?: number;
  currentCount?: number;
}

const MobileCamera: React.FC<MobileCameraProps> = ({ 
  onCapture, 
  onCancel, 
  maxPhotos = 10,
  currentCount = 0 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions."
      });
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [stopCamera]);

  const confirmCapture = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `photo-${timestamp}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.8);
  }, [capturedImage, onCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    stopCamera();
    setTimeout(startCamera, 100);
  }, [startCamera, stopCamera]);

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  if (currentCount >= maxPhotos) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center p-6">
          <p className="mb-4">Maximum photos ({maxPhotos}) reached</p>
          <Button onClick={onCancel} variant="outline">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="relative w-full h-full">
        {capturedImage ? (
          // Preview captured image
          <div className="w-full h-full flex flex-col">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="flex-1 w-full object-cover"
            />
            <div className="p-4 bg-black/80 flex justify-center space-x-4">
              <Button onClick={retakePhoto} variant="outline" size="lg">
                <RotateCcw className="h-5 w-5 mr-2" />
                Retake
              </Button>
              <Button onClick={confirmCapture} size="lg" className="bg-primary">
                <Check className="h-5 w-5 mr-2" />
                Use Photo
              </Button>
            </div>
          </div>
        ) : (
          // Camera view
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Camera controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <Button onClick={onCancel} variant="outline" size="sm">
                  <X className="h-4 w-4" />
                </Button>
                
                <Button 
                  onClick={capturePhoto} 
                  disabled={!isStreaming}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-white hover:bg-gray-100"
                >
                  <Camera className="h-6 w-6 text-black" />
                </Button>
                
                <Button onClick={flipCamera} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-center mt-2">
                <p className="text-white text-sm">
                  {currentCount}/{maxPhotos} photos
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MobileCamera;