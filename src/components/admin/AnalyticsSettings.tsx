import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  BarChart3,
  Eye,
  EyeOff,
  MousePointer,
  ScrollText,
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AnalyticsConfig {
  enabled: boolean;
  trackingId: string;
  eventTracking: boolean;
  scrollTracking: boolean;
  formTracking: boolean;
}

const AnalyticsSettings = () => {
  const [config, setConfig] = useState<AnalyticsConfig>({
    enabled: false,
    trackingId: '',
    eventTracking: true,
    scrollTracking: true,
    formTracking: true,
  });
  
  const [showTrackingId, setShowTrackingId] = useState(false);
  const [trackingIdValid, setTrackingIdValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem('analytics-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        if (parsed.trackingId) {
          validateTrackingId(parsed.trackingId);
        }
      } catch (error) {
        console.error('Error loading analytics config:', error);
      }
    }
  }, []);

  const validateTrackingId = (id: string) => {
    // Google Analytics 4 tracking ID format: G-XXXXXXXXXX
    const ga4Pattern = /^G-[A-Z0-9]{10}$/;
    const isValid = ga4Pattern.test(id);
    setTrackingIdValid(isValid);
    return isValid;
  };

  const handleTrackingIdChange = (value: string) => {
    setConfig(prev => ({ ...prev, trackingId: value }));
    if (value) {
      validateTrackingId(value);
    } else {
      setTrackingIdValid(null);
    }
  };

  const saveConfig = () => {
    if (config.enabled && !config.trackingId) {
      toast({
        variant: "destructive",
        title: "Tracking ID Required",
        description: "Please enter a valid Google Analytics tracking ID to enable analytics."
      });
      return;
    }

    if (config.enabled && config.trackingId && !trackingIdValid) {
      toast({
        variant: "destructive",
        title: "Invalid Tracking ID",
        description: "Please enter a valid Google Analytics tracking ID (format: G-XXXXXXXXXX)."
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem('analytics-config', JSON.stringify(config));
    
    toast({
      title: "Analytics Settings Saved",
      description: "Page will reload to apply new settings.",
    });

    // Reload page to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const getStatusBadge = () => {
    if (!config.enabled) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Disabled
      </Badge>;
    }
    
    if (!config.trackingId || !trackingIdValid) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Invalid Config
      </Badge>;
    }
    
    return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
      <CheckCircle className="h-3 w-3" />
      Active
    </Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Google Analytics Configuration</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Configure Google Analytics tracking for user behavior and metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Analytics */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Google Analytics</Label>
            <p className="text-sm text-muted-foreground">
              Turn on analytics tracking for your platform
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        {config.enabled && (
          <>
            <Separator />
            
            {/* Tracking ID Configuration */}
            <div className="space-y-2">
              <Label htmlFor="trackingId">Google Analytics Tracking ID</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="trackingId"
                    type={showTrackingId ? "text" : "password"}
                    placeholder="G-XXXXXXXXXX"
                    value={config.trackingId}
                    onChange={(e) => handleTrackingIdChange(e.target.value)}
                    className={trackingIdValid === false ? "border-red-500" : trackingIdValid === true ? "border-green-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowTrackingId(!showTrackingId)}
                  >
                    {showTrackingId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://analytics.google.com/analytics/web/#/a-property-stream/create', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Get ID
                </Button>
              </div>
              {trackingIdValid === false && (
                <p className="text-sm text-red-600">
                  Invalid format. Use Google Analytics 4 format: G-XXXXXXXXXX
                </p>
              )}
              {trackingIdValid === true && (
                <p className="text-sm text-green-600">
                  Valid tracking ID format
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Find your tracking ID in Google Analytics → Admin → Data Streams → Your Stream
              </p>
            </div>

            <Separator />

            {/* Tracking Options */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Tracking Configuration</Label>
                <p className="text-sm text-muted-foreground">
                  Choose what events to track on your platform
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MousePointer className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label>Event Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Track button clicks, form submissions, and user interactions
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.eventTracking}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, eventTracking: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label>Scroll Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitor scroll depth and page engagement
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.scrollTracking}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, scrollTracking: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label>Form Submissions</Label>
                      <p className="text-sm text-muted-foreground">
                        Track form completions and conversion events
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.formTracking}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, formTracking: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Configuration Preview */}
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-base font-medium mb-2 block">Configuration Preview</Label>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Analytics Status:</span>
                  <span className={config.enabled ? "text-green-600" : "text-red-600"}>
                    {config.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                {config.enabled && (
                  <>
                    <div className="flex justify-between">
                      <span>Tracking ID:</span>
                      <span className="font-mono">
                        {config.trackingId ? `${config.trackingId.substring(0, 5)}...` : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Event Tracking:</span>
                      <span className={config.eventTracking ? "text-green-600" : "text-red-600"}>
                        {config.eventTracking ? "On" : "Off"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scroll Tracking:</span>
                      <span className={config.scrollTracking ? "text-green-600" : "text-red-600"}>
                        {config.scrollTracking ? "On" : "Off"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Form Tracking:</span>
                      <span className={config.formTracking ? "text-green-600" : "text-red-600"}>
                        {config.formTracking ? "On" : "Off"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={saveConfig}>
            Save Analytics Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsSettings;