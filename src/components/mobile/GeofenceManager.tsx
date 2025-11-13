import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MapPin,
  Plus,
  Trash2,
  Edit,
  Navigation,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useGeofencing, type GeofenceRegion } from '@/hooks/useGeofencing';
import { toast } from '@/hooks/use-toast';

export const GeofenceManager = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<GeofenceRegion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
  });

  const {
    isSupported,
    isEnabled,
    permissionGranted,
    regions,
    currentLocation,
    requestPermissions,
    getCurrentLocation,
    addRegion,
    removeRegion,
    updateRegion,
    startMonitoring,
    stopMonitoring,
    getActiveRegions,
  } = useGeofencing();

  const [activeRegions, setActiveRegions] = useState<GeofenceRegion[]>([]);

  useEffect(() => {
    if (isEnabled) {
      checkActiveRegions();
    }
  }, [currentLocation, isEnabled]);

  const checkActiveRegions = async () => {
    const active = await getActiveRegions();
    setActiveRegions(active);
  };

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (granted) {
      toast({
        title: 'Permissions Granted',
        description: 'You can now use geofencing features',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Permissions Denied',
        description: 'Please enable location permissions in your device settings',
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    const position = await getCurrentLocation();
    if (position) {
      setFormData({
        ...formData,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      });
      toast({
        title: 'Location Updated',
        description: 'Using your current location',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Location Error',
        description: 'Could not get your current location',
      });
    }
  };

  const handleSaveRegion = async () => {
    const { name, latitude, longitude, radius } = formData;

    // Validation
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a name for this location',
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Latitude must be between -90 and 90',
      });
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Longitude must be between -180 and 180',
      });
      return;
    }

    if (isNaN(rad) || rad < 10 || rad > 10000) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Radius must be between 10 and 10000 meters',
      });
      return;
    }

    try {
      if (editingRegion) {
        // Update existing region
        await updateRegion(editingRegion.id, {
          name,
          latitude: lat,
          longitude: lng,
          radius: rad,
        });
        toast({
          title: 'Region Updated',
          description: `Updated geofence for ${name}`,
        });
      } else {
        // Add new region
        await addRegion({
          name,
          latitude: lat,
          longitude: lng,
          radius: rad,
        });
        toast({
          title: 'Region Added',
          description: `Created geofence for ${name}`,
        });
      }

      // Reset form and close dialog
      setFormData({ name: '', latitude: '', longitude: '', radius: '100' });
      setEditingRegion(null);
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save geofence region',
      });
    }
  };

  const handleEditRegion = (region: GeofenceRegion) => {
    setEditingRegion(region);
    setFormData({
      name: region.name,
      latitude: region.latitude.toString(),
      longitude: region.longitude.toString(),
      radius: region.radius.toString(),
    });
    setDialogOpen(true);
  };

  const handleDeleteRegion = async (regionId: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;

    try {
      await removeRegion(regionId);
      toast({
        title: 'Region Deleted',
        description: 'Geofence has been removed',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete geofence region',
      });
    }
  };

  const handleToggleRegion = async (region: GeofenceRegion) => {
    try {
      await updateRegion(region.id, { active: !region.active });
      toast({
        title: region.active ? 'Region Deactivated' : 'Region Activated',
        description: `${region.name} has been ${region.active ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to toggle geofence region',
      });
    }
  };

  const handleToggleMonitoring = async (enabled: boolean) => {
    if (enabled) {
      const success = await startMonitoring();
      if (success) {
        toast({
          title: 'Monitoring Started',
          description: 'Automatic time tracking is now active',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to start geofence monitoring',
        });
      }
    } else {
      await stopMonitoring();
      toast({
        title: 'Monitoring Stopped',
        description: 'Automatic time tracking has been disabled',
      });
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geofencing & Auto Check-In
            </CardTitle>
            <CardDescription className="mt-2">
              Automatically track time when you arrive at job sites
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Check */}
        {!permissionGranted && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-900 flex items-center justify-between">
              <span>Location permissions are required for geofencing</span>
              <Button size="sm" variant="outline" onClick={handleRequestPermissions}>
                Grant Permission
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Monitoring Toggle */}
        {permissionGranted && (
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <Label htmlFor="monitoring-toggle" className="flex flex-col space-y-1">
              <span className="font-medium">Auto Time Tracking</span>
              <span className="text-sm text-muted-foreground">
                {isEnabled
                  ? 'Monitoring active job sites'
                  : 'Enable to track time automatically'}
              </span>
            </Label>
            <Switch
              id="monitoring-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggleMonitoring}
            />
          </div>
        )}

        {/* Active Regions */}
        {activeRegions.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-900">
              You are currently at: {activeRegions.map((r) => r.name).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Regions List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Job Site Locations ({regions.length})</h3>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingRegion(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingRegion ? 'Edit Geofence' : 'Add Geofence'}
                  </DialogTitle>
                  <DialogDescription>
                    Set up automatic time tracking for this location
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Location Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Downtown Office Building"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        placeholder="40.7128"
                        value={formData.latitude}
                        onChange={(e) =>
                          setFormData({ ...formData, latitude: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        placeholder="-74.0060"
                        value={formData.longitude}
                        onChange={(e) =>
                          setFormData({ ...formData, longitude: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUseCurrentLocation}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Use Current Location
                  </Button>
                  <div>
                    <Label htmlFor="radius">Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      min="10"
                      max="10000"
                      placeholder="100"
                      value={formData.radius}
                      onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 50-200 meters for job sites
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRegion}>
                    {editingRegion ? 'Update' : 'Add'} Geofence
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {regions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No job site locations configured. Add your first location to enable
                automatic time tracking.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {region.active ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{region.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {region.radius}m radius • {region.latitude.toFixed(4)},{' '}
                        {region.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={region.active}
                      onCheckedChange={() => handleToggleRegion(region)}
                      disabled={!permissionGranted}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditRegion(region)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRegion(region.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <MapPin className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>How it works:</strong> When you enter or exit a geofenced area, the
            app will automatically log your time. Make sure location services are enabled
            for background operation.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
