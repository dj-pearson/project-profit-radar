import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { useGPSLocation } from '@/hooks/useGPSLocation';

interface LocationButtonProps {
  onLocationReceived: (coordinates: { latitude: number; longitude: number; accuracy: number }, address?: string) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export const LocationButton: React.FC<LocationButtonProps> = ({
  onLocationReceived,
  variant = 'outline',
  size = 'sm',
  className = '',
  children
}) => {
  const { isLoading, getCurrentLocation } = useGPSLocation();

  const handleGetLocation = async () => {
    const result = await getCurrentLocation();
    
    if (result.coordinates) {
      onLocationReceived(
        {
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude,
          accuracy: result.coordinates.accuracy
        },
        result.address
      );
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleGetLocation}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
      {children && <span className="ml-2">{children}</span>}
    </Button>
  );
};
