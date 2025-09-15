import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  MapPin, 
  Upload,
  Mic,
  Camera,
  MicOff
} from 'lucide-react';

interface MobileFieldInterfaceProps {
  className?: string;
}

export const MobileFieldInterface: React.FC<MobileFieldInterfaceProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing'>('idle');

  const handleSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => setSyncStatus('idle'), 2000);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            <div>
              <CardTitle>Mobile Field Interface</CardTitle>
              <CardDescription>
                Voice commands, photo analysis, and offline sync
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Online/Offline Status */}
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            {/* Location Status */}
            <Badge variant="outline">
              <MapPin className="h-3 w-3 mr-1" />
              GPS
            </Badge>
            
            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncStatus === 'syncing' || !isOnline}
            >
              <Upload className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Voice Recording Controls */}
          <div className="flex items-center justify-center space-x-4 p-6 border-2 border-dashed rounded-lg">
            <Button
              size="lg"
              variant={isRecording ? 'destructive' : 'default'}
              onClick={toggleRecording}
              className="h-16 w-16 rounded-full"
            >
              {isRecording ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            <div className="text-center">
              <p className="font-medium">
                {isRecording ? 'Recording...' : 'Tap to Record'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRecording ? 'Tap again to stop' : 'Say commands like "Create task for electrical work"'}
              </p>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Button>
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                AI will analyze for defects, progress, and safety issues
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileFieldInterface;