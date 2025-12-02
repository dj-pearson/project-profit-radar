import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Resource {
  id: string;
  name: string;
  type: 'crew' | 'equipment' | 'vehicle';
  availability: 'available' | 'busy' | 'maintenance';
  skills: string[];
  location: string;
  currentProject?: string;
}

interface ScheduleItem {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskName: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  dependencies: string[];
}

export const ResourceSchedulingEngine: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([
    {
      id: '1',
      name: 'Construction Crew A',
      type: 'crew',
      availability: 'available',
      skills: ['framing', 'drywall', 'electrical'],
      location: 'Downtown Project Site',
    },
    {
      id: '2', 
      name: 'Excavator XL-200',
      type: 'equipment',
      availability: 'busy',
      skills: ['excavation', 'grading'],
      location: 'North Warehouse',
      currentProject: 'Residential Complex Phase 1'
    }
  ]);

  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    {
      id: '1',
      projectId: 'proj-1',
      projectName: 'Office Building Renovation',
      taskId: 'task-1',
      taskName: 'Foundation Work',
      resourceId: '1',
      startTime: new Date('2024-01-15T08:00:00'),
      endTime: new Date('2024-01-15T16:00:00'),
      status: 'in_progress',
      priority: 'high',
      location: 'Downtown Site A',
      dependencies: []
    }
  ]);

  const [selectedView, setSelectedView] = useState<'calendar' | 'list' | 'gantt'>('calendar');
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    // Detect scheduling conflicts
    detectConflicts();
  }, [schedule]);

  const detectConflicts = () => {
    const resourceConflicts: any[] = [];
    
    schedule.forEach((item1, index1) => {
      schedule.forEach((item2, index2) => {
        if (index1 < index2 && 
            item1.resourceId === item2.resourceId &&
            item1.startTime < item2.endTime && 
            item2.startTime < item1.endTime) {
          resourceConflicts.push({
            resource: item1.resourceId,
            conflictingTasks: [item1.taskName, item2.taskName],
            timeOverlap: { start: item1.startTime, end: item1.endTime }
          });
        }
      });
    });
    
    setConflicts(resourceConflicts);
  };

  const optimizeSchedule = () => {
    // AI-powered schedule optimization logic
    // This would contain algorithms to:
    // - Minimize travel time between sites
    // - Balance resource utilization
    // - Respect task dependencies
    // - Account for weather constraints
  };

  const renderCalendarView = () => (
    <div className="grid grid-cols-7 gap-2">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
        <div key={day} className="p-2 text-center font-medium border-b">
          {day}
        </div>
      ))}
      {Array.from({ length: 35 }, (_, i) => (
        <div key={i} className="p-2 h-20 border border-border/50 bg-card">
          {schedule
            .filter(item => new Date(item.startTime).getDate() === ((i % 7) + 1))
            .map(item => (
              <div key={item.id} className="text-xs p-1 mb-1 rounded bg-primary/10">
                {item.taskName}
              </div>
            ))
          }
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {schedule.map(item => (
        <Card key={item.id} className="p-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{item.taskName}</h4>
              <p className="text-sm text-muted-foreground">{item.projectName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">
                  {item.startTime.toLocaleTimeString()} - {item.endTime.toLocaleTimeString()}
                </span>
                <MapPin className="h-3 w-3 ml-2" />
                <span className="text-xs">{item.location}</span>
              </div>
            </div>
            <Badge variant={
              item.status === 'completed' ? 'default' :
              item.status === 'in_progress' ? 'secondary' :
              item.status === 'delayed' ? 'destructive' : 'outline'
            }>
              {item.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderResourceCard = (resource: Resource) => (
    <Card key={resource.id} className="p-3">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{resource.name}</h4>
        <Badge variant={
          resource.availability === 'available' ? 'default' :
          resource.availability === 'busy' ? 'secondary' : 'destructive'
        }>
          {resource.availability}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="text-xs capitalize">{resource.type}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="text-xs">{resource.location}</span>
        </div>
        {resource.currentProject && (
          <p className="text-xs text-muted-foreground">
            Current: {resource.currentProject}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {resource.skills.map(skill => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Resource Scheduling</h2>
          <p className="text-muted-foreground">
            Optimize crew deployment and equipment allocation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={optimizeSchedule} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Optimize Schedule
          </Button>
          <Select value={selectedView} onValueChange={(value) => setSelectedView(value as 'calendar' | 'list' | 'gantt')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calendar">Calendar</SelectItem>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="gantt">Gantt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">
                {conflicts.length} scheduling conflicts detected
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {conflicts.map((conflict, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  Resource conflict: {conflict.conflictingTasks.join(' vs ')}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Schedule View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule View
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedView === 'calendar' && renderCalendarView()}
              {selectedView === 'list' && renderListView()}
              {selectedView === 'gantt' && (
                <div className="p-8 text-center text-muted-foreground">
                  Gantt chart view coming soon
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resources Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Available Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resources.map(renderResourceCard)}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Active Crews</span>
                <Badge>3/5</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Equipment in Use</span>
                <Badge>7/12</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Efficiency Score</span>
                <Badge variant="secondary">87%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};