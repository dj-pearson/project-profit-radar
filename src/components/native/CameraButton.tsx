import { Camera, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';

interface CameraButtonProps {
  onCapture: (url: string) => void;
  showPreview?: boolean;
}

/**
 * Button component for taking photos or selecting from gallery
 */
export function CameraButton({ onCapture, showPreview = true }: CameraButtonProps) {
  const { takePicture, selectFromGallery, isLoading } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    const photo = await takePicture();
    if (photo) {
      setPreview(photo);
      onCapture(photo);
    }
  };

  const handleSelectPhoto = async () => {
    const photo = await selectFromGallery();
    if (photo) {
      setPreview(photo);
      onCapture(photo);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={handleTakePhoto}
          disabled={isLoading}
          className="flex-1"
          size="lg"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </>
          )}
        </Button>
        <Button
          onClick={handleSelectPhoto}
          disabled={isLoading}
          variant="outline"
          className="flex-1"
          size="lg"
        >
          <Image className="h-4 w-4 mr-2" />
          Gallery
        </Button>
      </div>

      {showPreview && preview && (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
