import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/common/ErrorState';

interface TimeEntry {
  id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  total_hours?: number;
  location?: string;
}

interface TimeEntriesListProps {
  entries: TimeEntry[];
  hourlyRate?: number;
}

export const TimeEntriesList: React.FC<TimeEntriesListProps> = ({ 
  entries,
  hourlyRate = 0
}) => {
  const getStatusBadgeColor = (entry: TimeEntry) => {
    return !entry.end_time ? 'bg-green-500' : 'bg-blue-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Time Entries</CardTitle>
        <CardDescription>Your latest work sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            title="No time entries yet"
            description="Start your first timer to begin tracking your work hours"
          />
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div 
                key={entry.id} 
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium truncate">{entry.description || 'Work session'}</h4>
                    <Badge className={getStatusBadgeColor(entry)}>
                      {entry.end_time ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <span className="truncate">
                      {format(new Date(entry.start_time), 'MMM d, yyyy h:mm a')}
                    </span>
                    {entry.total_hours && (
                      <span className="whitespace-nowrap">{entry.total_hours.toFixed(2)} hours</span>
                    )}
                    {entry.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{entry.location}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-medium">
                    {entry.total_hours ? `${entry.total_hours.toFixed(2)}h` : 'In progress'}
                  </div>
                  {hourlyRate > 0 && (
                    <div className="text-sm text-muted-foreground">
                      ${hourlyRate}/hr
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
