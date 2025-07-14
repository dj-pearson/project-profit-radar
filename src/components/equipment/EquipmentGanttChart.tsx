import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import EquipmentAssignmentForm from './EquipmentAssignmentForm';
import { useToast } from '@/hooks/use-toast';

interface EquipmentAssignment {
  assignment_id: string;
  equipment_id: string;
  equipment_name: string;
  project_id: string;
  project_name: string;
  assigned_quantity: number;
  start_date: string;
  end_date: string;
  assignment_status: string;
  days_duration: number;
}

interface EquipmentGanttChartProps {
  equipmentId?: string;
  projectId?: string;
  onAssignmentChange?: () => void;
}

const EquipmentGanttChart: React.FC<EquipmentGanttChartProps> = ({
  equipmentId,
  projectId,
  onAssignmentChange
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<EquipmentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<EquipmentAssignment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // Calculate view range (4 weeks)
  const startDate = startOfWeek(viewDate);
  const endDate = endOfWeek(addDays(viewDate, 21)); // 3 more weeks
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  useEffect(() => {
    loadAssignments();
  }, [userProfile?.company_id, equipmentId, projectId, viewDate]);

  const loadAssignments = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_equipment_schedule', {
          p_company_id: userProfile.company_id,
          p_equipment_id: equipmentId || null,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd')
        });

      if (error) throw error;

      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading equipment schedule:', error);
      toast({
        title: "Error",
        description: "Failed to load equipment schedule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('equipment_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Equipment assignment deleted successfully"
      });

      loadAssignments();
      onAssignmentChange?.();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete equipment assignment",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-500';
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getAssignmentPosition = (assignment: EquipmentAssignment) => {
    const assignmentStart = new Date(assignment.start_date);
    const assignmentEnd = new Date(assignment.end_date);
    
    const startOffset = differenceInDays(assignmentStart, startDate);
    const duration = differenceInDays(assignmentEnd, assignmentStart) + 1;
    
    const leftPercent = Math.max(0, (startOffset / days.length) * 100);
    const widthPercent = Math.min(100 - leftPercent, (duration / days.length) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`
    };
  };

  const groupedAssignments = assignments.reduce((groups, assignment) => {
    const key = equipmentId ? assignment.project_name : assignment.equipment_name;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(assignment);
    return groups;
  }, {} as Record<string, EquipmentAssignment[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Equipment Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDate(addDays(viewDate, -7))}
            >
              ← Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewDate(addDays(viewDate, 7))}
            >
              Week →
            </Button>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Equipment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedAssignment ? 'Edit Assignment' : 'New Equipment Assignment'}
                  </DialogTitle>
                </DialogHeader>
                <EquipmentAssignmentForm
                  assignment={selectedAssignment}
                  equipmentId={equipmentId}
                  projectId={projectId}
                  onSuccess={() => {
                    setShowForm(false);
                    setSelectedAssignment(null);
                    loadAssignments();
                    onAssignmentChange?.();
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setSelectedAssignment(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline Header */}
        <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
          <div className="font-medium text-sm">
            {equipmentId ? 'Project' : 'Equipment'}
          </div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day, index) => (
              <div
                key={index}
                className="text-xs text-center p-1 border-l border-border"
              >
                <div className="font-medium">{format(day, 'EEE')}</div>
                <div className="text-muted-foreground">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignment Rows */}
        <div className="space-y-2">
          {Object.keys(groupedAssignments).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No equipment assignments found for this period
            </div>
          ) : (
            Object.entries(groupedAssignments).map(([name, groupAssignments]) => (
              <div key={name} className="grid grid-cols-[200px_1fr] gap-4 items-center">
                <div className="font-medium text-sm truncate" title={name}>
                  {name}
                </div>
                <div className="relative h-12 border border-border rounded bg-muted/20">
                  {groupAssignments.map((assignment) => {
                    const position = getAssignmentPosition(assignment);
                    return (
                      <div
                        key={assignment.assignment_id}
                        className={`absolute top-1 h-10 rounded px-2 text-white text-xs flex items-center justify-between cursor-pointer ${getStatusColor(assignment.assignment_status)} hover:opacity-80`}
                        style={position}
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowForm(true);
                        }}
                        title={`${assignment.project_name || assignment.equipment_name} (${format(new Date(assignment.start_date), 'MMM d')} - ${format(new Date(assignment.end_date), 'MMM d')})`}
                      >
                        <span className="truncate flex-1">
                          {equipmentId ? assignment.project_name : assignment.equipment_name}
                        </span>
                        <div className="flex items-center gap-1 ml-2">
                          <Badge variant="secondary" className="text-xs px-1">
                            {assignment.assigned_quantity}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAssignment(assignment.assignment_id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Cancelled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentGanttChart;