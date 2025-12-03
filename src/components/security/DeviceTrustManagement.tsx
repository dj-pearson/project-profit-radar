import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Smartphone,
  Monitor,
  Tablet,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
  Clock,
  MapPin,
  RefreshCw,
  Plus,
  Pencil,
} from 'lucide-react';
import { useDeviceTrust, TrustedDevice } from '@/hooks/useDeviceTrust';
import { mobileCardClasses, mobileTextClasses } from '@/utils/mobileHelpers';
import { formatDistanceToNow, format } from 'date-fns';

export const DeviceTrustManagement: React.FC = () => {
  const {
    trustedDevices,
    loading,
    trustCurrentDevice,
    revokeDeviceTrust,
    updateDeviceTrust,
    getCurrentDeviceId,
    refreshData,
  } = useDeviceTrust();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<TrustedDevice | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const currentDeviceId = getCurrentDeviceId();

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'ios':
      case 'android':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const handleTrustDevice = async () => {
    setActionLoading(true);
    await trustCurrentDevice(deviceName || undefined);
    setActionLoading(false);
    setShowAddDialog(false);
    setDeviceName('');
  };

  const handleRevokeDevice = async () => {
    if (!selectedDevice) return;
    setActionLoading(true);
    await revokeDeviceTrust(selectedDevice.id);
    setActionLoading(false);
    setShowRevokeDialog(false);
    setSelectedDevice(null);
  };

  const handleUpdateDevice = async () => {
    if (!selectedDevice) return;
    setActionLoading(true);
    await updateDeviceTrust(selectedDevice.id, { device_name: deviceName });
    setActionLoading(false);
    setShowEditDialog(false);
    setSelectedDevice(null);
    setDeviceName('');
  };

  const openEditDialog = (device: TrustedDevice) => {
    setSelectedDevice(device);
    setDeviceName(device.device_name || '');
    setShowEditDialog(true);
  };

  const openRevokeDialog = (device: TrustedDevice) => {
    setSelectedDevice(device);
    setShowRevokeDialog(true);
  };

  // Check if current device is already trusted
  const isCurrentDeviceTrusted = trustedDevices.some(
    d => d.device_id === currentDeviceId && d.is_trusted && !isExpired(d.trust_expires_at)
  );

  if (loading) {
    return (
      <Card className={mobileCardClasses.container}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Trusted Devices
              </CardTitle>
              <CardDescription>
                Manage devices that can skip additional security checks
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {!isCurrentDeviceTrusted && (
                <Button
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Trust This Device
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trustedDevices.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className={`${mobileTextClasses.body} font-medium`}>No Trusted Devices</p>
                <p className={mobileTextClasses.muted}>
                  Trust this device to skip MFA verification for 90 days
                </p>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Trust This Device
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {trustedDevices.map((device, index) => {
                const expired = isExpired(device.trust_expires_at);
                const isCurrentDevice = device.device_id === currentDeviceId;

                return (
                  <div key={device.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          expired
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-success/10 text-success'
                        }`}>
                          {getDeviceIcon(device.device_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`${mobileTextClasses.cardTitle} font-medium truncate`}>
                              {device.device_name || 'Unknown Device'}
                            </p>
                            {isCurrentDevice && (
                              <Badge variant="secondary" className="text-xs">
                                This Device
                              </Badge>
                            )}
                            {expired ? (
                              <Badge variant="destructive" className="text-xs">
                                <ShieldX className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-success text-success-foreground text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Trusted
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <span className={`${mobileTextClasses.muted} flex items-center gap-1`}>
                              <Clock className="h-3 w-3" />
                              {expired ? 'Expired' : `Expires ${formatDistanceToNow(new Date(device.trust_expires_at), { addSuffix: true })}`}
                            </span>
                            {device.last_ip_address && (
                              <span className={`${mobileTextClasses.muted} flex items-center gap-1`}>
                                <MapPin className="h-3 w-3" />
                                {device.last_ip_address}
                              </span>
                            )}
                          </div>
                          <p className={`${mobileTextClasses.muted} text-xs mt-1`}>
                            Last seen: {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(device)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openRevokeDialog(device)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {index < trustedDevices.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Security Info */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
            <h4 className={`${mobileTextClasses.cardTitle} font-medium mb-2`}>About Trusted Devices</h4>
            <ul className={`${mobileTextClasses.muted} space-y-1 list-disc list-inside`}>
              <li>Trusted devices can skip MFA verification for 90 days</li>
              <li>Device trust is tied to your browser fingerprint</li>
              <li>Clearing browser data may remove the trust status</li>
              <li>Remove devices you no longer use for better security</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Trust Device Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trust This Device</DialogTitle>
            <DialogDescription>
              Add this device to your trusted devices. You won't need to enter MFA codes when logging in from this device for 90 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name (optional)</Label>
              <Input
                id="device-name"
                placeholder="e.g., Work Laptop, Personal Phone"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
              <p className={mobileTextClasses.muted}>
                Give this device a name to easily identify it later
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTrustDevice} disabled={actionLoading}>
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Trust Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device Name</DialogTitle>
            <DialogDescription>
              Update the name for this trusted device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-device-name">Device Name</Label>
              <Input
                id="edit-device-name"
                placeholder="e.g., Work Laptop"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDevice} disabled={actionLoading}>
              {actionLoading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Device Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trusted Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{selectedDevice?.device_name || 'this device'}" from your trusted devices?
              {selectedDevice?.device_id === currentDeviceId && (
                <span className="block mt-2 text-warning font-medium">
                  This is your current device. You will need to verify with MFA on your next login.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeDevice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
