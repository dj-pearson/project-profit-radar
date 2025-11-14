import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Play,
  Pause,
  Square,
  MapPin,
  Wifi,
  WifiOff,
  Timer,
  CheckCircle,
  AlertTriangle,
  Navigation
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { Geolocation } from '@capacitor/geolocation';
import { useGeofencing } from '@/hooks/useGeofencing';

interface MobileTimeClockProps {
  projectId?: string;
  onTimeEntryChange?: (entry: any) => void;
}

const MobileTimeClock: React.FC<MobileTimeClockProps> = ({
  projectId,
  onTimeEntryChange
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [isInGeofence, setIsInGeofence] = useState<boolean | null>(null);

  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();

  // Enhanced geofencing with browser-based GPS
  const {
    currentLocation: browserLocation,
    isTracking: isGpsTracking,
    permissionStatus,
    addGeofence,
    removeGeofence,
    isInsideGeofence: checkInsideGeofence,
    getDistanceFromGeofence,
    formatDistance,
    startTracking: startGpsTracking,
    stopTracking: stopGpsTracking
  } = useGeofencing({ autoStart: false });

  useEffect(() => {
    loadProjects();
    getCurrentLocation();
    checkActiveEntry();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isTracking && !onBreak) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [isTracking, onBreak]);

  // Add geofence monitoring when project is selected
  useEffect(() => {
    if (!selectedProject) return;

    const project = projects.find(p => p.id === selectedProject);
    if (!project || !project.site_latitude || !project.site_longitude) return;

    // Start GPS tracking
    startGpsTracking();

    // Add geofence for the selected project
    addGeofence({
      id: project.id,
      name: project.name,
      centerLatitude: project.site_latitude,
      centerLongitude: project.site_longitude,
      radiusMeters: project.geofence_radius_meters || 100,
      type: 'project'
    });

    return () => {
      removeGeofence(project.id);
      stopGpsTracking();
    };
  }, [selectedProject, projects]);

  // Update geofence status when browser location changes
  useEffect(() => {
    if (!browserLocation || !selectedProject) return;

    const isInside = checkInsideGeofence(selectedProject);
    setIsInGeofence(isInside);
  }, [browserLocation, selectedProject]);

  const loadProjects = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name, site_address, site_latitude, site_longitude, geofence_radius_meters')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'active');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
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
        setCurrentEntry(data);
        setIsTracking(true);
        setSelectedProject(data.project_id);
        const startTime = new Date(data.start_time);
        const now = new Date();
        setElapsedTime(Math.floor((now.getTime() - startTime.getTime()) / 1000));
      }
    } catch (error) {
      console.error('Error checking active entry:', error);
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

    // Check geofence
    const project = projects.find(p => p.id === selectedProject);
    if (project?.site_latitude && project?.site_longitude && isInGeofence === false) {
      toast({
        title: "Location Verification Failed",
        description: `You must be within ${project.geofence_radius_meters || 100}m of the job site`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Use browser location if available, otherwise fall back to Capacitor
      const currentLoc = browserLocation || location;
      const distance = selectedProject ? getDistanceFromGeofence(selectedProject) : null;

      const entryData = {
        user_id: user?.id,
        project_id: selectedProject,
        start_time: new Date().toISOString(),
        gps_latitude: currentLoc.latitude,
        gps_longitude: currentLoc.longitude,
        location_accuracy: currentLoc.accuracy,
        break_duration: 0,
        company_id: userProfile?.company_id,
        // Enhanced geofence verification fields
        is_geofence_verified: isInGeofence === true,
        geofence_distance_meters: distance,
        geofence_breach_detected: isInGeofence === false
      };

      if (isOnline) {
        const { data, error } = await supabase
          .from('time_entries')
          .insert(entryData)
          .select()
          .single();

        if (error) throw error;
        setCurrentEntry(data);
      } else {
        // Save offline
        await saveOfflineData('time_entry', entryData);
        setCurrentEntry({ ...entryData, id: `offline_${Date.now()}` });
      }

      setIsTracking(true);
      setElapsedTime(0);

      toast({
        title: "Time Tracking Started",
        description: "Your time is now being tracked with GPS verification",
      });

      onTimeEntryChange?.(currentEntry);
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

      const updateData = {
        end_time: endTime,
        total_hours: totalHours,
        break_duration: currentEntry.break_duration || 0
      };

      if (isOnline && !currentEntry.id.startsWith('offline_')) {
        const { error } = await supabase
          .from('time_entries')
          .update(updateData)
          .eq('id', currentEntry.id);

        if (error) throw error;
      } else {
        // Update offline entry
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

      toast({
        title: "Time Tracking Stopped",
        description: `Total time: ${formatDuration(elapsedTime)}`,
      });

      onTimeEntryChange?.(null);
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
      // End break
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
            ...prev, 
            break_duration: (prev.break_duration || 0) + breakDuration 
          }));
        } catch (error) {
          console.error('Error updating break duration:', error);
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
    if (!location && !browserLocation) {
      return { text: 'No GPS', variant: 'destructive' as const, distance: null };
    }

    if (permissionStatus === 'denied') {
      return { text: 'GPS Denied', variant: 'destructive' as const, distance: null };
    }

    if (isInGeofence === null) {
      return { text: 'GPS Available', variant: 'secondary' as const, distance: null };
    }

    // Get distance from geofence if available
    const distance = selectedProject ? getDistanceFromGeofence(selectedProject) : null;

    if (isInGeofence === false) {
      const distanceText = distance ? ` (${formatDistance(distance)} away)` : '';
      return {
        text: `Outside Site${distanceText}`,
        variant: 'destructive' as const,
        distance
      };
    }

    const distanceText = distance ? ` (${formatDistance(distance)} from center)` : '';
    return {
      text: `On Site${distanceText}`,
      variant: 'default' as const,
      distance
    };
  };

  return (
    <div className="space-y-4 p-4">
      {/* Status Bar */}
      <div className="space-y-2">
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

        {/* GPS Accuracy Indicator */}
        {(browserLocation || location) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Navigation className="h-3 w-3" />
            <span>
              Accuracy: {browserLocation?.accuracy ? `±${Math.round(browserLocation.accuracy)}m` : location?.accuracy ? `±${Math.round(location.accuracy)}m` : 'Unknown'}
            </span>
            {permissionStatus === 'granted' && isGpsTracking && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
          </div>
        )}
      </div>

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
            <CardTitle className="text-lg">Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Choose a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.client_name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Current Project Info */}
      {isTracking && currentEntry && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">
                {projects.find(p => p.id === selectedProject)?.name || 'Unknown Project'}
              </p>
              <p className="text-sm text-muted-foreground">
                Started: {new Date(currentEntry.start_time).toLocaleTimeString()}
              </p>
              {currentEntry.break_duration > 0 && (
                <p className="text-sm text-muted-foreground">
                  Break time: {currentEntry.break_duration} minutes
                </p>
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
    </div>
  );
};

export default MobileTimeClock;