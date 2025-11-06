import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Repeat, Globe, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMinutes, addHours, addDays, addWeeks } from 'date-fns';

interface WorkflowSchedulerProps {
  workflowId?: string;
  onSave?: (schedule: any) => void;
}

interface Schedule {
  id: string;
  type: 'once' | 'recurring' | 'cron';
  enabled: boolean;
  startDate?: Date;
  startTime?: string;
  timezone: string;
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  interval?: number;
  cronExpression?: string;
  nextRun?: Date;
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
];

const cronPresets = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Every 1st of month', value: '0 9 1 * *' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
];

export function WorkflowScheduler({ workflowId, onSave }: WorkflowSchedulerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleType, setScheduleType] = useState<'once' | 'recurring' | 'cron'>('recurring');

  const calculateNextRun = (schedule: Partial<Schedule>): Date => {
    const now = new Date();
    
    if (schedule.type === 'once') {
      if (schedule.startDate && schedule.startTime) {
        const [hours, minutes] = schedule.startTime.split(':').map(Number);
        const nextRun = new Date(schedule.startDate);
        nextRun.setHours(hours, minutes, 0, 0);
        return nextRun;
      }
      return now;
    }

    if (schedule.type === 'recurring' && schedule.frequency) {
      const interval = schedule.interval || 1;
      switch (schedule.frequency) {
        case 'hourly':
          return addHours(now, interval);
        case 'daily':
          return addDays(now, interval);
        case 'weekly':
          return addWeeks(now, interval);
        case 'monthly':
          return addDays(now, interval * 30);
        default:
          return now;
      }
    }

    return now;
  };

  const addSchedule = () => {
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      type: scheduleType,
      enabled: true,
      timezone: 'America/New_York',
      startDate: new Date(),
      startTime: '09:00',
      frequency: scheduleType === 'recurring' ? 'daily' : undefined,
      interval: 1,
      nextRun: undefined,
    };
    
    newSchedule.nextRun = calculateNextRun(newSchedule);
    setEditingSchedule(newSchedule);
  };

  const saveSchedule = () => {
    if (!editingSchedule) return;

    const updatedSchedule = {
      ...editingSchedule,
      nextRun: calculateNextRun(editingSchedule),
    };

    const existingIndex = schedules.findIndex(s => s.id === updatedSchedule.id);
    if (existingIndex >= 0) {
      const updated = [...schedules];
      updated[existingIndex] = updatedSchedule;
      setSchedules(updated);
    } else {
      setSchedules([...schedules, updatedSchedule]);
    }

    setEditingSchedule(null);
    toast.success('Schedule saved');
    onSave?.(updatedSchedule);
  };

  const deleteSchedule = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
    toast.success('Schedule deleted');
  };

  const toggleSchedule = (id: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  return (
    <div className="space-y-6">
      {/* Schedule List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Workflow Schedules</CardTitle>
          <Button onClick={addSchedule} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No schedules configured</p>
              <p className="text-sm">Add a schedule to run this workflow automatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                            {schedule.type}
                          </Badge>
                          <Badge variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            {timezones.find(tz => tz.value === schedule.timezone)?.label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          {schedule.type === 'once' && (
                            <p>
                              Runs once on {schedule.startDate && format(schedule.startDate, 'MMM d, yyyy')} at {schedule.startTime}
                            </p>
                          )}
                          
                          {schedule.type === 'recurring' && (
                            <p>
                              Runs every {schedule.interval} {schedule.frequency}
                              {schedule.startTime && ` at ${schedule.startTime}`}
                            </p>
                          )}
                          
                          {schedule.type === 'cron' && (
                            <p className="font-mono text-xs">
                              Cron: {schedule.cronExpression}
                            </p>
                          )}
                          
                          {schedule.nextRun && (
                            <p className="text-muted-foreground">
                              Next run: {format(schedule.nextRun, 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={() => toggleSchedule(schedule.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSchedule(schedule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Editor */}
      {editingSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>
              {schedules.find(s => s.id === editingSchedule.id) ? 'Edit' : 'Add'} Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Schedule Type</Label>
              <Select
                value={editingSchedule.type}
                onValueChange={(value: any) =>
                  setEditingSchedule({ ...editingSchedule, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Run Once
                    </div>
                  </SelectItem>
                  <SelectItem value="recurring">
                    <div className="flex items-center">
                      <Repeat className="h-4 w-4 mr-2" />
                      Recurring
                    </div>
                  </SelectItem>
                  <SelectItem value="cron">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Custom (Cron)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Timezone</Label>
              <Select
                value={editingSchedule.timezone}
                onValueChange={(value) =>
                  setEditingSchedule({ ...editingSchedule, timezone: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingSchedule.type === 'once' && (
              <>
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={editingSchedule.startDate ? format(editingSchedule.startDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        startDate: new Date(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="start-time">Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={editingSchedule.startTime}
                    onChange={(e) =>
                      setEditingSchedule({ ...editingSchedule, startTime: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {editingSchedule.type === 'recurring' && (
              <>
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={editingSchedule.frequency}
                    onValueChange={(value: any) =>
                      setEditingSchedule({ ...editingSchedule, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="interval">Repeat Every</Label>
                  <div className="flex gap-2">
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      value={editingSchedule.interval}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          interval: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <span className="flex items-center text-sm text-muted-foreground">
                      {editingSchedule.frequency}
                    </span>
                  </div>
                </div>
                {editingSchedule.frequency !== 'hourly' && (
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={editingSchedule.startTime}
                      onChange={(e) =>
                        setEditingSchedule({ ...editingSchedule, startTime: e.target.value })
                      }
                    />
                  </div>
                )}
              </>
            )}

            {editingSchedule.type === 'cron' && (
              <>
                <div>
                  <Label htmlFor="cron">Cron Expression</Label>
                  <Input
                    id="cron"
                    value={editingSchedule.cronExpression}
                    onChange={(e) =>
                      setEditingSchedule({ ...editingSchedule, cronExpression: e.target.value })
                    }
                    placeholder="0 9 * * *"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: minute hour day month weekday
                  </p>
                </div>
                <div>
                  <Label>Presets</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {cronPresets.map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditingSchedule({ ...editingSchedule, cronExpression: preset.value })
                        }
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Next Run Preview</p>
              <p className="text-sm text-muted-foreground">
                {format(calculateNextRun(editingSchedule), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveSchedule} className="flex-1">
                Save Schedule
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingSchedule(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
