import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, RefreshCw, Bell, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorHandlingConfig {
  enabled: boolean;
  retryAttempts: number;
  retryStrategy: 'immediate' | 'linear' | 'exponential';
  retryDelay: number; // Base delay in seconds
  maxRetryDelay: number; // Max delay for exponential backoff
  continueOnError: boolean;
  notifyOnError: boolean;
  notificationEmail?: string;
  fallbackAction?: 'skip' | 'rollback' | 'notify';
  errorLog: boolean;
}

interface WorkflowErrorHandlingProps {
  workflowId?: string;
  onSave?: (config: ErrorHandlingConfig) => void;
}

export function WorkflowErrorHandling({ workflowId, onSave }: WorkflowErrorHandlingProps) {
  const [config, setConfig] = useState<ErrorHandlingConfig>({
    enabled: true,
    retryAttempts: 3,
    retryStrategy: 'exponential',
    retryDelay: 5,
    maxRetryDelay: 300,
    continueOnError: false,
    notifyOnError: true,
    fallbackAction: 'notify',
    errorLog: true,
  });

  const updateConfig = (updates: Partial<ErrorHandlingConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const handleSave = () => {
    onSave?.(config);
    toast.success('Error handling configuration saved');
  };

  const calculateRetryDelays = () => {
    const delays: number[] = [];
    for (let i = 0; i < config.retryAttempts; i++) {
      let delay: number;
      switch (config.retryStrategy) {
        case 'immediate':
          delay = 0;
          break;
        case 'linear':
          delay = config.retryDelay * (i + 1);
          break;
        case 'exponential':
          delay = Math.min(config.retryDelay * Math.pow(2, i), config.maxRetryDelay);
          break;
        default:
          delay = config.retryDelay;
      }
      delays.push(delay);
    }
    return delays;
  };

  const delays = calculateRetryDelays();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Handling & Retry Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Error Handling */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Error Handling</Label>
              <p className="text-sm text-muted-foreground">
                Automatically handle errors and retry failed steps
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>

          {config.enabled && (
            <>
              {/* Retry Configuration */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4" />
                  <h4 className="font-medium">Retry Strategy</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retry-attempts">Maximum Retry Attempts</Label>
                    <Input
                      id="retry-attempts"
                      type="number"
                      min="0"
                      max="10"
                      value={config.retryAttempts}
                      onChange={(e) =>
                        updateConfig({ retryAttempts: parseInt(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of times to retry before giving up
                    </p>
                  </div>

                  <div>
                    <Label>Retry Strategy</Label>
                    <Select
                      value={config.retryStrategy}
                      onValueChange={(value: any) => updateConfig({ retryStrategy: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">
                          <div>
                            <div className="font-medium">Immediate</div>
                            <div className="text-xs text-muted-foreground">Retry instantly</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="linear">
                          <div>
                            <div className="font-medium">Linear Backoff</div>
                            <div className="text-xs text-muted-foreground">Fixed intervals</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="exponential">
                          <div>
                            <div className="font-medium">Exponential Backoff</div>
                            <div className="text-xs text-muted-foreground">Increasing delays</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retry-delay">Base Delay (seconds)</Label>
                    <Input
                      id="retry-delay"
                      type="number"
                      min="1"
                      max="60"
                      value={config.retryDelay}
                      onChange={(e) =>
                        updateConfig({ retryDelay: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>

                  {config.retryStrategy === 'exponential' && (
                    <div>
                      <Label htmlFor="max-delay">Max Delay (seconds)</Label>
                      <Input
                        id="max-delay"
                        type="number"
                        min="1"
                        max="3600"
                        value={config.maxRetryDelay}
                        onChange={(e) =>
                          updateConfig({ maxRetryDelay: parseInt(e.target.value) || 60 })
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Retry Preview */}
                {config.retryAttempts > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Retry Schedule Preview</h5>
                    <div className="space-y-1 text-xs">
                      {delays.map((delay, index) => (
                        <div key={index} className="flex justify-between">
                          <span>Attempt {index + 1}:</span>
                          <span className="font-mono">
                            {delay === 0
                              ? 'Immediate'
                              : delay < 60
                              ? `${delay}s`
                              : `${Math.floor(delay / 60)}m ${delay % 60}s`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Error Behavior */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4" />
                  <h4 className="font-medium">Error Behavior</h4>
                </div>

                <div>
                  <Label>Fallback Action</Label>
                  <Select
                    value={config.fallbackAction}
                    onValueChange={(value: any) => updateConfig({ fallbackAction: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">
                        <div>
                          <div className="font-medium">Skip Failed Step</div>
                          <div className="text-xs text-muted-foreground">
                            Continue with next step
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="rollback">
                        <div>
                          <div className="font-medium">Rollback Workflow</div>
                          <div className="text-xs text-muted-foreground">
                            Undo previous steps
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="notify">
                        <div>
                          <div className="font-medium">Notify & Stop</div>
                          <div className="text-xs text-muted-foreground">
                            Send alert and halt
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Continue on Error</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep running workflow even if a step fails
                    </p>
                  </div>
                  <Switch
                    checked={config.continueOnError}
                    onCheckedChange={(continueOnError) => updateConfig({ continueOnError })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Error Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Store detailed error logs for debugging
                    </p>
                  </div>
                  <Switch
                    checked={config.errorLog}
                    onCheckedChange={(errorLog) => updateConfig({ errorLog })}
                  />
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4" />
                  <h4 className="font-medium">Error Notifications</h4>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Notify on Error</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications when errors occur
                    </p>
                  </div>
                  <Switch
                    checked={config.notifyOnError}
                    onCheckedChange={(notifyOnError) => updateConfig({ notifyOnError })}
                  />
                </div>

                {config.notifyOnError && (
                  <div>
                    <Label htmlFor="notification-email">Notification Email</Label>
                    <Input
                      id="notification-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={config.notificationEmail || ''}
                      onChange={(e) =>
                        updateConfig({ notificationEmail: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Multiple emails separated by commas
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-4 border-t">
            <Button onClick={handleSave} className="w-full">
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Handling Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Error Handling:</span>
              <span className="font-medium">
                {config.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {config.enabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Retries:</span>
                  <span className="font-medium">{config.retryAttempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategy:</span>
                  <span className="font-medium capitalize">{config.retryStrategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fallback:</span>
                  <span className="font-medium capitalize">
                    {config.fallbackAction?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notifications:</span>
                  <span className="font-medium">
                    {config.notifyOnError ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
