import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingBoundary';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  User,
  AlertTriangle,
  CheckCircle,
  Activity,
  MapIcon,
  Zap
} from 'lucide-react';

interface GPSLocation {
  id: string;
  user_id: string;
  user_name?: string;
  project_id?: string;
  project_name?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  activity_type: 'clock_in' | 'clock_out' | 'break' | 'location_update';
  is_active: boolean;
}

interface GPSSettings {
  tracking_enabled: boolean;
  update_interval: number;
  geofence_radius: number;
  accuracy_threshold: number;
}

interface GPSTrackingProps {
  companyId?: string;
  projectId?: string;
}

export const GPSTrackingSystem: React.FC<GPSTrackingProps> = ({ 
  companyId, 
  projectId 
}) => {
  const [locations, setLocations] = useState<GPSLocation[]>([]);
  const [settings, setSettings] = useState<GPSSettings>({
    tracking_enabled: false,
    update_interval: 300, // 5 minutes
    geofence_radius: 100, // meters
    accuracy_threshold: 50 // meters
  });
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadGPSData();
    loadSettings();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [companyId, projectId]);

  const loadGPSData = async () => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      let query = supabase
        .from('gps_locations')
        .select(`
          *,
          profiles:user_id (display_name),
          projects:project_id (name)
        `)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedLocations = data?.map(location => ({
        ...location,
        user_name: location.profiles?.display_name,
        project_name: location.projects?.name
      })) || [];

      setLocations(transformedLocations);
    } catch (error) {
      console.error('Error loading GPS data:', error);
      toast({
        title: "Error",
        description: "Failed to load GPS tracking data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      const { data, error } = await supabase
        .from('company_settings')
        .select('gps_settings')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.gps_settings) {
        setSettings(data.gps_settings);
      }
    } catch (error) {
      console.error('Error loading GPS settings:', error);
    }
  };

  const saveSettings = async (newSettings: GPSSettings) => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      const { error } = await supabase
        .from('company_settings')
        .upsert({
          company_id: companyId,
          gps_settings: newSettings
        });

      if (error) throw error;

      setSettings(newSettings);
      toast({
        title: "Success",
        description: "GPS settings updated successfully"
      });
    } catch (error) {
      console.error('Error saving GPS settings:', error);
      toast({
        title: "Error",
        description: "Failed to save GPS settings",
        variant: "destructive"
      });
    }
  };

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const startTracking = async () => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      // Request permission and get current location
      const position = await getCurrentLocation();
      setCurrentLocation(position);

      // Log initial location
      await logLocation(position, 'clock_in');

      // Start watching position
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          setCurrentLocation(position);
          await logLocation(position, 'location_update');
        },
        (error) => {
          console.error('GPS tracking error:', error);
          toast({
            title: "GPS Error",
            description: "Failed to get location updates",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: settings.update_interval * 1000
        }
      );

      setWatchId(id);
      setTrackingActive(true);

      toast({
        title: "Tracking Started",
        description: "GPS location tracking is now active"
      });

    } catch (error) {
      console.error('Error starting GPS tracking:', error);
      toast({
        title: "Error",
        description: "Failed to start GPS tracking. Please enable location services.",
        variant: "destructive"
      });
    }
  };

  const stopTracking = async () => {
    try {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      if (currentLocation) {
        await logLocation(currentLocation, 'clock_out');
      }

      setTrackingActive(false);
      setCurrentLocation(null);

      toast({
        title: "Tracking Stopped",
        description: "GPS location tracking has been disabled"
      });

    } catch (error) {
      console.error('Error stopping GPS tracking:', error);
    }
  };

  const logLocation = async (position: GeolocationPosition, activityType: GPSLocation['activity_type']) => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      // Check accuracy threshold
      if (position.coords.accuracy > settings.accuracy_threshold) {
        console.warn('Location accuracy too low:', position.coords.accuracy);
        return;
      }

      const { error } = await supabase
        .from('gps_locations')
        .insert({
          user_id: userProfile.user.id,
          company_id: companyId,
          project_id: projectId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          activity_type: activityType,
          is_active: activityType !== 'clock_out'
        });

      if (error) throw error;

      // Refresh locations list
      loadGPSData();

    } catch (error) {
      console.error('Error logging GPS location:', error);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'clock_in':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'clock_out':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'break':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'clock_in':
        return 'bg-success/10 text-success border-success/20';
      case 'clock_out':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'break':
        return 'bg-muted/10 text-muted-foreground border-muted/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c;
    return distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`;
  };

  if (loading) {
    return <LoadingSpinner message="Loading GPS tracking data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              GPS Tracking Status
            </CardTitle>
            <Badge variant={trackingActive ? "default" : "secondary"}>
              {trackingActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="tracking-toggle">Enable GPS Tracking</Label>
                <Switch
                  id="tracking-toggle"
                  checked={trackingActive}
                  onCheckedChange={trackingActive ? stopTracking : startTracking}
                />
              </div>
              
              {currentLocation && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Current Location:</p>
                  <p className="text-sm text-muted-foreground">
                    Lat: {currentLocation.coords.latitude.toFixed(6)}, 
                    Lng: {currentLocation.coords.longitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Accuracy: {currentLocation.coords.accuracy.toFixed(0)}m
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Update Interval</Label>
                <Select
                  value={settings.update_interval.toString()}
                  onValueChange={(value) => {
                    const newSettings = { ...settings, update_interval: parseInt(value) };
                    saveSettings(newSettings);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="1800">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Accuracy Threshold</Label>
                <Select
                  value={settings.accuracy_threshold.toString()}
                  onValueChange={(value) => {
                    const newSettings = { ...settings, accuracy_threshold: parseInt(value) };
                    saveSettings(newSettings);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 meters (High)</SelectItem>
                    <SelectItem value="50">50 meters (Medium)</SelectItem>
                    <SelectItem value="100">100 meters (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {locations.length === 0 ? (
              <div className="text-center py-8">
                <MapIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No location data available</p>
              </div>
            ) : (
              locations.map((location, index) => (
                <Card key={location.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{location.user_name || 'Unknown User'}</span>
                        <Badge className={getActivityColor(location.activity_type)}>
                          {getActivityIcon(location.activity_type)}
                          <span className="ml-1 capitalize">{location.activity_type.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                        <p>
                          <Zap className="h-3 w-3 inline mr-1" />
                          Accuracy: {location.accuracy.toFixed(0)}m
                        </p>
                        {location.project_name && (
                          <p>Project: {location.project_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <p>{new Date(location.timestamp).toLocaleDateString()}</p>
                      <p>{new Date(location.timestamp).toLocaleTimeString()}</p>
                      {index > 0 && (
                        <p className="mt-1">
                          {formatDistance(
                            locations[index - 1].latitude,
                            locations[index - 1].longitude,
                            location.latitude,
                            location.longitude
                          )} from last
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};