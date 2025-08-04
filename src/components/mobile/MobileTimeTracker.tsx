import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, 
  Play,
  Pause,
  Square,
  MapPin,
  Wifi,
  WifiOff,
  Users,
  UserCheck,
  Timer,
  CheckCircle,
  AlertTriangle,
  CalendarDays,
  DollarSign,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { Geolocation } from '@capacitor/geolocation';

interface MobileTimeTrackerProps {
  projectId?: string;
  onTimeEntryChange?: (entry: any) => void;
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

interface CrewMember {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  is_present: boolean;
  time_entry?: TimeEntry;
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
  const [location, setLocation] = useState<any>(null);
  const [isInGeofence, setIsInGeofence] = useState<boolean | null>(null);
  
  // Project & task state
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [costCodes, setCostCodes] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedCostCode, setSelectedCostCode] = useState('');
  
  // Crew management state
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [dailyEntries, setDailyEntries] = useState<TimeEntry[]>([]);
  
  // Form state
  const [notes, setNotes] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(0);

  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();

  useEffect(() => {
    loadInitialData();
    getCurrentLocation();
    checkActiveEntry();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectTasks();
      loadCrewMembers();
      loadDailyEntries();
    }
  }, [selectedProject]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && !onBreak) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, onBreak]);

  const loadInitialData = async () => {
    try {
      if (!userProfile?.company_id) return;

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, client_name, site_address, site_latitude, site_longitude, geofence_radius_meters')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'active');

      // Load cost codes
      const { data: costCodesData } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true);

      setProjects(projectsData || []);
      setCostCodes(costCodesData || []);

      // Set default hourly rate
      setHourlyRate(25); // Default hourly rate
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadProjectTasks = async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, name, status')
        .eq('project_id', selectedProject)
        .eq('status', 'active');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadCrewMembers = async () => {
    if (!selectedProject || !userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          crew_assignments!inner(project_id)
        `)
        .eq('company_id', userProfile.company_id)
        .eq('crew_assignments.project_id', selectedProject)
        .eq('is_active', true);

      if (error) throw error;

      const members: CrewMember[] = (data || []).map(member => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        role: member.role,
        hourly_rate: 25, // Default hourly rate
        is_present: false
      }));

      setCrewMembers(members);
    } catch (error) {
      console.error('Error loading crew members:', error);
    }
  };

  const loadDailyEntries = async () => {
    if (!selectedProject) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user_profiles(first_name, last_name),
          tasks(name),
          cost_codes(code, name)
        `)
        .eq('project_id', selectedProject)
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setDailyEntries((data || []) as any as TimeEntry[]);
    } catch (error) {
      console.error('Error loading daily entries:', error);
    }
  };

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

  const checkActiveEntry = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', `${today}T00:00:00`)
        .is('end_time', null)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentEntry(data as any as TimeEntry);
        setIsTracking(true);
        setSelectedProject(data.project_id);
        setSelectedTask(data.task_id || '');
        setSelectedCostCode(data.cost_code_id || '');
        setNotes((data as any).notes || '');
        
        const startTime = new Date(data.start_time);
        const now = new Date();
        setElapsedTime(Math.floor((now.getTime() - startTime.getTime()) / 1000));
      }
    } catch (error) {
      console.error('Error checking active entry:', error);
    }
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
        const { data, error } = await supabase
          .from('time_entries')
          .insert(entryData as any)
          .select()
          .single();

        if (error) throw error;
        setCurrentEntry(data as any as TimeEntry);
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
        const { error } = await supabase
          .from('time_entries')
          .update(updateData)
          .eq('id', currentEntry.id);

        if (error) throw error;
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
        description: "Failed to stop time tracking",
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
            const { error } = await supabase
              .from('time_entries')
              .update({
                break_duration: (currentEntry.break_duration || 0) + breakDuration
              })
              .eq('id', currentEntry.id);

            if (error) throw error;
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Entry Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} - {project.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProject && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="task">Task (Optional)</Label>
                      <Select value={selectedTask} onValueChange={setSelectedTask}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="costCode">Cost Code (Optional)</Label>
                      <Select value={selectedCostCode} onValueChange={setSelectedCostCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cost code..." />
                        </SelectTrigger>
                        <SelectContent>
                          {costCodes.map((code) => (
                            <SelectItem key={code.id} value={code.id}>
                              {code.code} - {code.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about your work..."
                        rows={3}
                      />
                    </div>
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
            <Card className="border-yellow-200 bg-yellow-50">
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
              {crewMembers.length === 0 ? (
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
              {dailyEntries.length === 0 ? (
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