import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns';

interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  assignedTo: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface TimelineViewProps {
  projectId?: string;
}

const SortableTask: React.FC<{ task: Task; weekStart: Date; onTaskUpdate: (task: Task) => void }> = ({ 
  task, 
  weekStart, 
  onTaskUpdate 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 border-success text-success-foreground';
      case 'in_progress':
        return 'bg-primary/20 border-primary text-primary-foreground';
      case 'blocked':
        return 'bg-destructive/20 border-destructive text-destructive-foreground';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const taskWidth = Math.max(
    ((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) * 40,
    120
  );

  const taskLeft = ((task.startDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) * 40;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative p-3 rounded-lg border-2 cursor-move transition-colors ${getStatusColor(task.status)}`}
      data-task-left={taskLeft}
      data-task-width={taskWidth}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm truncate">{task.name}</h4>
        <Badge className={getPriorityColor(task.priority)} variant="secondary">
          {task.priority}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Calendar className="h-3 w-3" />
        <span>{format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="text-xs">{task.assignedTo.length}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-16 bg-background rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs font-medium">{task.progress}%</span>
        </div>
      </div>
      
      {task.status === 'blocked' && (
        <div className="absolute -top-1 -right-1">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
      )}
    </div>
  );
};

export const TimelineView: React.FC<TimelineViewProps> = ({ projectId }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      name: 'Foundation Excavation',
      startDate: new Date(),
      endDate: addDays(new Date(), 5),
      assignedTo: ['John Doe', 'Mike Smith'],
      status: 'in_progress',
      dependencies: [],
      progress: 75,
      priority: 'high'
    },
    {
      id: '2',
      name: 'Concrete Pour',
      startDate: addDays(new Date(), 6),
      endDate: addDays(new Date(), 8),
      assignedTo: ['Sarah Wilson'],
      status: 'not_started',
      dependencies: ['1'],
      progress: 0,
      priority: 'critical'
    },
    {
      id: '3',
      name: 'Framing',
      startDate: addDays(new Date(), 9),
      endDate: addDays(new Date(), 15),
      assignedTo: ['Tom Brown', 'Lisa Johnson'],
      status: 'not_started',
      dependencies: ['2'],
      progress: 0,
      priority: 'medium'
    }
  ]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Project Timeline
            </CardTitle>
            <CardDescription>
              Drag and drop to reschedule tasks • {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {/* Timeline Header */}
          <div className="flex border-b bg-muted/30">
            <div className="w-48 p-4 border-r font-medium">Tasks</div>
            {weekDays.map((day, index) => (
              <div key={index} className="min-w-[120px] p-4 border-r text-center">
                <div className="font-medium">{format(day, 'EEE')}</div>
                <div className="text-sm text-muted-foreground">{format(day, 'MMM dd')}</div>
              </div>
            ))}
          </div>
          
          {/* Timeline Content */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="relative">
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex border-b min-h-[80px]">
                    <div className="w-48 p-4 border-r">
                      <SortableTask 
                        task={task} 
                        weekStart={weekStart}
                        onTaskUpdate={handleTaskUpdate}
                      />
                    </div>
                    <div className="flex-1 relative">
                      {/* Timeline grid */}
                      {weekDays.map((_, dayIndex) => (
                        <div 
                          key={dayIndex} 
                          className="absolute top-0 bottom-0 border-r border-border/30"
                          style={{ left: `${dayIndex * 120}px`, width: '120px' }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        
        {/* Legend */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-success/20 border border-success" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20 border border-primary" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted border border-border" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive" />
              <span>Blocked</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};