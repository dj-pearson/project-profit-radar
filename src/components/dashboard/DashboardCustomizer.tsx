import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import {
  Building2,
  DollarSign,
  Users,
  Shield,
  Calendar,
  Cloud,
  Activity,
  BarChart3,
  Settings2,
  RotateCcw
} from 'lucide-react';

export interface DashboardWidgetConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  description: string;
}

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'kpis', label: 'KPI Cards', icon: <BarChart3 className="h-4 w-4" />, enabled: true, description: 'Key performance indicators for your role' },
  { id: 'projectHealth', label: 'Project Health', icon: <Building2 className="h-4 w-4" />, enabled: true, description: 'Active project status and health scores' },
  { id: 'alerts', label: 'Critical Alerts', icon: <Shield className="h-4 w-4" />, enabled: true, description: 'Budget overruns, schedule delays, safety issues' },
  { id: 'weather', label: 'Weather', icon: <Cloud className="h-4 w-4" />, enabled: true, description: 'Current weather conditions for job sites' },
  { id: 'quickActions', label: 'Quick Actions', icon: <Activity className="h-4 w-4" />, enabled: true, description: 'One-click shortcuts to common tasks' },
  { id: 'recentActivity', label: 'Recent Activity', icon: <Calendar className="h-4 w-4" />, enabled: true, description: 'Latest team actions and updates' },
];

const STORAGE_KEY = 'brikly-dashboard-widgets';

function loadWidgetConfig(): DashboardWidgetConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      return DEFAULT_WIDGETS.map((w) => ({
        ...w,
        enabled: parsed[w.id] !== undefined ? parsed[w.id] : w.enabled,
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_WIDGETS;
}

function saveWidgetConfig(widgets: DashboardWidgetConfig[]): void {
  const config: Record<string, boolean> = {};
  widgets.forEach((w) => { config[w.id] = w.enabled; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(loadWidgetConfig);

  const updateWidgets = useCallback((updated: DashboardWidgetConfig[]) => {
    setWidgets(updated);
    saveWidgetConfig(updated);
  }, []);

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  const isWidgetEnabled = useCallback((id: string) => {
    return widgets.find((w) => w.id === id)?.enabled ?? true;
  }, [widgets]);

  return { widgets, updateWidgets, resetToDefaults, isWidgetEnabled };
}

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidgetConfig[];
  onSave: (widgets: DashboardWidgetConfig[]) => void;
  onReset: () => void;
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  isOpen,
  onClose,
  widgets,
  onSave,
  onReset,
}) => {
  const [localWidgets, setLocalWidgets] = useState(widgets);

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  const toggleWidget = (id: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleSave = () => {
    onSave(localWidgets);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Dashboard"
      description="Choose which widgets to display on your dashboard."
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Layout</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {localWidgets.map((widget) => (
          <div
            key={widget.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">{widget.icon}</div>
              <div>
                <Label htmlFor={`widget-${widget.id}`} className="text-sm font-medium cursor-pointer">
                  {widget.label}
                </Label>
                <p className="text-xs text-muted-foreground">{widget.description}</p>
              </div>
            </div>
            <Switch
              id={`widget-${widget.id}`}
              checked={widget.enabled}
              onCheckedChange={() => toggleWidget(widget.id)}
              aria-label={`Toggle ${widget.label} widget`}
            />
          </div>
        ))}
      </div>
    </AccessibleModal>
  );
};
