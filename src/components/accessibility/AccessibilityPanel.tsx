import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Type, 
  Minus, 
  Plus, 
  Volume2, 
  VolumeX,
  Keyboard,
  Focus,
  RotateCcw,
  Accessibility,
  Monitor,
  Smartphone
} from 'lucide-react';
import { useAccessibility } from '@/hooks/useAccessibility';

export const AccessibilityPanel: React.FC = () => {
  const {
    settings,
    updateSetting,
    resetSettings,
    toggleHighContrast,
    toggleOutdoorMode,
    toggleScreenReader,
    increaseFontSize,
    decreaseFontSize,
    announceToScreenReader
  } = useAccessibility();

  const contrastModes = [
    { value: 'normal', label: 'Normal', icon: Monitor, description: 'Standard contrast for indoor use' },
    { value: 'high', label: 'High Contrast', icon: Eye, description: 'Enhanced contrast for better visibility' },
    { value: 'outdoor', label: 'Outdoor Mode', icon: Sun, description: 'Maximum contrast for bright outdoor conditions' },
  ];

  const fontSizes = [
    { value: 'normal', label: 'Normal', size: '16px' },
    { value: 'large', label: 'Large', size: '18px' },
    { value: 'extra-large', label: 'Extra Large', size: '20px' },
  ];

  const handleContrastChange = (mode: typeof settings.contrastMode) => {
    updateSetting('contrastMode', mode);
    announceToScreenReader(`Contrast mode changed to ${mode}`);
  };

  const handleFontSizeChange = (size: typeof settings.fontSize) => {
    updateSetting('fontSize', size);
    announceToScreenReader(`Font size changed to ${size}`);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5" />
          Accessibility Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize the interface to meet your accessibility needs
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Visual Accessibility */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visual Accessibility
          </h3>
          
          {/* Contrast Mode */}
          <div className="space-y-3 mb-4">
            <label className="text-sm font-medium">Display Contrast</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {contrastModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = settings.contrastMode === mode.value;
                
                return (
                  <Button
                    key={mode.value}
                    variant={isActive ? "default" : "outline"}
                    className="justify-start h-auto p-3"
                    onClick={() => handleContrastChange(mode.value as typeof settings.contrastMode)}
                    aria-pressed={isActive}
                    aria-describedby={`contrast-${mode.value}-desc`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{mode.label}</div>
                        <div 
                          id={`contrast-${mode.value}-desc`}
                          className="text-xs opacity-70"
                        >
                          {mode.description}
                        </div>
                      </div>
                      {isActive && (
                        <Badge variant="secondary" className="ml-auto">
                          Active
                        </Badge>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Text Size</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={decreaseFontSize}
                disabled={settings.fontSize === 'normal'}
                aria-label="Decrease font size"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 grid grid-cols-3 gap-1">
                {fontSizes.map((size) => {
                  const isActive = settings.fontSize === size.value;
                  return (
                    <Button
                      key={size.value}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFontSizeChange(size.value as typeof settings.fontSize)}
                      className="text-xs"
                      style={{ fontSize: size.size }}
                      aria-pressed={isActive}
                    >
                      {size.label}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={increaseFontSize}
                disabled={settings.fontSize === 'extra-large'}
                aria-label="Increase font size"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Screen Reader & Navigation */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Screen Reader & Navigation
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="screen-reader" className="text-sm font-medium">
                  Screen Reader Optimization
                </label>
                <p className="text-xs text-muted-foreground">
                  Enhanced descriptions and navigation cues
                </p>
              </div>
              <Switch
                id="screen-reader"
                checked={settings.screenReaderOptimized}
                onCheckedChange={toggleScreenReader}
                aria-describedby="screen-reader-desc"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="keyboard-nav" className="text-sm font-medium">
                  Enhanced Keyboard Navigation
                </label>
                <p className="text-xs text-muted-foreground">
                  Improved focus indicators and shortcuts
                </p>
              </div>
              <Switch
                id="keyboard-nav"
                checked={settings.keyboardNavigation}
                onCheckedChange={(checked) => updateSetting('keyboardNavigation', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="focus-indicators" className="text-sm font-medium">
                  Enhanced Focus Indicators
                </label>
                <p className="text-xs text-muted-foreground">
                  High-visibility focus outlines
                </p>
              </div>
              <Switch
                id="focus-indicators"
                checked={settings.focusIndicators}
                onCheckedChange={(checked) => updateSetting('focusIndicators', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Motion & Animation */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Motion & Animation
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="reduce-motion" className="text-sm font-medium">
                Reduce Motion
              </label>
              <p className="text-xs text-muted-foreground">
                Minimize animations and screen movement
              </p>
            </div>
            <Switch
              id="reduce-motion"
              checked={settings.motionPreference === 'reduced'}
              onCheckedChange={(checked) => 
                updateSetting('motionPreference', checked ? 'reduced' : 'normal')
              }
            />
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHighContrast}
            className="flex items-center gap-2"
          >
            {settings.contrastMode === 'high' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Toggle High Contrast
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleOutdoorMode}
            className="flex items-center gap-2"
          >
            <Sun className="h-4 w-4" />
            Outdoor Mode
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetSettings}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All
          </Button>
        </div>

        {/* Current Settings Summary */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">Current Settings</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Contrast: {settings.contrastMode}
            </Badge>
            <Badge variant="outline">
              Font: {settings.fontSize}
            </Badge>
            {settings.screenReaderOptimized && (
              <Badge variant="secondary">Screen Reader</Badge>
            )}
            {settings.motionPreference === 'reduced' && (
              <Badge variant="secondary">Reduced Motion</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};