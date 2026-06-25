/**
 * Weekly crew scheduling board (US-106).
 *
 * Rows = crew members, columns = days of the week. Assignments render as
 * colored blocks; drag-and-drop moves an assignment to another day/crew member
 * (persisted to crew_assignments). Double-bookings are highlighted red and an
 * unassigned-crew sidebar lists idle members. company_id-scoped (RLS).
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, AlertTriangle, Users } from 'lucide-react';
import {
  buildCrewWeek,
  startOfWeek,
  getWeekDays,
  addWeeks,
  type BoardCrewMember,
  type BoardAssignment,
} from '@/lib/scheduling/crewBoard';

const CREW_ROLES = [
  'admin', 'superintendent', 'project_manager', 'foreman', 'field_supervisor',
  'technician', 'equipment_operator', 'journeyman', 'apprentice', 'laborer',
];

// Stable color per project for the assignment blocks.
const BLOCK_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-900',
  'bg-green-100 border-green-300 text-green-900',
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-amber-100 border-amber-300 text-amber-900',
  'bg-pink-100 border-pink-300 text-pink-900',
  'bg-teal-100 border-teal-300 text-teal-900',
];
function colorForProject(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) hash = (hash * 31 + projectId.charCodeAt(i)) | 0;
  return BLOCK_COLORS[Math.abs(hash) % BLOCK_COLORS.length];
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CrewScheduleBoard() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayIso()));

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const { data, isLoading } = useQuery({
    queryKey: ['crew-board', companyId, weekStart],
    enabled: !!companyId,
    queryFn: async () => {
      const [crewRes, assignmentsRes, projectsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, first_name, last_name, role')
          .eq('company_id', companyId)
          .in('role', CREW_ROLES)
          .eq('is_active', true)
          .order('first_name'),
        supabase
          .from('crew_assignments')
          .select('id, crew_member_id, project_id, assigned_date, start_time, end_time, status')
          .eq('company_id', companyId)
          .gte('assigned_date', weekDays[0])
          .lte('assigned_date', weekDays[6]),
        supabase.from('projects').select('id, name').eq('company_id', companyId),
      ]);
      if (crewRes.error) throw crewRes.error;

      const projectNames = new Map(
        ((projectsRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
      );
      const crew: BoardCrewMember[] = ((crewRes.data ?? []) as {
        id: string; first_name: string | null; last_name: string | null; role: string | null;
      }[]).map((m) => ({
        id: m.id,
        name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Unnamed',
        role: m.role,
      }));
      const assignments: BoardAssignment[] = ((assignmentsRes.data ?? []) as BoardAssignment[]).map((a) => ({
        ...a,
        project_name: projectNames.get(a.project_id) ?? 'Project',
      }));
      return { crew, assignments };
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (vars: { id: string; crew_member_id: string; assigned_date: string }) => {
      const { error } = await supabase
        .from('crew_assignments')
        .update({ crew_member_id: vars.crew_member_id, assigned_date: vars.assigned_date })
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-board', companyId, weekStart] });
    },
    onError: (e: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Could not move assignment',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    },
  });

  const board = useMemo(
    () => (data ? buildCrewWeek({ crew: data.crew, assignments: data.assignments, weekStart }) : null),
    [data, weekStart]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !board) return;
    const [crewMemberId, assignedDate] = result.destination.droppableId.split('__');
    const [srcMember, srcDate] = result.source.droppableId.split('__');
    if (crewMemberId === srcMember && assignedDate === srcDate) return;
    moveMutation.mutate({ id: result.draggableId, crew_member_id: crewMemberId, assigned_date: assignedDate });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, -1))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(todayIso()))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            Week of {new Date(weekDays[0] + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
        {board && board.conflicts.size > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {board.conflicts.size} conflict(s)
          </Badge>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Board grid */}
          <Card className="lg:col-span-3 overflow-x-auto">
            <CardContent className="p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium w-40 sticky left-0 bg-background">Crew</th>
                    {weekDays.map((day, i) => (
                      <th key={day} className="p-2 text-center font-medium min-w-[120px]">
                        <div>{DOW[i]}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {new Date(day + 'T00:00:00Z').getUTCDate()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {board?.rows.map((row) => (
                    <tr key={row.member.id} className="border-b last:border-0">
                      <td className="p-2 align-top font-medium sticky left-0 bg-background">
                        <div>{row.member.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {row.member.role?.replace(/_/g, ' ')}
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const droppableId = `${row.member.id}__${day}`;
                        return (
                          <td key={day} className="p-1 align-top">
                            <Droppable droppableId={droppableId}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`min-h-[56px] rounded p-1 space-y-1 transition-colors ${
                                    snapshot.isDraggingOver ? 'bg-muted/60' : 'bg-muted/10'
                                  }`}
                                >
                                  {row.cellsByDate[day].map((a, index) => {
                                    const conflicted = board.conflicts.has(a.id);
                                    return (
                                      <Draggable key={a.id} draggableId={a.id} index={index}>
                                        {(dp) => (
                                          <div
                                            ref={dp.innerRef}
                                            {...dp.draggableProps}
                                            {...dp.dragHandleProps}
                                            className={`rounded border px-2 py-1 text-xs cursor-grab ${
                                              conflicted
                                                ? 'bg-red-100 border-red-400 text-red-900 ring-1 ring-red-400'
                                                : colorForProject(a.project_id)
                                            }`}
                                            title={conflicted ? 'Double-booked' : undefined}
                                          >
                                            <div className="font-medium truncate">{a.project_name}</div>
                                            <div className="opacity-75">
                                              {a.start_time?.slice(0, 5)}–{a.end_time?.slice(0, 5)}
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Unassigned crew sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Unassigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!board || board.unassignedCrew.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everyone has assignments this week.</p>
              ) : (
                <ul className="space-y-2">
                  {board.unassignedCrew.map((m) => (
                    <li key={m.id} className="rounded border p-2 text-sm">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {m.role?.replace(/_/g, ' ')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </DragDropContext>
    </div>
  );
}

export default CrewScheduleBoard;
