import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MobileTextField,
  MobileTextArea,
  MobileSelectField,
} from '@/components/mobile/forms';
import { Clock, Play, Pause, Square, MapPin, Wifi, WifiOff, Users, AlertTriangle, CalendarDays, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useMobileTimeTracker } from '@/hooks/useMobileTimeTracker';
import type { TablesInsert } from '@/integrations/supabase/types';
import { Geolocation } from '@capacitor/geolocation';

interface MobileTimeTrackerProps {
  projectId?: string;
  onTimeEntryChange?: (entry: TimeEntry | null) => void;
}

interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  cost_code_id?: string;
  start_time: string;
  end_time?: string;
  total_hours?: number;
  break_duration: number;
  gps_latitude: number;
  gps_longitude: number;
  location_accuracy: number;
  notes?: string;
  is_overtime: boolean;
  hourly_rate?: number;
  company_id: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
  };
  tasks?: {
    name: string;
  };
  cost_codes?: {
    code: string;
    name: string;
  };
}

const MobileTimeTracker: React.FC<MobileTimeTrackerProps> = ({
  projectId,
  onTimeEntryChange
}) => {
  // Time tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  
  // Location state
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [isInGeofence, setIsInGeofence] = useState<boolean | null>(null);
  
  // Project & task state
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedCostCode, setSelectedCostCode] = useState('');
  
  // Form state
  const [notes, setNotes] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(25); // Default hourly rate

  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();
  const {
    projects, costCodes, optionsError, refetchOptions,
    tasks, crewMembers, dailyEntries, projectError, refetchProject,
    activeEntry, activeEntryLoaded, start, update,
  } = useMobileTimeTracker<TimeEntry>(selectedProject);
  const loadDailyEntries = () => { void refetchProject(); };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Resume an entry left running today, once, when the lookup comes back.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !activeEntryLoaded) return;
    resumed.current = true;
    if (!activeEntry) return;
    setCurrentEntry(activeEntry);
    setIsTracking(true);
    setSelectedProject(activeEntry.project_id);
    setSelectedTask(activeEntry.task_id || '');
    setSelectedCostCode(activeEntry.cost_code_id || '');
    setNotes(activeEntry.notes || '');
    const startTime = new Date(activeEntry.start_time);
    setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
  }, [activeEntry, activeEntryLoaded]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isTracking && !onBreak) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [isTracking, onBreak]);

  const getCurrentLocation = async () => {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const locationData = {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy || 0
      };

      setLocation(locationData);
      checkGeofence(locationData);
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location Access",
        description: "Could not get current location for time tracking",
        variant: "destructive"
      });
    }
  };

  const checkGeofence = (coords: { latitude: number; longitude: number }) => {
    if (!selectedProject) return;

    const project = projects.find(p => p.id === selectedProject);
    if (!project || !project.site_latitude || !project.site_longitude) {
      setIsInGeofence(null);
      return;
    }

    const distance = calculateDistance(
      coords.latitude,
      coords.longitude,
      project.site_latitude,
      project.site_longitude
    );

    const allowedRadius = project.geofence_radius_meters || 100;
    setIsInGeofence(distance <= allowedRadius);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const startTracking = async () => {
    if (!selectedProject) {
      toast({
        title: "Project Required",
        description: "Please select a project before starting time tracking",
        variant: "destructive"
      });
      return;
    }

    if (!location) {
      toast({
        title: "Location Required",
        description: "GPS location is required for time tracking",
        variant: "destructive"
      });
      return;
    }

    try {
      const entryData: Partial<TimeEntry> = {
        user_id: user?.id,
        project_id: selectedProject,
        task_id: selectedTask || null,
        cost_code_id: selectedCostCode || null,
        start_time: new Date().toISOString(),
        gps_latitude: location.latitude,
        gps_longitude: location.longitude,
        location_accuracy: location.accuracy,
        break_duration: 0,
        notes: notes || null,
        is_overtime: false,
        hourly_rate: hourlyRate || null,
        company_id: userProfile?.company_id
      };

      if (isOnline) {
        const created = await start.mutateAsync(entryData as unknown as TablesInsert<'time_entries'>);
        setCurrentEntry(created);
      } else {
        await saveOfflineData('time_entry', entryData);
        setCurrentEntry({ ...entryData, id: `offline_${Date.now()}` } as TimeEntry);
      }

      setIsTracking(true);
      setElapsedTime(0);

      toast({
        title: "Time Tracking Started",
        description: "Your time is now being tracked with GPS verification",
      });

      onTimeEntryChange?.(currentEntry);
      loadDailyEntries();
    } catch (error) {
      console.error('Error starting time tracking:', error);
      toast({
        title: "Error",
        description: "Failed to start time tracking",
        variant: "destructive"
      });
    }
  };

  const stopTracking = async () => {
    if (!currentEntry) return;

    try {
      const endTime = new Date().toISOString();
      const totalHours = elapsedTime / 3600;
      const isOvertime = totalHours > 8;

      const updateData = {
        end_time: endTime,
        total_hours: Number(totalHours.toFixed(2)),
        break_duration: currentEntry.break_duration || 0,
        is_overtime: isOvertime,
        notes: notes
      };

      if (isOnline && !currentEntry.id.startsWith('offline_')) {
        await update.mutateAsync({ id: currentEntry.id, patch: updateData });
      } else {
        await saveOfflineData('time_entry', {
          ...currentEntry,
          ...updateData
        });
      }

      setCurrentEntry(null);
      setIsTracking(false);
      setElapsedTime(0);
      setOnBreak(false);
      setBreakStartTime(null);
      setNotes('');

      toast({
        title: "Time Tracking Stopped",
        description: `Total time: ${formatDuration(elapsedTime)}${isOvertime ? ' (Overtime)' : ''}`,
      });

      onTimeEntryChange?.(null);
      loadDailyEntries();
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to stop time tracking",
        variant: "destructive"
      });
    }
  };

  const toggleBreak = async () => {
    if (onBreak) {
      if (breakStartTime && currentEntry) {
        const breakDuration = Math.floor((new Date().getTime() - breakStartTime.getTime()) / 1000 / 60);
        
        try {
          if (isOnline && !currentEntry.id.startsWith('offline_')) {
            await update.mutateAsync({
              id: currentEntry.id,
              patch: { break_duration: (currentEntry.break_duration || 0) + breakDuration },
            });
          }

          setCurrentEntry(prev => ({ 
            ...prev!, 
            break_duration: (prev!.break_duration || 0) + breakDuration 
          }));
        } catch (error) {
          console.error('Error updating break duration:', error);
        }
      }
      setOnBreak(false);
      setBreakStartTime(null);
    } else {
      setOnBreak(true);
      setBreakStartTime(new Date());
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!isTracking) return 'secondary';
    if (onBreak) return 'destructive';
    return 'default';
  };

  const getLocationStatus = () => {
    if (!location) return { text: 'No GPS', variant: 'destructive' as const };
    if (isInGeofence === null) return { text: 'GPS Available', variant: 'secondary' as const };
    if (isInGeofence === false) return { text: 'Outside Site', variant: 'destructive' as const };
    return { text: 'On Site', variant: 'default' as const };
  };

  const calculateDailyCost = () => {
    return dailyEntries.reduce((total, entry) => {
      if (entry.total_hours && entry.hourly_rate) {
        const cost = entry.total_hours * entry.hourly_rate;
        return total + (entry.is_overtime ? cost * 1.5 : cost);
      }
      return total;
    }, 0);
  };

  const calculateDailyHours = () => {
    return dailyEntries.reduce((total, entry) => total + (entry.total_hours || 0), 0);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {isOnline ? "Online" : "Offline"}
        </Badge>
        
        <Badge variant={getLocationStatus().variant} className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {getLocationStatus().text}
        </Badge>
      </div>

      <Tabs defaultValue="tracker" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracker">Time Clock</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="daily">Daily Log</TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="space-y-4">
          {/* Time Display */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono mb-2">
                  {formatDuration(elapsedTime)}
                </div>
                <Badge variant={getStatusColor()} className="text-sm">
                  {!isTracking ? 'Not Tracking' : onBreak ? 'On Break' : 'Active'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Project Selection */}
          {!isTracking && (
            <Card className="glass rounded-2xl shadow-ios-2 border-transparent">
              <CardHeader>
                <CardTitle className="text-lg tracking-tight">Time Entry Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {optionsError && (
                  <p role="alert" className="text-sm text-destructive">
                    Projects and cost codes could not be loaded, so you cannot start a timer yet.{' '}
                    <button type="button" className="underline" onClick={() => { void refetchOptions(); }}>Try again</button>
                  </p>
                )}
                <MobileSelectField
                  label="Project"
                  required
                  placeholder="Select project…"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  options={projects.map((p) => ({
                    value: p.id,
                    label: `${p.name} - ${p.client_name}`,
                  }))}
                />

                {selectedProject && (
                  <>
                    <MobileSelectField
                      label="Task (Optional)"
                      placeholder="Select task…"
                      value={selectedTask}
                      onChange={(e) => setSelectedTask(e.target.value)}
                      options={tasks.map((t) => ({ value: t.id, label: t.name }))}
                    />

                    <MobileSelectField
                      label="Cost Code (Optional)"
                      placeholder="Select cost code…"
                      value={selectedCostCode}
                      onChange={(e) => setSelectedCostCode(e.target.value)}
                      options={costCodes.map((c) => ({
                        value: c.id,
                        label: `${c.code} - ${c.name}`,
                      }))}
                    />

                    <MobileTextField
                      label="Hourly Rate"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) =>
                        setHourlyRate(Number(e.target.value))
                      }
                      placeholder="0.00"
                    />

                    <MobileTextArea
                      label="Notes (Optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about your work…"
                      rows={3}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Project Info */}
          {isTracking && currentEntry && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {projects.find(p => p.id === selectedProject)?.name || 'Unknown Project'}
                  </p>
                  {selectedTask && (
                    <p className="text-sm text-muted-foreground">
                      Task: {tasks.find(t => t.id === selectedTask)?.name}
                    </p>
                  )}
                  {selectedCostCode && (
                    <p className="text-sm text-muted-foreground">
                      Cost Code: {costCodes.find(c => c.id === selectedCostCode)?.code}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Started: {new Date(currentEntry.start_time).toLocaleTimeString()}
                  </p>
                  {currentEntry.break_duration > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Break time: {currentEntry.break_duration} minutes
                    </p>
                  )}
                  {hourlyRate > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span>Rate: ${hourlyRate}/hr</span>
                      <span>•</span>
                      <span>Earned: ${((elapsedTime / 3600) * hourlyRate).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Control Buttons */}
          <div className="space-y-3">
            {!isTracking ? (
              <Button
                onClick={startTracking}
                disabled={!selectedProject || !location}
                className="w-full"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Time Tracking
              </Button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={toggleBreak}
                    variant={onBreak ? "default" : "outline"}
                    size="lg"
                  >
                    {onBreak ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                    {onBreak ? 'End Break' : 'Take Break'}
                  </Button>
                  
                  <Button
                    onClick={stopTracking}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop Tracking
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* GPS Warning */}
          {isTracking && isInGeofence === false && (
            <Card className="rounded-2xl glass shadow-ios-1 border-yellow-200/60 dark:border-yellow-500/30 bg-yellow-50/80 dark:bg-yellow-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    You appear to be outside the job site geofence. Time tracking continues but may require verification.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="crew" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Crew Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectError ? (
                <p role="alert" className="text-sm text-destructive text-center py-4">
                  Crew and today's entries could not be loaded.{' '}
                  <button type="button" className="underline" onClick={loadDailyEntries}>Try again</button>
                </p>
              ) : crewMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No crew members assigned to this project
                </p>
              ) : (
                <div className="space-y-3">
                  {crewMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${member.is_present ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${member.hourly_rate}/hr</p>
                        <Badge variant={member.is_present ? "default" : "secondary"} className="text-xs">
                          {member.is_present ? "Present" : "Not Present"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          {/* Daily Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">{calculateDailyHours().toFixed(1)}h</div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">${calculateDailyCost().toFixed(0)}</div>
                  <p className="text-sm text-muted-foreground">Labor Cost</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Today's Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectError ? (
                <p role="alert" className="text-sm text-destructive text-center py-4">
                  Today's entries could not be loaded.{' '}
                  <button type="button" className="underline" onClick={loadDailyEntries}>Try again</button>
                </p>
              ) : dailyEntries.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No time entries for today
                </p>
              ) : (
                <div className="space-y-3">
                  {dailyEntries.map((entry) => (
                    <div key={entry.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                  <p className="font-medium">
                    {entry.user_profiles ? `${entry.user_profiles.first_name} ${entry.user_profiles.last_name}` : 'Unknown User'}
                  </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(entry.start_time).toLocaleTimeString()} - 
                            {entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'Active'}
                          </p>
                          {entry.tasks && (
                            <p className="text-sm text-muted-foreground">Task: {entry.tasks.name}</p>
                          )}
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground italic">"{entry.notes}"</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {entry.total_hours ? `${entry.total_hours.toFixed(1)}h` : 'Active'}
                          </p>
                          {entry.is_overtime && (
                            <Badge variant="secondary" className="text-xs">OT</Badge>
                          )}
                          {entry.hourly_rate && entry.total_hours && (
                            <p className="text-sm text-muted-foreground">
                              ${(entry.total_hours * entry.hourly_rate * (entry.is_overtime ? 1.5 : 1)).toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileTimeTracker;