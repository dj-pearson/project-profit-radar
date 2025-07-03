import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Users, 
  Clock, 
  AlertTriangle, 
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Resource {
  id: string;
  name: string;
  type: 'crew' | 'equipment';
  availability: string[];
}

interface ScheduleItem {
  id: string;
  project_id: string;
  project_name: string;
  resource_id: string;
  resource_name: string;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface Conflict {
  resource_id: string;
  resource_name: string;
  conflicting_items: ScheduleItem[];
}

const VisualScheduler = () => {
  const { userProfile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadResources();
      loadScheduleItems();
    }
  }, [userProfile?.company_id, selectedWeek]);

  useEffect(() => {
    detectConflicts();
  }, [scheduleItems]);

  const loadResources = async () => {
    // Simulate loading resources
    setResources([
      { id: '1', name: 'Construction Crew A', type: 'crew', availability: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      { id: '2', name: 'Construction Crew B', type: 'crew', availability: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      { id: '3', name: 'Excavator', type: 'equipment', availability: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
      { id: '4', name: 'Crane', type: 'equipment', availability: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    ]);
  };

  const loadScheduleItems = async () => {
    // Simulate loading schedule items for the selected week
    setScheduleItems([
      {
        id: '1',
        project_id: 'proj1',
        project_name: 'Kitchen Renovation',
        resource_id: '1',
        resource_name: 'Construction Crew A',
        start_date: '2024-01-15',
        end_date: '2024-01-17',
        status: 'scheduled'
      },
      {
        id: '2',
        project_id: 'proj2',
        project_name: 'Office Buildout',
        resource_id: '1',
        resource_name: 'Construction Crew A',
        start_date: '2024-01-16',
        end_date: '2024-01-18',
        status: 'scheduled'
      },
      {
        id: '3',
        project_id: 'proj3',
        project_name: 'Warehouse Construction',
        resource_id: '3',
        resource_name: 'Excavator',
        start_date: '2024-01-15',
        end_date: '2024-01-16',
        status: 'in_progress'
      }
    ]);
  };

  const detectConflicts = () => {
    const conflictMap = new Map<string, ScheduleItem[]>();
    
    scheduleItems.forEach(item => {
      const overlapping = scheduleItems.filter(other => 
        other.id !== item.id &&
        other.resource_id === item.resource_id &&
        new Date(other.start_date) <= new Date(item.end_date) &&
        new Date(other.end_date) >= new Date(item.start_date)
      );

      if (overlapping.length > 0) {
        const key = item.resource_id;
        if (!conflictMap.has(key)) {
          conflictMap.set(key, []);
        }
        conflictMap.get(key)?.push(item, ...overlapping);
      }
    });

    const conflictsArray = Array.from(conflictMap.entries()).map(([resourceId, items]) => ({
      resource_id: resourceId,
      resource_name: resources.find(r => r.id === resourceId)?.name || 'Unknown',
      conflicting_items: [...new Set(items)] // Remove duplicates
    }));

    setConflicts(conflictsArray);
  };

  const getWeekDays = () => {
    const start = new Date(selectedWeek);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const handleDragStart = (e: React.DragEvent, item: ScheduleItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetResourceId: string, targetDate: Date) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const updatedItems = scheduleItems.map(item => {
      if (item.id === draggedItem.id) {
        const daysDiff = Math.ceil((new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / (1000 * 3600 * 24));
        const newEndDate = new Date(targetDate);
        newEndDate.setDate(targetDate.getDate() + daysDiff);

        return {
          ...item,
          resource_id: targetResourceId,
          resource_name: resources.find(r => r.id === targetResourceId)?.name || '',
          start_date: targetDate.toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0]
        };
      }
      return item;
    });

    setScheduleItems(updatedItems);
    setDraggedItem(null);
    
    toast({
      title: "Schedule Updated",
      description: "Resource assignment has been updated.",
    });
  };

  const isItemInDay = (item: ScheduleItem, day: Date) => {
    const itemStart = new Date(item.start_date);
    const itemEnd = new Date(item.end_date);
    const dayStart = new Date(day);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59);

    return itemStart <= dayEnd && itemEnd >= dayStart;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in_progress': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const weekDays = getWeekDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Visual Resource Scheduler
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevWeek = new Date(selectedWeek);
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  setSelectedWeek(prevWeek);
                }}
              >
                Previous Week
              </Button>
              <span className="text-sm font-medium">
                Week of {weekDays[0].toLocaleDateString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextWeek = new Date(selectedWeek);
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setSelectedWeek(nextWeek);
                }}
              >
                Next Week
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Resource Conflicts Detected:</strong>
            <ul className="mt-2 space-y-1">
              {conflicts.map(conflict => (
                <li key={conflict.resource_id}>
                  {conflict.resource_name} has {conflict.conflicting_items.length} overlapping assignments
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Schedule Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 min-h-96">
            {/* Header Row */}
            <div className="border-r border-b p-4 bg-muted">
              <span className="font-medium">Resources</span>
            </div>
            {weekDays.map(day => (
              <div key={day.toISOString()} className="border-r border-b p-4 bg-muted text-center">
                <div className="font-medium">{day.toLocaleDateString('en', { weekday: 'short' })}</div>
                <div className="text-sm text-muted-foreground">{day.getDate()}</div>
              </div>
            ))}

            {/* Resource Rows */}
            {resources.map(resource => (
              <React.Fragment key={resource.id}>
                <div className="border-r border-b p-4 bg-background">
                  <div className="flex items-center gap-2">
                    {resource.type === 'crew' ? <Users className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    <span className="font-medium">{resource.name}</span>
                  </div>
                  <Badge variant="secondary" className="mt-1">
                    {resource.type}
                  </Badge>
                </div>
                {weekDays.map(day => (
                  <div
                    key={`${resource.id}-${day.toISOString()}`}
                    className="border-r border-b p-2 min-h-24 relative"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, resource.id, day)}
                  >
                    {scheduleItems
                      .filter(item => item.resource_id === resource.id && isItemInDay(item, day))
                      .map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          className={`p-2 rounded text-white text-xs cursor-move mb-1 ${getStatusColor(item.status)}`}
                        >
                          <div className="font-medium truncate">{item.project_name}</div>
                          <div className="opacity-75">{item.status}</div>
                        </div>
                      ))}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Completed</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Drag and drop schedule items to reassign resources or change dates
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualScheduler;