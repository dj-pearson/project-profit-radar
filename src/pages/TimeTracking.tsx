import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Clock, 
  Play,
  Pause,
  Square,
  MapPin,
  Calendar,
  Timer,
  Coffee,
  Building2
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name: string;
  site_address: string;
  site_latitude?: number;
  site_longitude?: number;
  geofence_radius_meters?: number;
}

interface Task {
  id: string;
  name: string;
  project_id: string;
}

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  total_hours: number | null;
  break_duration: number;
  description: string;
  location: string;
  project_id: string;
  task_id: string | null;
  cost_code_id: string | null;
  projects: { name: string; client_name: string };
  tasks: { name: string } | null;
  cost_codes: { code: string; name: string } | null;
}

const TimeTracking = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Current tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  
  // Entry form state
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedCostCode, setSelectedCostCode] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  
  // GPS tracking state
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isInGeofence, setIsInGeofence] = useState<boolean | null>(null);
  
  // Manual entry dialog
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('17:00');
  const [manualBreakDuration, setManualBreakDuration] = useState('30');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (userProfile?.company_id) {
      loadData();
      getCurrentLocation();
    }
  }, [user, userProfile, loading, navigate]);

  // Effect to handle project selection and geofence checking
  useEffect(() => {
    if (selectedProject && currentPosition) {
      checkGeofence(currentPosition);
    }
  }, [selectedProject, currentPosition]);

  // Effect to start location watching when component mounts
  useEffect(() => {
    getCurrentLocation();
    return () => {
      stopLocationWatching();
    };
  }, [user, userProfile, loading, navigate]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && !onBreak) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, onBreak]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name, site_address, site_latitude, site_longitude, geofence_radius_meters')
        .eq('company_id', userProfile?.company_id)
        .eq('status', 'active');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load cost codes
      const { data: costCodesData, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('id, code, name, category')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true);

      if (costCodesError) throw costCodesError;
      setCostCodes(costCodesData || []);

      // Load today's time entries
      const today = new Date().toISOString().split('T')[0];
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          *,
          projects(name, client_name),
          tasks(name),
          cost_codes(code, name)
        `)
        .eq('user_id', user?.id)
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: false });

      if (entriesError) throw entriesError;
      setTimeEntries(entriesData || []);

      // Check if there's an active entry
      const activeEntry = entriesData?.find(entry => !entry.end_time);
      if (activeEntry) {
        setCurrentEntry(activeEntry);
        setIsTracking(true);
        const startTime = new Date(activeEntry.start_time);
        const now = new Date();
        setElapsedTime(Math.floor((now.getTime() - startTime.getTime()) / 1000));
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load time tracking data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCurrentPosition(coords);
          setLocation(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
          setLocationError(null);
        },
        (error) => {
          console.warn('Could not get location:', error);
          setLocationError(error.message);
          setLocation('Location unavailable');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  };

  const startLocationWatching = () => {
    if (navigator.geolocation && !watchId) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCurrentPosition(coords);
          setLocation(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
          setLocationError(null);
          
          // Check geofence if project is selected
          if (selectedProject) {
            checkGeofence(coords);
          }
        },
        (error) => {
          console.warn('Location watch error:', error);
          setLocationError(error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000 // 1 minute
        }
      );
      setWatchId(id);
    }
  };

  const stopLocationWatching = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // Calculate distance between two GPS points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const checkGeofence = (coords: { lat: number; lng: number }) => {
    const project = projects.find(p => p.id === selectedProject);
    if (!project || !project.site_latitude || !project.site_longitude) {
      setIsInGeofence(null);
      return;
    }

    const distance = calculateDistance(
      coords.lat,
      coords.lng,
      project.site_latitude,
      project.site_longitude
    );

    const allowedRadius = project.geofence_radius_meters || 100;
    setIsInGeofence(distance <= allowedRadius);
  };

  const loadTasksForProject = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, name, project_id')
        .eq('project_id', projectId)
        .in('status', ['pending', 'in_progress']);

      if (error) throw error;
      setTasks(data || []);
      
      // Check geofence when project changes
      if (currentPosition) {
        checkGeofence(currentPosition);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const startTracking = async () => {
    if (!selectedProject) {
      toast({
        variant: "destructive",
        title: "Project Required",
        description: "Please select a project before starting time tracking."
      });
      return;
    }

    // Check if GPS is available and location is known
    if (!currentPosition) {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Please wait for GPS location to be detected before starting."
      });
      return;
    }

    // Check geofence if project has GPS coordinates set
    const project = projects.find(p => p.id === selectedProject);
    if (project?.site_latitude && project?.site_longitude && isInGeofence === false) {
      toast({
        variant: "destructive",
        title: "Location Verification Failed",
        description: `You must be within ${project.geofence_radius_meters || 100}m of the job site to start time tracking.`
      });
      return;
    }

    try {
      const startTime = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          user_id: user?.id,
          project_id: selectedProject,
          task_id: selectedTask || null,
          cost_code_id: selectedCostCode || null,
          start_time: startTime,
          description: description || null,
          location: location || null,
          gps_latitude: currentPosition.lat,
          gps_longitude: currentPosition.lng,
          location_accuracy: currentPosition.accuracy,
          break_duration: 0
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setIsTracking(true);
      setElapsedTime(0);
      startLocationWatching(); // Start continuous location tracking
      
      toast({
        title: "Time Tracking Started",
        description: "Your time is now being tracked with GPS verification."
      });

      loadData();
    } catch (error: any) {
      console.error('Error starting time tracking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start time tracking"
      });
    }
  };

  const stopTracking = async () => {
    if (!currentEntry) return;

    try {
      const endTime = new Date().toISOString();
      const totalSeconds = elapsedTime;
      const totalHours = totalSeconds / 3600;

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime,
          total_hours: totalHours,
          break_duration: currentEntry.break_duration
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      setIsTracking(false);
      setElapsedTime(0);
      setOnBreak(false);
      setBreakStartTime(null);
      stopLocationWatching(); // Stop continuous location tracking
      
      toast({
        title: "Time Tracking Stopped",
        description: `Total time: ${formatDuration(totalSeconds)}`
      });

      loadData();
    } catch (error: any) {
      console.error('Error stopping time tracking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to stop time tracking"
      });
    }
  };

  const toggleBreak = async () => {
    if (onBreak) {
      // End break
      if (breakStartTime && currentEntry) {
        const breakDuration = Math.floor((new Date().getTime() - breakStartTime.getTime()) / 1000 / 60);
        
        const { error } = await supabase
          .from('time_entries')
          .update({
            break_duration: (currentEntry.break_duration || 0) + breakDuration
          })
          .eq('id', currentEntry.id);

        if (error) {
          console.error('Error updating break duration:', error);
        } else {
          setCurrentEntry(prev => ({ ...prev, break_duration: (prev.break_duration || 0) + breakDuration }));
        }
      }
      setOnBreak(false);
      setBreakStartTime(null);
    } else {
      // Start break
      setOnBreak(true);
      setBreakStartTime(new Date());
    }
  };

  const addManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject || !manualStartTime || !manualEndTime) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const startDateTime = new Date(`${manualDate}T${manualStartTime}`);
      const endDateTime = new Date(`${manualDate}T${manualEndTime}`);
      const totalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('time_entries')
        .insert([{
          user_id: user?.id,
          project_id: selectedProject,
          task_id: selectedTask || null,
          cost_code_id: selectedCostCode || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          total_hours: totalHours,
          description: description || null,
          location: location || null,
          break_duration: parseInt(manualBreakDuration) || 0
        }]);

      if (error) throw error;

      toast({
        title: "Manual Entry Added",
        description: `Added ${totalHours.toFixed(2)} hours for ${manualDate}`
      });

      setIsManualEntryOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error adding manual entry:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add manual time entry"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Separator orientation="vertical" className="h-4 sm:h-6" />
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">Time Tracking</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">Track your work hours and activities</p>
              </div>
            </div>
            <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Manual Time Entry</DialogTitle>
                  <DialogDescription>
                    Add a time entry for work done offline or missed tracking
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addManualEntry} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Break Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={manualBreakDuration}
                        onChange={(e) => setManualBreakDuration(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={manualStartTime}
                        onChange={(e) => setManualStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={manualEndTime}
                        onChange={(e) => setManualEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
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
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What did you work on?"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsManualEntryOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Entry</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Active Timer */}
        <Card className={`border-2 ${isTracking ? 'border-construction-blue' : 'border-border'}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Timer className="h-5 w-5 mr-2" />
                {isTracking ? 'Active Timer' : 'Start New Timer'}
              </span>
              {isTracking && (
                <div className="flex items-center space-x-2">
                  <Badge variant={onBreak ? "secondary" : "default"}>
                    {onBreak ? "On Break" : "Working"}
                  </Badge>
                  <div className="text-2xl font-mono">
                    {formatDuration(elapsedTime)}
                  </div>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isTracking ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select 
                      value={selectedProject} 
                      onValueChange={(value) => {
                        setSelectedProject(value);
                        loadTasksForProject(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
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
                  <div className="space-y-2">
                    <Label>Task</Label>
                    <Select value={selectedTask} onValueChange={setSelectedTask}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task (optional)" />
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Code</Label>
                    <Select value={selectedCostCode} onValueChange={setSelectedCostCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost code (optional)" />
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
                    <Label>Location</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Work location"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={getCurrentLocation}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* GPS Status Indicators */}
                    <div className="space-y-1">
                      {currentPosition && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1 text-green-500" />
                          GPS Active (±{currentPosition.accuracy.toFixed(0)}m)
                        </div>
                      )}
                      {locationError && (
                        <div className="flex items-center text-xs text-destructive">
                          <MapPin className="h-3 w-3 mr-1" />
                          GPS Error: {locationError}
                        </div>
                      )}
                      {selectedProject && isInGeofence !== null && (
                        <div className={`flex items-center text-xs ${isInGeofence ? 'text-green-600' : 'text-red-600'}`}>
                          <Building2 className="h-3 w-3 mr-1" />
                          {isInGeofence ? 'Within job site boundary' : `Outside job site boundary (${projects.find(p => p.id === selectedProject)?.geofence_radius_meters || 100}m required)`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What are you working on?"
                    rows={2}
                  />
                </div>
                
                <Button 
                  onClick={startTracking} 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedProject || !currentPosition || (isInGeofence === false)}
                >
                  <Play className="h-5 w-5 mr-2" />
                  {!currentPosition ? 'Waiting for GPS...' : 
                   isInGeofence === false ? 'Move closer to job site' : 
                   'Start Tracking'}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Currently tracking</p>
                  <h3 className="font-medium text-lg">
                    {projects.find(p => p.id === currentEntry?.project_id)?.name}
                  </h3>
                  {currentEntry?.description && (
                    <p className="text-sm text-muted-foreground">{currentEntry.description}</p>
                  )}
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={toggleBreak}
                    variant={onBreak ? "default" : "outline"}
                    size="lg"
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    {onBreak ? 'End Break' : 'Take Break'}
                  </Button>
                  <Button
                    onClick={stopTracking}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Stop Tracking
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Today's Time Entries
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No time entries for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{entry.projects?.name}</h4>
                        {!entry.end_time && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {entry.projects?.client_name}
                      </p>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground mb-2">{entry.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>
                          {new Date(entry.start_time).toLocaleTimeString()} - 
                          {entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress'}
                        </span>
                        {entry.break_duration > 0 && (
                          <span>Break: {entry.break_duration}min</span>
                        )}
                        {entry.location && (
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            GPS Location
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {entry.total_hours ? `${entry.total_hours.toFixed(2)}h` : formatDuration(elapsedTime)}
                      </div>
                      {entry.cost_codes && (
                        <div className="text-xs text-muted-foreground">
                          {entry.cost_codes.code}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Hours Today:</span>
                    <span>
                      {timeEntries
                        .filter(entry => entry.total_hours)
                        .reduce((sum, entry) => sum + (entry.total_hours || 0), 0)
                        .toFixed(2)}h
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TimeTracking;