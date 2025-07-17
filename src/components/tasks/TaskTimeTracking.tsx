import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, Clock, Trash2 } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TimeEntry {
  id: string;
  date_logged: string;
  hours_logged: number;
  description?: string;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface TaskTimeTrackingProps {
  taskId: string;
}

export const TaskTimeTracking: React.FC<TaskTimeTrackingProps> = ({ taskId }) => {
  const { userProfile } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentStartTime, setCurrentStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [manualHours, setManualHours] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTimeEntries();
    checkActiveTimer();
  }, [taskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking && currentStartTime) {
      interval = setInterval(() => {
        setElapsedTime(differenceInSeconds(new Date(), currentStartTime));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, currentStartTime]);

  const loadTimeEntries = async () => {
    try {
      const { data } = await supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const checkActiveTimer = async () => {
    // Simple time tracking - no active timer check for now
    // This can be enhanced later with more complex tracking
  };

  const startTimer = async () => {
    if (!userProfile) return;

    const startTime = new Date();
    setIsTracking(true);
    setCurrentStartTime(startTime);
    setElapsedTime(0);
  };

  const stopTimer = async () => {
    if (!userProfile || !currentStartTime) return;

    try {
      const endTime = new Date();
      const hoursLogged = differenceInSeconds(endTime, currentStartTime) / 3600;

      const { error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: userProfile.id,
          date_logged: new Date().toISOString().split('T')[0],
          hours_logged: hoursLogged,
          description: 'Timer session'
        });

      if (!error) {
        setIsTracking(false);
        setCurrentStartTime(null);
        setElapsedTime(0);
        loadTimeEntries();
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const addManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !manualHours) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: userProfile.id,
          date_logged: new Date().toISOString().split('T')[0],
          hours_logged: parseFloat(manualHours),
          description: manualDescription.trim() || null
        });

      if (!error) {
        setManualHours('');
        setManualDescription('');
        loadTimeEntries();
      }
    } catch (error) {
      console.error('Error adding manual entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', entryId);

      if (!error) {
        loadTimeEntries();
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours_logged, 0);

  return (
    <div className="space-y-4">
      {/* Timer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold mb-2">
              {formatTime(elapsedTime)}
            </div>
            <div className="flex justify-center gap-2">
              {!isTracking ? (
                <Button onClick={startTimer} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Start Timer
                </Button>
              ) : (
                <Button onClick={stopTimer} variant="destructive" className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Stop Timer
                </Button>
              )}
            </div>
          </div>

          {/* Manual Time Entry */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Add Manual Entry</h4>
            <form onSubmit={addManualEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="manual-hours" className="text-xs">Hours</Label>
                  <Input
                    id="manual-hours"
                    type="number"
                    step="0.25"
                    min="0"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    placeholder="1.5"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={loading || !manualHours} className="w-full">
                    Add Entry
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="manual-description" className="text-xs">Description (Optional)</Label>
                <Textarea
                  id="manual-description"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="What did you work on?"
                  rows={2}
                />
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Time Entries</h4>
          <div className="text-sm text-muted-foreground">
            Total: {totalHours.toFixed(2)} hours
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No time entries yet. Start tracking your time!
            </p>
          ) : (
            timeEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{entry.hours_logged.toFixed(2)}h</span>
                        <span className="text-muted-foreground">
                          {entry.user_profiles?.first_name} {entry.user_profiles?.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};