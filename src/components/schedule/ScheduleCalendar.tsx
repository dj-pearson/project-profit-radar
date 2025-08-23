import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  completion_percentage: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  client_name?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'project_start' | 'project_end' | 'milestone' | 'deadline';
  project: Project;
}

interface ScheduleCalendarProps {
  projects: Project[];
  onDateRangeChange: (startDate: Date, endDate: Date, projectId: string) => void;
  selectedYear: number;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  projects,
  onDateRangeChange,
  selectedYear
}) => {
  const { userProfile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(selectedYear);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar events from projects and milestones
  const generateCalendarEvents = () => {
    const events: CalendarEvent[] = [];

    // Add project start and end dates
    projects.forEach(project => {
      // Project start
      events.push({
        id: `start-${project.id}`,
        title: `${project.name} - Start`,
        date: project.start_date,
        type: 'project_start',
        project,
      });

      // Project end
      events.push({
        id: `end-${project.id}`,
        title: `${project.name} - End`,
        date: project.end_date,
        type: 'project_end',
        project,
      });
    });

    // Add milestones
    milestones.forEach(milestone => {
      const relatedProject = projects.find(p => p.id === milestone.project_id);
      if (relatedProject) {
        events.push({
          id: `milestone-${milestone.id}`,
          title: milestone.name,
          date: milestone.target_date,
          type: 'milestone',
          project: relatedProject,
        });
      }
    });

    setCalendarEvents(events);
  };

  // Fetch milestones for the selected projects
  const fetchMilestones = async () => {
    if (!userProfile?.company_id || projects.length === 0) return;

    try {
      const projectIds = projects.map(p => p.id);
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .in('project_id', projectIds)
        .order('target_date');

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarEvents.filter(event => event.date === dateStr);
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    
    const grid = [];
    
    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDay + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const date = isCurrentMonth 
        ? new Date(currentYear, currentMonth, dayNumber)
        : new Date();
      
      const isToday = isCurrentMonth && 
        date.toDateString() === new Date().toDateString();
      
      const dayEvents = isCurrentMonth ? getEventsForDate(date) : [];
      
      grid.push({
        dayNumber: isCurrentMonth ? dayNumber : '',
        date,
        isCurrentMonth,
        isToday,
        events: dayEvents,
      });
    }
    
    return grid;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'project_start': return 'bg-green-100 text-green-700 border-green-200';
      case 'project_end': return 'bg-red-100 text-red-700 border-red-200';
      case 'milestone': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'deadline': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-green-500';
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [projects, userProfile?.company_id]);

  useEffect(() => {
    generateCalendarEvents();
  }, [projects, milestones]);

  useEffect(() => {
    setCurrentYear(selectedYear);
  }, [selectedYear]);

  const calendarGrid = generateCalendarGrid();

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {months[currentMonth]} {currentYear}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentMonth(new Date().getMonth());
              setCurrentYear(new Date().getFullYear());
            }}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
          <span>Project Start</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
          <span>Project End</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></div>
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1 rounded bg-red-500"></div>
          <span>Critical Priority</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(day => (
              <div 
                key={day} 
                className="p-2 text-center font-semibold text-sm text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, index) => (
              <div
                key={index}
                className={`
                  min-h-[100px] p-1 border border-border rounded-sm
                  ${cell.isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                  ${cell.isToday ? 'bg-primary/10 border-primary' : ''}
                `}
              >
                {cell.dayNumber && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${cell.isToday ? 'text-primary' : ''}`}>
                      {cell.dayNumber}
                    </div>
                    <div className="space-y-1">
                      {cell.events.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`
                            text-xs p-1 rounded border border-l-2
                            ${getEventTypeColor(event.type)}
                            ${getPriorityColor(event.project.priority)}
                            truncate cursor-pointer
                          `}
                          title={`${event.title} - ${event.project.client_name || 'No client'}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {cell.events.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{cell.events.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This Month's Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {calendarEvents
                .filter(event => {
                  const eventDate = new Date(event.date);
                  return eventDate.getMonth() === currentMonth && 
                         eventDate.getFullYear() === currentYear;
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map(event => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between p-2 bg-card border rounded"
                  >
                    <div>
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {event.project.client_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getEventTypeColor(event.type)}>
                        {event.type.replace('_', ' ')}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              {calendarEvents.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getMonth() === currentMonth && 
                       eventDate.getFullYear() === currentYear;
              }).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events scheduled for this month
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {milestones
                .filter(milestone => {
                  const milestoneDate = new Date(milestone.target_date);
                  return milestoneDate >= new Date() && milestone.status === 'pending';
                })
                .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
                .slice(0, 5)
                .map(milestone => {
                  const project = projects.find(p => p.id === milestone.project_id);
                  return (
                    <div 
                      key={milestone.id} 
                      className="flex items-center justify-between p-2 bg-card border rounded"
                    >
                      <div>
                        <div className="font-medium text-sm">{milestone.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project?.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                          {milestone.milestone_type}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(milestone.target_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {milestones.filter(m => new Date(m.target_date) >= new Date() && m.status === 'pending').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming milestones
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScheduleCalendar;