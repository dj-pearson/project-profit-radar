import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Clock, AlertCircle, CheckCircle, Map, Route, DollarSign } from 'lucide-react';
import { useGPSTimeTracking, geofenceProblem } from '@/hooks/useGPSTimeTracking';
import { ErrorState } from '@/components/common/ErrorState';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { DashboardSkeleton } from '@/components/ui/skeletons';

export const GPSTimeTracking = () => {
  const { toast } = useToast();

  const gps = useGPSTimeTracking();
  const { entries: gpsEntries, geofences, travelLogs } = gps;
  const [showCreateGeofence, setShowCreateGeofence] = useState(false);

  // New geofence form
  const [newGeofenceName, setNewGeofenceName] = useState('');
  const [newGeofenceAddress, setNewGeofenceAddress] = useState('');
  const [newGeofenceRadius, setNewGeofenceRadius] = useState('100');
  const [newGeofenceLat, setNewGeofenceLat] = useState('');
  const [newGeofenceLng, setNewGeofenceLng] = useState('');

  const createGeofence = async () => {
    const fence = {
      name: newGeofenceName,
      address: newGeofenceAddress,
      // The site's own coordinates. This used to write New York City's for
      // every address ("placeholder - would be from geocoding").
      center_lat: newGeofenceLat.trim() === '' ? NaN : Number(newGeofenceLat),
      center_lng: newGeofenceLng.trim() === '' ? NaN : Number(newGeofenceLng),
      radius_meters: Number(newGeofenceRadius),
    };
    const problem = geofenceProblem(fence);
    if (problem) {
      toast({
        title: 'Validation Error',
        description: problem,
        variant: 'destructive',
      });
      return;
    }

    try {
      await gps.create(fence);

      toast({
        title: 'Geofence Created',
        description: `Geofence "${newGeofenceName}" has been created.`,
      });

      setShowCreateGeofence(false);
      setNewGeofenceName('');
      setNewGeofenceAddress('');
      setNewGeofenceRadius('100');
      setNewGeofenceLat('');
      setNewGeofenceLng('');
    } catch (error) {
      console.error('Failed to create geofence:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create geofence.',
        variant: 'destructive',
      });
    }
  };

  const toggleGeofence = async (geofenceId: string, currentStatus: boolean) => {
    try {
      await gps.setActive(geofenceId, !currentStatus);

      toast({
        title: currentStatus ? 'Geofence Disabled' : 'Geofence Enabled',
        description: currentStatus
          ? 'Geofence has been disabled.'
          : 'Geofence is now active.',
      });
    } catch (error) {
      console.error('Failed to toggle geofence:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update geofence.',
        variant: 'destructive',
      });
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (gps.isLoading) {
    return (
      <AccessiblePageWrapper pageTitle="GPS Time Tracking">
      <DashboardLayout hasAccessibleWrapper title="GPS Time Tracking">
        <DashboardSkeleton label="Loading GPS data" />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  const entriesWithinGeofence = gpsEntries.filter((e) => e.is_within_geofence).length;
  const entriesOutsideGeofence = gpsEntries.filter((e) => !e.is_within_geofence).length;
  const totalTravelDistance = travelLogs.reduce((sum, log) => sum + (log.distance_meters || 0), 0);
  const totalReimbursement = travelLogs.reduce(
    (sum, log) => sum + (log.total_reimbursement || 0),
    0
  );

  return (
    <AccessiblePageWrapper pageTitle="GPS Time Tracking">
    <DashboardLayout hasAccessibleWrapper
      title="GPS Time Tracking"
      description="Location-based time tracking with geofencing and travel logs"
    >
      <div className="space-y-6">
        {gps.error && (
          <ErrorState
            inline
            title="GPS tracking data could not be loaded"
            error={gps.error}
            onRetry={() => { void gps.refetch(); }}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">GPS Entries</p>
                  <p className="text-2xl font-bold">{gps.error ? '--' : gpsEntries.length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Geofences</p>
                  <p className="text-2xl font-bold">
                    {gps.error ? '--' : geofences.filter((g) => g.is_active).length}
                  </p>
                </div>
                <Map className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Travel Distance</p>
                  <p className="text-2xl font-bold">{gps.error ? '--' : formatDistance(totalTravelDistance)}</p>
                </div>
                <Route className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reimbursement</p>
                  <p className="text-2xl font-bold">{gps.error ? '--' : `$${totalReimbursement.toFixed(2)}`}</p>
                </div>
                <DollarSign className="w-8 h-8 text-construction-orange" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="entries">
          <TabsList>
            <TabsTrigger value="entries">GPS Entries ({gpsEntries.length})</TabsTrigger>
            <TabsTrigger value="geofences">Geofences ({geofences.length})</TabsTrigger>
            <TabsTrigger value="travel">Travel Logs ({travelLogs.length})</TabsTrigger>
          </TabsList>

          {/* GPS Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Location-verified time entries with geofence validation
            </p>

            {gpsEntries.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No GPS time entries recorded</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {gpsEntries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Navigation className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold">Time Entry</span>
                            {entry.is_within_geofence ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Within Geofence
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Outside Geofence
                              </Badge>
                            )}
                          </div>
                          {entry.clock_in_address && (
                            <p className="text-sm text-muted-foreground mb-1">
                              📍 {entry.clock_in_address}
                            </p>
                          )}
                          {entry.geofence_distance_meters !== null && (
                            <p className="text-xs text-muted-foreground">
                              Distance from geofence: {formatDistance(entry.geofence_distance_meters)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Clock In</p>
                          <p className="font-semibold">
                            {new Date(entry.clock_in_timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clock Out</p>
                          <p className="font-semibold">
                            {entry.clock_out_timestamp
                              ? new Date(entry.clock_out_timestamp).toLocaleString()
                              : 'Still clocked in'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Distance Moved</p>
                          <p className="font-semibold">
                            {entry.total_distance_meters
                              ? formatDistance(entry.total_distance_meters)
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Geofences Tab */}
          <TabsContent value="geofences" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Virtual boundaries for automatic clock-in/out
              </p>
              <Button onClick={() => setShowCreateGeofence(!showCreateGeofence)}>
                <MapPin className="w-4 h-4 mr-2" />
                Create Geofence
              </Button>
            </div>

            {showCreateGeofence && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Geofence</CardTitle>
                  <CardDescription>Define a virtual boundary for a job site</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Geofence Name</Label>
                    <Input
                      placeholder="e.g., Main Construction Site"
                      value={newGeofenceName}
                      onChange={(e) => setNewGeofenceName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input
                      placeholder="e.g., 123 Main St, City, State"
                      value={newGeofenceAddress}
                      onChange={(e) => setNewGeofenceAddress(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="geofence-lat">Latitude</Label>
                      <Input
                        id="geofence-lat"
                        type="number"
                        step="any"
                        placeholder="e.g., 39.7392"
                        value={newGeofenceLat}
                        onChange={(e) => setNewGeofenceLat(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="geofence-lng">Longitude</Label>
                      <Input
                        id="geofence-lng"
                        type="number"
                        step="any"
                        placeholder="e.g., -104.9903"
                        value={newGeofenceLng}
                        onChange={(e) => setNewGeofenceLng(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Radius (meters)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={newGeofenceRadius}
                      onChange={(e) => setNewGeofenceRadius(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={createGeofence}>Create Geofence</Button>
                    <Button variant="outline" onClick={() => setShowCreateGeofence(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {geofences.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Map className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No geofences configured</p>
                  <Button onClick={() => setShowCreateGeofence(true)}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Create First Geofence
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {geofences.map((geofence) => (
                  <Card key={geofence.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{geofence.name}</h3>
                            {geofence.is_active ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">Inactive</Badge>
                            )}
                          </div>
                          {geofence.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {geofence.description}
                            </p>
                          )}
                          {geofence.address && (
                            <p className="text-sm text-muted-foreground">📍 {geofence.address}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Radius</p>
                          <p className="font-semibold">
                            {formatDistance(geofence.radius_meters)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clock Ins</p>
                          <p className="font-semibold">{geofence.total_clock_ins}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clock Outs</p>
                          <p className="font-semibold">{geofence.total_clock_outs}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Breaches</p>
                          <p className="font-semibold text-red-600">{geofence.total_breaches}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={geofence.is_active ? 'outline' : 'default'}
                          onClick={() => toggleGeofence(geofence.id, geofence.is_active)}
                        >
                          {geofence.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Travel Logs Tab */}
          <TabsContent value="travel" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mileage tracking and reimbursement for travel between job sites
            </p>

            {travelLogs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No travel logs recorded</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {travelLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Route className="w-4 h-4 text-purple-500" />
                            <Badge variant="outline" className="capitalize">
                              {log.travel_method}
                            </Badge>
                            <Badge
                              className={
                                log.status === 'completed'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-yellow-500 text-white'
                              }
                            >
                              {log.status}
                            </Badge>
                            {log.is_billable && (
                              <Badge className="bg-blue-500 text-white">Billable</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            From: {log.start_address || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            To: {log.end_address || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Distance</p>
                          <p className="font-semibold">{log.distance_meters == null ? '--' : formatDistance(log.distance_meters)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-semibold">{log.duration_minutes == null ? '--' : formatDuration(log.duration_minutes)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Reimbursement</p>
                          <p className="font-semibold">${log.total_reimbursement?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-semibold">
                            {new Date(log.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default GPSTimeTracking;
