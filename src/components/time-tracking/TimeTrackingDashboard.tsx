import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, Square, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface TimeEntry {
  id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  total_hours?: number;
  location?: string;
  project_id?: string;
  task_id?: string;
  user_id: string;
  cost_code_id?: string;
  break_duration?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  location_accuracy?: number;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

export const TimeTrackingDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTimeEntries();
      fetchProjects();
    }
  }, [user]);

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      setTimeEntries(data || []);
      
      // Find active entry (one without end_time)
      const active = data?.find(entry => !entry.end_time);
      setActiveEntry(active || null);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast({
        title: "Error",
        description: "Failed to load time entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('created_by', user?.id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const startTimer = async (projectId?: string, taskDescription = 'Work session') => {
    try {
      if (activeEntry) {
        toast({
          title: "Timer Already Running",
          description: "Please stop the current timer before starting a new one",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user?.id,
          project_id: projectId || null,
          description: taskDescription,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setActiveEntry(data);
      await fetchTimeEntries();
      
      toast({
        title: "Timer Started",
        description: `Started tracking time for: ${taskDescription}`,
      });
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive",
      });
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString()
        })
        .eq('id', activeEntry.id);

      if (error) throw error;

      setActiveEntry(null);
      await fetchTimeEntries();
      
      toast({
        title: "Timer Stopped",
        description: "Time entry has been completed",
      });
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeColor = (entry: TimeEntry) => {
    if (!entry.end_time) {
      return 'bg-green-500'; // Active
    }
    return 'bg-blue-500'; // Completed
  };

  const calculateTotalHours = () => {
    return timeEntries
      .reduce((total, entry) => total + (entry.total_hours || 0), 0);
  };

  const calculateTotalEarnings = () => {
    // Simple calculation - would need hourly rates stored separately
    return calculateTotalHours() * 75; // Default rate
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Active Timer */}
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{activeEntry.description || 'Work session'}</h3>
                  <p className="text-sm text-muted-foreground">
                    Started {formatDistanceToNow(new Date(activeEntry.start_time))} ago
                  </p>
                </div>
                <Button onClick={stopTimer} variant="destructive" size="sm">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Timer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No active timer running</p>
                <Button onClick={() => startTimer()} size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateTotalHours().toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <DollarSign className="h-5 w-5 mr-1" />
              {calculateTotalEarnings().toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>Your latest work sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No time entries yet. Start your first timer!
              </div>
            ) : (
              timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{entry.description || 'Work session'}</h4>
                      <Badge className={getStatusBadgeColor(entry)}>
                        {entry.end_time ? 'Completed' : 'Active'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{format(new Date(entry.start_time), 'MMM d, yyyy h:mm a')}</span>
                      {entry.total_hours && (
                        <span>{entry.total_hours.toFixed(2)} hours</span>
                      )}
                      {entry.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {entry.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {entry.total_hours ? `${entry.total_hours.toFixed(2)}h` : 'In progress'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      $75/hr
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};