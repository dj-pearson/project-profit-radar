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
import EnhancedMobileCamera from './EnhancedMobileCamera';
import MobileTimeTracker from './MobileTimeTracker';
import { mobileCardClasses, mobileButtonClasses, mobileTextClasses } from '@/utils/mobileHelpers';
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
  icon: React.ElementType;
  color: string;
  component: string;
  badge?: string;
}

export const MobileDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
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

  const renderDashboardView = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
        <h2 className={mobileTextClasses.header}>Welcome to BuildDesk Mobile</h2>
        <p className={mobileTextClasses.muted}>
          Construction management tools at your fingertips
        </p>
        {position && (
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Location: {position.coords.latitude.toFixed(4)}, {position.coords.longitude.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={mobileCardClasses.container}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={mobileTextClasses.muted}>Active Projects</p>
                <p className="text-2xl font-bold text-primary">{stats.activeProjects}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className={mobileCardClasses.container}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={mobileTextClasses.muted}>Reports Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.dailyReports}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={mobileCardClasses.container}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={mobileTextClasses.muted}>Equipment Items</p>
                <p className="text-2xl font-bold text-blue-600">{stats.equipmentItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={mobileCardClasses.container}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={mobileTextClasses.muted}>Photos Today</p>
                <p className="text-2xl font-bold text-orange-600">{stats.photosToday}</p>
              </div>
              <Camera className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className={mobileTextClasses.header}>Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {quickActions.map((action) => (
            <Card 
              key={action.id} 
              className={`${mobileCardClasses.container} cursor-pointer hover:shadow-md transition-all duration-200 active:scale-95`}
              onClick={() => handleActionClick(action)}
            >
              <CardContent className="pt-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="relative">
                    <action.icon className={`h-8 w-8 ${action.color}`} />
                    {action.badge && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className={`${mobileTextClasses.muted} text-xs`}>{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Device Info */}
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
    </div>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      {activeView !== 'dashboard' && activeView !== 'camera' && (
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setActiveView('dashboard')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
            <h1 className={mobileTextClasses.title}>
              {quickActions.find(a => a.component === activeView)?.title || 'Mobile Tools'}
            </h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={activeView === 'dashboard' ? 'p-4' : ''}>
        {renderActiveComponent()}
      </div>

      {/* Bottom Tab Bar for Dashboard */}
      {activeView === 'dashboard' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/50 p-4">
          <div className="flex justify-around">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1"
              onClick={() => setActiveView('dashboard')}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1"
              onClick={() => handleActionClick(quickActions[0])}
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs">Time</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1"
              onClick={() => handleActionClick(quickActions[1])}
            >
              <Shield className="h-5 w-5" />
              <span className="text-xs">Safety</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1"
              onClick={() => handleActionClick(quickActions[5])}
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs">Camera</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1"
              onClick={() => setActiveView('location')}
            >
              <MapPin className="h-5 w-5" />
              <span className="text-xs">GPS</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};