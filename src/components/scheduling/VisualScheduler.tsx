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

interface VisualSchedulerProps {
  selectedDate: string;
  onAssignmentChange: () => void;
  companyId: string;
}

interface Resource {
  id: string;
  name: string;
  type: 'crew' | 'equipment';
  role: string;
  phone?: string;
}

interface ScheduleItem {
  id: string;
  project_id: string;
  project_name: string;
  resource_id: string;
  resource_name: string;
  assigned_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  notes?: string;
}

interface Conflict {
  resource_id: string;
  resource_name: string;
  conflicting_items: ScheduleItem[];
  conflict_type: 'time_overlap' | 'double_booking';
}

const VisualScheduler: React.FC<VisualSchedulerProps> = ({ selectedDate, onAssignmentChange, companyId }) => {
  const { userProfile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date(selectedDate));
  const [draggedItem, setDraggedItem] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    setSelectedWeek(new Date(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (companyId) {
      loadResources();
      loadScheduleItems();
    }
  }, [companyId, selectedWeek]);

  useEffect(() => {
    detectConflicts();
  }, [scheduleItems]);

  const loadResources = async () => {
    try {
      const { data: crewData, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role, phone')
        .eq('company_id', companyId)
        .in('role', ['field_supervisor', 'admin', 'project_manager'])
        .order('first_name');

      if (error) throw error;

      const formattedResources = (crewData || []).map(member => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        type: 'crew' as const,
        role: member.role,
        phone: member.phone
      }));

      setResources(formattedResources);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const loadScheduleItems = async () => {
    try {
      const weekStart = new Date(selectedWeek);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      const { data: assignmentsData, error } = await supabase
        .from('crew_assignments')
        .select(`
          *,
          projects(name),
          crew_member:user_profiles!crew_member_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .gte('assigned_date', weekStart.toISOString().split('T')[0])
        .lte('assigned_date', weekEnd.toISOString().split('T')[0])
        .order('assigned_date')
        .order('start_time');

      if (error) throw error;

      const formattedItems = (assignmentsData || []).map(assignment => ({
        id: assignment.id,
        project_id: assignment.project_id,
        project_name: assignment.projects?.name || 'Unknown Project',
        resource_id: assignment.crew_member_id,
        resource_name: `${assignment.crew_member?.first_name} ${assignment.crew_member?.last_name}`,
        assigned_date: assignment.assigned_date,
        start_time: assignment.start_time,
        end_time: assignment.end_time,
        status: assignment.status as 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled',
        location: assignment.location,
        notes: assignment.notes
      }));

      setScheduleItems(formattedItems);
    } catch (error) {
      console.error('Error loading schedule items:', error);
    }
  };

  const detectConflicts = () => {
    const conflictMap = new Map<string, { items: ScheduleItem[], type: string }>();
    
    scheduleItems.forEach(item => {
      const itemStart = new Date(`${item.assigned_date}T${item.start_time}`);
      const itemEnd = new Date(`${item.assigned_date}T${item.end_time}`);
      
      const overlapping = scheduleItems.filter(other => 
        other.id !== item.id &&
        other.resource_id === item.resource_id &&
        other.assigned_date === item.assigned_date &&
        new Date(`${other.assigned_date}T${other.start_time}`) < itemEnd &&
        new Date(`${other.assigned_date}T${other.end_time}`) > itemStart
      );

      if (overlapping.length > 0) {
        const key = `${item.resource_id}-${item.assigned_date}`;
        if (!conflictMap.has(key)) {
          conflictMap.set(key, { items: [], type: 'time_overlap' });
        }
        conflictMap.get(key)?.items.push(item, ...overlapping);
      }
    });

    const conflictsArray = Array.from(conflictMap.entries()).map(([key, data]) => {
      const resourceId = key.split('-')[0];
      return {
        resource_id: resourceId,
        resource_name: resources.find(r => r.id === resourceId)?.name || 'Unknown',
        conflicting_items: [...new Set(data.items)], // Remove duplicates
        conflict_type: data.type as 'time_overlap' | 'double_booking'
      };
    });

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

  const handleDrop = async (e: React.DragEvent, targetResourceId: string, targetDate: Date) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const targetDateStr = targetDate.toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('crew_assignments')
        .update({
          crew_member_id: targetResourceId,
          assigned_date: targetDateStr
        })
        .eq('id', draggedItem.id);

      if (error) throw error;

      setDraggedItem(null);
      
      toast({
        title: "Schedule Updated",
        description: "Resource assignment has been updated.",
      });

      // Reload data
      await loadScheduleItems();
      onAssignmentChange();
      
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update assignment.",
        variant: "destructive"
      });
    }
  };

  const isItemInDay = (item: ScheduleItem, day: Date) => {
    const itemDate = new Date(item.assigned_date);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return itemDate >= dayStart && itemDate <= dayEnd;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'dispatched': return 'bg-yellow-500';
      case 'in_progress': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
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
              <div key={resource.id} className="contents">
                <div className="border-r border-b p-4 bg-background">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <span className="font-medium">{resource.name}</span>
                      <div className="text-xs text-muted-foreground">{resource.role}</div>
                    </div>
                  </div>
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
                          className={`p-2 rounded text-white text-xs cursor-move mb-1 ${getStatusColor(item.status)} hover:opacity-80 transition-opacity`}
                          title={`${item.project_name} - ${item.start_time} to ${item.end_time}${item.notes ? `\n${item.notes}` : ''}`}
                        >
                          <div className="font-medium truncate">{item.project_name}</div>
                          <div className="opacity-75 text-xs">
                            {item.start_time} - {item.end_time}
                          </div>
                          <div className="opacity-75 text-xs capitalize">{item.status}</div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
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
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">Dispatched</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Cancelled</span>
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