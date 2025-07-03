import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Settings, Activity, Calendar, File } from 'lucide-react';

interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time: string;
  enabled: boolean;
  lastRun: string;
  nextRun: string;
  retention: number; // days
  type: 'full' | 'incremental' | 'differential';
}

interface BackupRecord {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental' | 'differential';
  size: string;
  duration: number;
  status: 'completed' | 'failed' | 'running';
  location: string;
  compressed: boolean;
}

interface RestorePoint {
  id: string;
  timestamp: string;
  type: 'scheduled' | 'manual' | 'before_migration';
  description: string;
  size: string;
  canRestore: boolean;
}

const BackupRecoverySystem = () => {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    frequency: 'daily' as const,
    time: '02:00',
    retention: 30,
    type: 'full' as const
  });

  const mockSchedules: BackupSchedule[] = [
    {
      id: '1',
      name: 'Daily Full Backup',
      frequency: 'daily',
      time: '02:00',
      enabled: true,
      lastRun: new Date(Date.now() - 24 * 3600000).toISOString(),
      nextRun: new Date(Date.now() + 2 * 3600000).toISOString(),
      retention: 30,
      type: 'full'
    },
    {
      id: '2',
      name: 'Hourly Incremental',
      frequency: 'hourly',
      time: '00',
      enabled: true,
      lastRun: new Date(Date.now() - 3600000).toISOString(),
      nextRun: new Date(Date.now() + 600000).toISOString(),
      retention: 7,
      type: 'incremental'
    },
    {
      id: '3',
      name: 'Weekly Archive',
      frequency: 'weekly',
      time: '01:00',
      enabled: true,
      lastRun: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
      nextRun: new Date(Date.now() + 6 * 24 * 3600000).toISOString(),
      retention: 365,
      type: 'full'
    }
  ];

  const mockBackups: BackupRecord[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'incremental',
      size: '127 MB',
      duration: 45,
      status: 'completed',
      location: 's3://builddesk-backups/2024/12/03/backup-001.sql.gz',
      compressed: true
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      type: 'full',
      size: '2.8 GB',
      duration: 1847,
      status: 'completed',
      location: 's3://builddesk-backups/2024/12/02/backup-full.sql.gz',
      compressed: true
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
      type: 'full',
      size: '2.7 GB',
      duration: 1732,
      status: 'completed',
      location: 's3://builddesk-backups/2024/12/01/backup-full.sql.gz',
      compressed: true
    }
  ];

  const mockRestorePoints: RestorePoint[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'scheduled',
      description: 'Hourly automatic backup',
      size: '127 MB',
      canRestore: true
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      type: 'before_migration',
      description: 'Before database migration v1.2.3',
      size: '2.8 GB',
      canRestore: true
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
      type: 'manual',
      description: 'Before major feature deployment',
      size: '2.6 GB',
      canRestore: true
    }
  ];

  useEffect(() => {
    setSchedules(mockSchedules);
    setBackups(mockBackups);
    setRestorePoints(mockRestorePoints);
  }, []);

  const startManualBackup = async (type: 'full' | 'incremental' = 'full') => {
    setIsBackingUp(true);
    setBackupProgress(0);

    toast({
      title: "Backup Started",
      description: `Starting ${type} backup...`
    });

    // Simulate backup progress
    const progressInterval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    // Simulate backup completion
    setTimeout(() => {
      clearInterval(progressInterval);
      setBackupProgress(100);
      
      const newBackup: BackupRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type,
        size: type === 'full' ? '2.9 GB' : '134 MB',
        duration: type === 'full' ? 1823 : 52,
        status: 'completed',
        location: `s3://builddesk-backups/${new Date().toISOString().split('T')[0]}/manual-backup.sql.gz`,
        compressed: true
      };

      setBackups(prev => [newBackup, ...prev]);
      setIsBackingUp(false);
      setBackupProgress(0);

      toast({
        title: "Backup Complete",
        description: `${type} backup completed successfully`
      });
    }, 8000);
  };

  const restoreFromPoint = async (restorePoint: RestorePoint) => {
    setIsRestoring(true);

    toast({
      title: "Restore Started",
      description: "Initiating point-in-time recovery..."
    });

    // Simulate restore process
    setTimeout(() => {
      setIsRestoring(false);
      toast({
        title: "Restore Complete",
        description: `Database restored to ${new Date(restorePoint.timestamp).toLocaleString()}`
      });
    }, 12000);
  };

  const toggleSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === scheduleId 
        ? { ...schedule, enabled: !schedule.enabled }
        : schedule
    ));

    toast({
      title: "Schedule Updated",
      description: "Backup schedule has been updated"
    });
  };

  const createSchedule = () => {
    if (!newSchedule.name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a schedule name"
      });
      return;
    }

    const schedule: BackupSchedule = {
      id: Date.now().toString(),
      ...newSchedule,
      enabled: true,
      lastRun: '',
      nextRun: new Date(Date.now() + 3600000).toISOString()
    };

    setSchedules(prev => [...prev, schedule]);
    setNewSchedule({
      name: '',
      frequency: 'daily',
      time: '02:00',
      retention: 30,
      type: 'full'
    });

    toast({
      title: "Schedule Created",
      description: "New backup schedule has been created"
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      full: 'bg-blue-100 text-blue-800',
      incremental: 'bg-green-100 text-green-800',
      differential: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-gray-100 text-gray-800',
      manual: 'bg-purple-100 text-purple-800',
      before_migration: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <File className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Backup & Recovery</h2>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => startManualBackup('incremental')}
            disabled={isBackingUp}
          >
            Incremental Backup
          </Button>
          <Button 
            onClick={() => startManualBackup('full')}
            disabled={isBackingUp}
          >
            Full Backup
          </Button>
        </div>
      </div>

      {(isBackingUp || isRestoring) && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{isBackingUp ? 'Creating backup...' : 'Restoring database...'}</span>
                <span>{isBackingUp ? `${Math.round(backupProgress)}%` : 'In progress...'}</span>
              </div>
              {isBackingUp && <Progress value={backupProgress} />}
              {isRestoring && <Progress value={75} className="animate-pulse" />}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="schedules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="backups">Backup History</TabsTrigger>
          <TabsTrigger value="restore">Restore Points</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          {/* Active Schedules */}
          <Card>
            <CardHeader>
              <CardTitle>Backup Schedules</CardTitle>
              <CardDescription>
                Manage automated backup schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{schedule.name}</h4>
                      <Badge className={getTypeColor(schedule.type)}>
                        {schedule.type}
                      </Badge>
                      <Badge variant="outline">
                        {schedule.frequency}
                      </Badge>
                    </div>
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={() => toggleSchedule(schedule.id)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Schedule: </span>
                      {schedule.frequency} at {schedule.time}
                    </div>
                    <div>
                      <span className="font-medium">Next Run: </span>
                      {new Date(schedule.nextRun).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Retention: </span>
                      {schedule.retention} days
                    </div>
                  </div>
                  
                  {schedule.lastRun && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Last run: {new Date(schedule.lastRun).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Create New Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Schedule</CardTitle>
              <CardDescription>
                Set up a new automated backup schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schedule-name">Schedule Name</Label>
                  <Input
                    id="schedule-name"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({...newSchedule, name: e.target.value})}
                    placeholder="e.g., Weekly Archive"
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select 
                    value={newSchedule.frequency} 
                    onValueChange={(value: any) => setNewSchedule({...newSchedule, frequency: value})}
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
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="backup-type">Backup Type</Label>
                  <Select 
                    value={newSchedule.type} 
                    onValueChange={(value: any) => setNewSchedule({...newSchedule, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="incremental">Incremental</SelectItem>
                      <SelectItem value="differential">Differential</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="retention">Retention Period (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  value={newSchedule.retention}
                  onChange={(e) => setNewSchedule({...newSchedule, retention: parseInt(e.target.value)})}
                  min="1"
                  max="365"
                />
              </div>
              <Button onClick={createSchedule}>Create Schedule</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          {/* Backup History */}
          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>
                Recent backup records and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div key={backup.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getTypeColor(backup.type)}>
                          {backup.type}
                        </Badge>
                        <Badge className={getStatusColor(backup.status)}>
                          {backup.status}
                        </Badge>
                        <span className="text-sm font-medium">{backup.size}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(backup.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-1">
                      Duration: {formatDuration(backup.duration)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground font-mono">
                      {backup.location}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restore" className="space-y-4">
          {/* Point-in-Time Recovery */}
          <Card>
            <CardHeader>
              <CardTitle>Point-in-Time Recovery</CardTitle>
              <CardDescription>
                Restore database to a specific point in time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {restorePoints.map((point) => (
                  <div key={point.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">
                          {new Date(point.timestamp).toLocaleString()}
                        </h4>
                        <Badge className={getTypeColor(point.type)}>
                          {point.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{point.size}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreFromPoint(point)}
                        disabled={!point.canRestore || isRestoring}
                      >
                        Restore
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{point.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Backup Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Storage Settings</CardTitle>
                <CardDescription>
                  Configure backup storage and retention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="storage-location">Storage Location</Label>
                  <Select defaultValue="s3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                      <SelectItem value="azure">Azure Blob Storage</SelectItem>
                      <SelectItem value="local">Local Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="compression">Enable Compression</Label>
                  <Switch id="compression" defaultChecked />
                </div>
                <div>
                  <Label htmlFor="encryption">Enable Encryption</Label>
                  <Switch id="encryption" defaultChecked />
                </div>
                <div>
                  <Label htmlFor="global-retention">Global Retention (days)</Label>
                  <Input id="global-retention" type="number" defaultValue="90" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure backup notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="success-notifications">Success Notifications</Label>
                  <Switch id="success-notifications" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="failure-notifications">Failure Notifications</Label>
                  <Switch id="failure-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  <Switch id="weekly-reports" defaultChecked />
                </div>
                <div>
                  <Label htmlFor="notification-email">Notification Email</Label>
                  <Input 
                    id="notification-email" 
                    type="email" 
                    placeholder="admin@builddesk.com" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupRecoverySystem;