import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Package, 
  Truck, 
  Camera, 
  Clock, 
  MapPin, 
  Settings, 
  User, 
  Home,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import MobileSafetyIncidentManager from './MobileSafetyIncidentManager';
import MobileDailyReportManager from './MobileDailyReportManager';
import MobileEquipmentManager from './MobileEquipmentManager';
import { MobileMaterialTracker } from './MobileMaterialTracker';
import { EnhancedMobileCamera } from './EnhancedMobileCamera';
import MobileTimeTracker from './MobileTimeTracker';
import { mobileCardClasses, mobileButtonClasses, mobileTextClasses } from '@/utils/mobileHelpers';
import { cn } from '@/lib/utils';
import { MobileSkeletonDashboard } from './MobileSkeletons';
import { MobileDashboardLayout, type MobileDashboardWidget } from './MobileDashboardLayout';
import { toast } from 'sonner';

interface DashboardStats {
  safetyIncidents: number;
  dailyReports: number;
  equipmentItems: number;
  materialDeliveries: number;
  photosToday: number;
  activeProjects: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  component: string;
  badge?: string;
}

export const MobileDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    safetyIncidents: 0,
    dailyReports: 3,
    equipmentItems: 15,
    materialDeliveries: 8,
    photosToday: 12,
    activeProjects: 4
  });

  const { position, isTracking, getCurrentPosition, startTracking } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000
  });

  const { deviceInfo, capabilities, isNative, isMobile } = useDeviceInfo();

  const quickActions: QuickAction[] = [
    {
      id: 'time-tracking',
      title: 'Time Tracking',
      description: 'Clock in/out & crew management',
      icon: Clock,
      color: 'text-blue-600',
      component: 'time-tracking'
    },
    {
      id: 'safety',
      title: 'Safety Report',
      description: 'Report incidents & hazards',
      icon: Shield,
      color: 'text-red-600',
      component: 'safety',
      badge: stats.safetyIncidents > 0 ? stats.safetyIncidents.toString() : undefined
    },
    {
      id: 'daily-report',
      title: 'Daily Report',
      description: 'Log progress & activities',
      icon: FileText,
      color: 'text-green-600',
      component: 'daily-report'
    },
    {
      id: 'equipment',
      title: 'Equipment',
      description: 'Check in/out equipment',
      icon: Package,
      color: 'text-yellow-600',
      component: 'equipment'
    },
    {
      id: 'materials',
      title: 'Materials',
      description: 'Track deliveries & inventory',
      icon: Truck,
      color: 'text-purple-600',
      component: 'materials'
    },
    {
      id: 'camera',
      title: 'Camera',
      description: 'Capture photos & documents',
      icon: Camera,
      color: 'text-orange-600',
      component: 'camera'
    },
    {
      id: 'location',
      title: 'Location',
      description: 'GPS tracking & geofencing',
      icon: MapPin,
      color: 'text-teal-600',
      component: 'location'
    }
  ];

  useEffect(() => {
    // Initialize location tracking if available
    if (capabilities.hasGeolocation && !position) {
      getCurrentPosition();
    }
  }, [capabilities.hasGeolocation, position, getCurrentPosition]);

  useEffect(() => {
    // Briefly show mobile skeleton on first mount so initial paint matches
    // the final layout without a spinner flash.
    const t = window.setTimeout(() => setIsInitializing(false), 250);
    return () => window.clearTimeout(t);
  }, []);

  const handleActionClick = (action: QuickAction) => {
    setActiveView(action.component);
    toast.success(`Opening ${action.title}`);
  };

  const handleLocationTest = async () => {
    try {
      if (isTracking) {
        toast.info('Location tracking already active');
        return;
      }
      
      await getCurrentPosition();
      toast.success('Location acquired successfully');
    } catch (error) {
      toast.error('Failed to get location');
    }
  };

  const welcomeWidget: MobileDashboardWidget = {
    id: 'welcome',
    title: 'Welcome header',
    description: 'Greeting and current location',
    render: () => (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl p-5',
          'glass shadow-ios-2',
          'ring-1 ring-inset ring-primary/10'
        )}
      >
        <div
          className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-construction-blue/20 blur-3xl"
          aria-hidden="true"
        />
        <h2 className={cn(mobileTextClasses.header, 'relative tracking-tight')}>
          Welcome to Brikly
        </h2>
        <p className={cn(mobileTextClasses.muted, 'relative')}>
          Construction management tools at your fingertips
        </p>
        {position && (
          <div className="relative flex items-center gap-2 mt-3">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm text-muted-foreground tabular-nums">
              {position.coords.latitude.toFixed(4)}, {position.coords.longitude.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    ),
  };

  const statsWidget: MobileDashboardWidget = {
    id: 'stats',
    title: 'Stats overview',
    description: 'Projects, reports, equipment, photos',
    render: () => {
      const tiles = [
        { label: 'Active Projects', value: stats.activeProjects, icon: TrendingUp, tint: 'text-primary', bg: 'from-primary/20 to-primary/5', ring: 'ring-primary/15' },
        { label: 'Reports Today', value: stats.dailyReports, icon: CheckCircle, tint: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', ring: 'ring-emerald-500/15' },
        { label: 'Equipment Items', value: stats.equipmentItems, icon: Package, tint: 'text-sky-600 dark:text-sky-400', bg: 'from-sky-500/20 to-sky-500/5', ring: 'ring-sky-500/15' },
        { label: 'Photos Today', value: stats.photosToday, icon: Camera, tint: 'text-orange-600 dark:text-orange-400', bg: 'from-orange-500/20 to-orange-500/5', ring: 'ring-orange-500/15' },
      ];
      return (
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div
              key={t.label}
              className={cn(
                'relative overflow-hidden rounded-2xl p-4',
                'glass shadow-ios-1',
                'transition-transform duration-[200ms] ease-ios active:scale-[0.98]'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn(mobileTextClasses.muted, 'text-xs truncate')}>{t.label}</p>
                  <p className={cn('text-2xl font-bold tracking-tight tabular-nums', t.tint)}>
                    {t.value}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                    'bg-gradient-to-br ring-1 ring-inset',
                    t.bg,
                    t.ring
                  )}
                >
                  <t.icon className={cn('h-5 w-5', t.tint)} aria-hidden="true" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    },
  };

  const quickActionsWidget: MobileDashboardWidget = {
    id: 'quick-actions',
    title: 'Quick actions',
    description: 'Time, safety, reports, equipment, camera',
    render: () => (
      <div>
        <h3 className={cn(mobileTextClasses.header, 'tracking-tight')}>Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {quickActions.map((action) => (
            <button
              type="button"
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                'relative overflow-hidden rounded-2xl p-4 text-left',
                'glass shadow-ios-1',
                'transition-all duration-[200ms] ease-ios',
                'active:scale-[0.97] tap-highlight-transparent',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
              aria-label={action.title}
            >
              <div className="flex flex-col items-start space-y-3">
                <div
                  className={cn(
                    'relative w-11 h-11 rounded-xl flex items-center justify-center',
                    'bg-gradient-to-br from-foreground/5 to-foreground/0',
                    'ring-1 ring-inset ring-foreground/10'
                  )}
                >
                  <action.icon className={cn('h-5 w-5', action.color)} aria-hidden="true" />
                  {action.badge && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] shadow-ios-1">
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <p className="font-semibold text-sm tracking-tight truncate">
                    {action.title}
                  </p>
                  <p className={cn(mobileTextClasses.muted, 'text-xs leading-snug line-clamp-2')}>
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    ),
  };

  const scheduleWidget: MobileDashboardWidget = {
    id: 'schedule',
    title: "Today's schedule",
    description: 'Upcoming jobs and visits',
    render: () => (
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(mobileTextClasses.muted, 'text-sm')}>
            No upcoming visits today. Check back tomorrow.
          </p>
        </CardContent>
      </Card>
    ),
  };

  const recentReportsWidget: MobileDashboardWidget = {
    id: 'recent-reports',
    title: 'Recent daily reports',
    description: 'Latest field updates',
    render: () => (
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <CardTitle className="text-base">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(mobileTextClasses.muted, 'text-sm')}>
            {stats.dailyReports} report{stats.dailyReports === 1 ? '' : 's'} submitted today.
          </p>
        </CardContent>
      </Card>
    ),
  };

  const financialSnapshotWidget: MobileDashboardWidget = {
    id: 'financial-snapshot',
    title: 'Financial snapshot',
    description: 'AR / AP / profitability glance',
    render: () => (
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Financial snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(mobileTextClasses.muted, 'text-sm')}>
            Connect QuickBooks to see live AR, AP, and margin.
          </p>
        </CardContent>
      </Card>
    ),
  };

  const deviceInfoWidget: MobileDashboardWidget = {
    id: 'device-info',
    title: 'Device information',
    description: 'Platform, GPS, camera status',
    render: () => (
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className={mobileTextClasses.muted}>Platform</p>
              <p className="font-medium">{deviceInfo.platform}</p>
            </div>
            <div>
              <p className={mobileTextClasses.muted}>Environment</p>
              <p className="font-medium">{isNative ? 'Native App' : 'Web Browser'}</p>
            </div>
            <div>
              <p className={mobileTextClasses.muted}>Online Status</p>
              <p className="font-medium">{capabilities.isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div>
              <p className={mobileTextClasses.muted}>GPS Available</p>
              <p className="font-medium">{capabilities.hasGeolocation ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleLocationTest}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!capabilities.hasGeolocation}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Test GPS
            </Button>
            <Button
              onClick={() => toast.success('Camera test - functionality available in camera module')}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!capabilities.hasCamera}
            >
              <Camera className="h-4 w-4 mr-1" />
              Test Camera
            </Button>
          </div>
        </CardContent>
      </Card>
    ),
  };

  const dashboardWidgets: MobileDashboardWidget[] = [
    welcomeWidget,
    statsWidget,
    quickActionsWidget,
    scheduleWidget,
    recentReportsWidget,
    financialSnapshotWidget,
    deviceInfoWidget,
  ];

  const renderDashboardView = () => (
    <MobileDashboardLayout widgets={dashboardWidgets} />
  );

  const renderActiveComponent = () => {
    switch (activeView) {
      case 'time-tracking':
        return <MobileTimeTracker />;
      case 'safety':
        return <MobileSafetyIncidentManager />;
      case 'daily-report':
        return <MobileDailyReportManager />;
      case 'equipment':
        return <MobileEquipmentManager />;
      case 'materials':
        return <MobileMaterialTracker />;
      case 'camera':
        return (
          <EnhancedMobileCamera
            onCapture={(file) => {
              toast.success('Photo captured successfully');
              setActiveView('dashboard');
            }}
            onCancel={() => setActiveView('dashboard')}
            enableGeolocation={true}
          />
        );
      case 'location':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={mobileTextClasses.header}>Location Services</h2>
              <Button
                onClick={() => setActiveView('dashboard')}
                variant="ghost"
                size="sm"
              >
                Back
              </Button>
            </div>
            
            <Card className={mobileCardClasses.container}>
              <CardHeader>
                <CardTitle>GPS Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {position ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Latitude:</strong> {position.coords.latitude.toFixed(6)}
                    </p>
                    <p className="text-sm">
                      <strong>Longitude:</strong> {position.coords.longitude.toFixed(6)}
                    </p>
                    <p className="text-sm">
                      <strong>Accuracy:</strong> ±{position.coords.accuracy}m
                    </p>
                    <p className="text-sm">
                      <strong>Tracking:</strong> {isTracking ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                ) : (
                  <p className={mobileTextClasses.muted}>No location data available</p>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={getCurrentPosition}
                    className="flex-1"
                    disabled={!capabilities.hasGeolocation}
                  >
                    Get Location
                  </Button>
                  <Button
                    onClick={isTracking ? () => {} : startTracking}
                    variant="outline"
                    className="flex-1"
                    disabled={!capabilities.hasGeolocation}
                  >
                    {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return renderDashboardView();
    }
  };

  if (isInitializing && activeView === 'dashboard') {
    return (
      <div className="min-h-screen ios-page-bg p-4">
        <MobileSkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen ios-page-bg">
      {/* Navigation Header */}
      {activeView !== 'dashboard' && activeView !== 'camera' && (
        <div
          className="sticky top-0 z-10 glass-chrome border-b border-white/10 dark:border-white/5 p-4 safe-area-x"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setActiveView('dashboard')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 rounded-xl"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
            <h1 className={cn(mobileTextClasses.title, 'tracking-tight')}>
              {quickActions.find(a => a.component === activeView)?.title || 'Mobile Tools'}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={activeView === 'dashboard' ? 'p-4 pb-28' : ''}>
        {renderActiveComponent()}
      </div>

      {/* Bottom Tab Bar for Dashboard */}
      {activeView === 'dashboard' && (
        <div
          className="fixed bottom-0 left-0 right-0 glass-chrome border-t border-white/10 dark:border-white/5 p-2 safe-area-x"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
          aria-label="Dashboard quick tabs"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
            aria-hidden="true"
          />
          <div className="flex justify-around">
            {[
              { label: 'Home', icon: Home, onClick: () => setActiveView('dashboard'), isActive: true },
              { label: 'Time', icon: Clock, onClick: () => handleActionClick(quickActions[0]) },
              { label: 'Safety', icon: Shield, onClick: () => handleActionClick(quickActions[1]) },
              { label: 'Camera', icon: Camera, onClick: () => handleActionClick(quickActions[5]) },
              { label: 'GPS', icon: MapPin, onClick: () => setActiveView('location') },
            ].map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={tab.onClick}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[48px] px-2 py-1.5 rounded-2xl',
                  'transition-all duration-[180ms] ease-ios active:scale-95 tap-highlight-transparent',
                  tab.isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 inset-y-1 rounded-2xl bg-gradient-to-b from-primary/18 to-primary/8 ring-1 ring-inset ring-primary/20"
                  />
                )}
                <tab.icon className="h-5 w-5 relative z-[1]" aria-hidden="true" />
                <span className="text-[11px] font-medium leading-tight relative z-[1]">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};