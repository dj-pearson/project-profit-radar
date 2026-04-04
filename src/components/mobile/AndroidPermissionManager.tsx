import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Camera as CameraIcon, MapPin, Bell, Shield, Settings, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown' | 'checking';

interface PermissionInfo {
  key: string;
  name: string;
  description: string;
  rationale: string;
  icon: React.ReactNode;
  status: PermissionState;
  required: boolean;
}

export function AndroidPermissionManager() {
  const [permissions, setPermissions] = useState<PermissionInfo[]>([
    {
      key: 'camera',
      name: 'Camera',
      description: 'Take photos for daily reports, document damage, and capture receipts',
      rationale: 'BuildDesk uses your camera to capture photos for daily job reports, document site conditions, and scan receipts for expense tracking.',
      icon: <CameraIcon className="h-5 w-5" />,
      status: 'checking',
      required: false,
    },
    {
      key: 'location',
      name: 'Location',
      description: 'GPS time tracking, geofencing, and crew check-ins',
      rationale: 'BuildDesk uses your location for automatic clock in/out at job sites, GPS crew tracking, and geofence-based time entries. Your location is only tracked during work hours.',
      icon: <MapPin className="h-5 w-5" />,
      status: 'checking',
      required: true,
    },
    {
      key: 'notifications',
      name: 'Notifications',
      description: 'Project updates, schedule changes, and safety alerts',
      rationale: 'BuildDesk sends notifications for schedule changes, project updates, safety alerts, and time tracking reminders so you never miss important job site information.',
      icon: <Bell className="h-5 w-5" />,
      status: 'checking',
      required: false,
    },
  ]);

  const [rationaleDialog, setRationaleDialog] = useState<{
    open: boolean;
    permission: PermissionInfo | null;
  }>({ open: false, permission: null });

  const [settingsDialog, setSettingsDialog] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const checkPermissions = useCallback(async () => {
    if (!isNative) {
      setPermissions(prev =>
        prev.map(p => ({ ...p, status: 'granted' as PermissionState }))
      );
      return;
    }

    const updated = await Promise.all(
      permissions.map(async (perm) => {
        try {
          let status: PermissionState = 'unknown';

          if (perm.key === 'camera') {
            const result = await Camera.checkPermissions();
            status = result.camera === 'granted' ? 'granted'
              : result.camera === 'denied' ? 'denied'
              : 'prompt';
          } else if (perm.key === 'location') {
            const result = await Geolocation.checkPermissions();
            status = result.location === 'granted' ? 'granted'
              : result.location === 'denied' ? 'denied'
              : 'prompt';
          } else if (perm.key === 'notifications') {
            const result = await PushNotifications.checkPermissions();
            status = result.receive === 'granted' ? 'granted'
              : result.receive === 'denied' ? 'denied'
              : 'prompt';
          }

          return { ...perm, status };
        } catch {
          return { ...perm, status: 'unknown' as PermissionState };
        }
      })
    );

    setPermissions(updated);
  }, [isNative]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const requestPermission = useCallback(async (permKey: string) => {
    if (!isNative) return;

    try {
      let granted = false;

      if (permKey === 'camera') {
        const result = await Camera.requestPermissions({ permissions: ['camera'] });
        granted = result.camera === 'granted';
      } else if (permKey === 'location') {
        const result = await Geolocation.requestPermissions({ permissions: ['location'] });
        granted = result.location === 'granted';
      } else if (permKey === 'notifications') {
        const result = await PushNotifications.requestPermissions();
        granted = result.receive === 'granted';
      }

      setPermissions(prev =>
        prev.map(p =>
          p.key === permKey
            ? { ...p, status: granted ? 'granted' : 'denied' }
            : p
        )
      );

      if (!granted) {
        setSettingsDialog(true);
      }
    } catch {
      setPermissions(prev =>
        prev.map(p => p.key === permKey ? { ...p, status: 'denied' } : p)
      );
    }

    setRationaleDialog({ open: false, permission: null });
  }, [isNative]);

  const handlePermissionRequest = useCallback((perm: PermissionInfo) => {
    if (perm.status === 'denied') {
      setSettingsDialog(true);
      return;
    }

    // Show rationale before requesting
    setRationaleDialog({ open: true, permission: perm });
  }, []);

  const getStatusBadge = (status: PermissionState) => {
    switch (status) {
      case 'granted':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Denied</Badge>;
      case 'prompt':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> Not Set</Badge>;
      case 'checking':
        return <Badge variant="outline">Checking...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const allGranted = permissions.every(p => p.status === 'granted');
  const requiredGranted = permissions.filter(p => p.required).every(p => p.status === 'granted');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">App Permissions</CardTitle>
          </div>
          <CardDescription>
            {allGranted
              ? 'All permissions granted. BuildDesk has full functionality.'
              : requiredGranted
                ? 'Core permissions granted. Some features may be limited.'
                : 'Required permissions needed for BuildDesk to work properly.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {permissions.map((perm) => (
            <div
              key={perm.key}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-muted-foreground shrink-0">{perm.icon}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{perm.name}</p>
                    {perm.required && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">Required</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {getStatusBadge(perm.status)}
                {perm.status !== 'granted' && perm.status !== 'checking' && (
                  <Button
                    size="sm"
                    variant={perm.status === 'denied' ? 'outline' : 'default'}
                    onClick={() => handlePermissionRequest(perm)}
                    className="min-h-[36px]"
                  >
                    {perm.status === 'denied' ? <Settings className="h-4 w-4" /> : 'Allow'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rationale Dialog */}
      <AlertDialog
        open={rationaleDialog.open}
        onOpenChange={(open) => {
          if (!open) setRationaleDialog({ open: false, permission: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {rationaleDialog.permission?.icon}
              Allow {rationaleDialog.permission?.name} Access
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rationaleDialog.permission?.rationale}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not Now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rationaleDialog.permission) {
                  requestPermission(rationaleDialog.permission.key);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Redirect Dialog */}
      <AlertDialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permission Required</AlertDialogTitle>
            <AlertDialogDescription>
              This permission was previously denied. To enable it, please open your device Settings and grant the permission for BuildDesk manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // On Android, this opens app settings via Capacitor
                if (isNative) {
                  const { App } = Capacitor.Plugins as { App?: { openUrl: (opts: { url: string }) => Promise<void> } };
                  App?.openUrl({ url: 'app-settings:' });
                }
                setSettingsDialog(false);
              }}
            >
              Open Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
