import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Square, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TimeEntry {
  id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  location_accuracy?: number;
}

interface ActiveTimerProps {
  activeEntry: TimeEntry | null;
  onStart: () => void;
  onStop: () => void;
  isLoading?: boolean;
}

export const ActiveTimer: React.FC<ActiveTimerProps> = ({
  activeEntry,
  onStart,
  onStop,
  isLoading = false
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Active Timer
        </CardTitle>
        <CardDescription>
          {activeEntry ? 'Timer is running' : 'No active timer'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeEntry ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{activeEntry.description || 'Work session'}</h3>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Started {formatDistanceToNow(new Date(activeEntry.start_time))} ago
                </p>
                {activeEntry.location && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{activeEntry.location}</span>
                  </div>
                )}
              </div>
              <Button 
                onClick={onStop} 
                variant="destructive" 
                size="sm"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Timer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">No active timer running</p>
              <Button 
                onClick={onStart} 
                size="lg"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
