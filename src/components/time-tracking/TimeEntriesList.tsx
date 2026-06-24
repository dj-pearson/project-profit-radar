import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

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
  const timeEntryColumns: TableColumn<TimeEntry>[] = [
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        <span className="font-medium">{value || 'Work session'}</span>
      ),
    },
    {
      key: 'start_time',
      header: 'Start Time',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(value), 'MMM d, yyyy h:mm a')}
        </span>
      ),
    },
    {
      key: 'end_time',
      header: 'Status',
      render: (value) => value ? (
        <Badge className="bg-blue-500">Completed</Badge>
      ) : (
        <Badge className="bg-green-500">Active</Badge>
      ),
    },
    {
      key: 'total_hours',
      header: 'Hours',
      sortable: true,
      render: (value) => (
        <span className="font-medium">
          {value ? `${value.toFixed(2)}h` : 'In progress'}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      render: (value) => value ? (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          <span className="truncate">{value}</span>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">--</span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Time Entries</CardTitle>
        <CardDescription>Your latest work sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <AccessibleTable<TimeEntry>
          caption="Recent Time Entries"
          hideCaption
          columns={timeEntryColumns}
          data={entries}
          emptyContent={
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium mb-2">No time entries yet</h3>
              <p className="text-muted-foreground">
                Start your first timer to begin tracking your work hours
              </p>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
};
