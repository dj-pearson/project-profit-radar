import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TouchGestureDemo } from './TouchGestureDemo';
import { MobileNavigationPattern } from './MobileNavigationPattern';
import { DeviceCapabilitiesPanel } from './DeviceCapabilitiesPanel';
import { EnhancedMobileCamera } from './EnhancedMobileCamera';
import { 
  Smartphone, 
  Camera, 
  Navigation, 
  TouchpadIcon,
  Settings,
  Download
} from 'lucide-react';

export const MobileTestingEnvironment = () => {
  const [activeTest, setActiveTest] = useState('overview');
  const [showCamera, setShowCamera] = useState(false);

  const handleCameraCapture = (file: File, metadata?: any) => {
    console.log('Photo captured:', file, metadata);
    setShowCamera(false);
  };

  if (showCamera) {
    return (
      <EnhancedMobileCamera
        onCapture={handleCameraCapture}
        onCancel={() => setShowCamera(false)}
        enableGeolocation={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mobile Testing Environment</h1>
              <p className="text-muted-foreground">
                Test and validate mobile features for construction field work
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => setShowCamera(true)}
              className="flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Test Camera
            </Button>
            <Button variant="outline" asChild>
              <a href="/" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Install PWA
              </a>
            </Button>
          </div>
        </Card>

        {/* Testing Tabs */}
        <Tabs value={activeTest} onValueChange={setActiveTest} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="gestures" className="flex items-center gap-2">
              <TouchpadIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Gestures</span>
            </TabsTrigger>
            <TabsTrigger value="navigation" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Navigation</span>
            </TabsTrigger>
            <TabsTrigger value="device" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Device</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Mobile Feature Overview</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">✅ Implemented Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Progressive Web App (PWA)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Offline functionality
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Enhanced camera with metadata
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Geolocation services
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Touch gesture recognition
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Mobile-first responsive design
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Performance optimization
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">🚀 Construction-Specific Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Field photo capture with GPS
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Material scanning & tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Offline data synchronization
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Mobile navigation patterns
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Device capability detection
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Haptic feedback support
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="gestures">
            <TouchGestureDemo />
          </TabsContent>

          <TabsContent value="navigation">
            <MobileNavigationPattern />
          </TabsContent>

          <TabsContent value="device">
            <DeviceCapabilitiesPanel />
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Quick Tests</h3>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => navigator.vibrate([100, 50, 100])}
              variant="outline"
              size="sm"
            >
              Test Vibration
            </Button>
            <Button 
              onClick={() => {
                if ('geolocation' in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => alert(`Location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
                    (err) => alert('Location access denied')
                  );
                }
              }}
              variant="outline"
              size="sm"
            >
              Test GPS
            </Button>
            <Button 
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  alert('Service Worker supported ✓');
                } else {
                  alert('Service Worker not supported ✗');
                }
              }}
              variant="outline"
              size="sm"
            >
              Test SW
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};