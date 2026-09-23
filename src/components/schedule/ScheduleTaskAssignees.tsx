/**
 * Put a crew on a scheduled task (US-329).
 *
 * schedule_tasks had no assignee at all, so the Gantt could be perfect and
 * nobody on the crew would learn of it. crew_assignments existed as a separate
 * day board with no link back, and its arrival_notification_sent column had
 * never been set by anything, because nothing sent an arrival notification.
 *
 * Assigning here writes one row. The database does the rest: it generates the
 * crew_assignments row for the day board and notifies the person through
 * real_time_notifications, which is what the notification centre reads. Doing
 * it in a trigger rather than here is deliberate - assignment also happens from
 * a schedule import and from whatever iOS grows, and the crew must be told
 * regardless of which path was used.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  useScheduleTaskAssignees,
  type ScheduleAssigneeRow,
  type ScheduleCrewMember,
} from '@/hooks/useScheduleTaskAssignees';
import { UserPlus, X, Check } from 'lucide-react';
import { useRoleCheck, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { confirmAction } from "@/components/ui/confirm-dialog";

type CrewMember = ScheduleCrewMember;
type AssigneeRow = ScheduleAssigneeRow;

interface ScheduleTaskAssigneesProps {
  scheduleTaskId: string;
  projectId: string;
  onChanged?: () => void;
}

const displayName = (m: CrewMember) =>
  [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || 'Unnamed';

export function ScheduleTaskAssignees({
  scheduleTaskId, projectId, onChanged,
}: ScheduleTaskAssigneesProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  // crew_assignments has restricted writes to these roles since 20250706012036,
  // and schedule_task_assignees now matches. Office staff and accounting can
  // see who is on what; showing them a button the database will refuse is worse
  // than not showing it.
  const { hasAccess: canAssign } = useRoleCheck(ROLE_GROUPS.CREW_SCHEDULERS);

  const {
    crew, assignees, error: loadError, refetch,
    assign: assignCrew, unassign: unassignCrew,
  } = useScheduleTaskAssignees(scheduleTaskId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const assign = async (member: CrewMember) => {
    if (!userProfile?.company_id) return;
    setSaving(true);
    try {
      await assignCrew({
        scheduleTaskId,
        projectId,
        companyId: userProfile.company_id,
        crewMemberId: member.id,
        createdBy: userProfile.id,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Could not put ${displayName(member)} on this task`,
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    } finally {
      setSaving(false);
      setOpen(false);
    }
    toast({
      title: `${displayName(member)} is scheduled`,
      description: 'They have been notified and it is on the crew board.',
    });
    onChanged?.();
  };

  const unassign = async (row: AssigneeRow, name: string) => {
    if (!(await confirmAction({ title: `Remove ${name} from this task?`, confirmLabel: 'Remove', destructive: true }))) return;
    setSaving(true);
    try {
      await unassignCrew(row.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Could not take ${name} off this task`,
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    } finally {
      setSaving(false);
    }
    onChanged?.();
  };

  if (loadError) {
    // A failed read used to render as "Nobody assigned".
    return (
      <div className="flex items-center gap-2 text-xs text-destructive" role="alert">
        Could not load who is on this task.
        <Button type="button" variant="ghost" size="sm" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  const assigned = new Set(assignees.map((a) => a.crew_member_id));
  const nameOf = (id: string) => {
    const member = crew.find((m) => m.id === id);
    return member ? displayName(member) : 'Crew member';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {assignees.map((row) => (
        <Badge key={row.id} variant="secondary" className="gap-1 pr-1">
          {nameOf(row.crew_member_id)}
          {canAssign && <button
            type="button"
            aria-label={`Remove ${nameOf(row.crew_member_id)} from this task`}
            className="rounded-sm hover:bg-muted p-0.5"
            disabled={saving}
            onClick={() => unassign(row, nameOf(row.crew_member_id))}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>}
        </Badge>
      ))}

      {!canAssign && assignees.length === 0 && (
        <span className="text-xs text-muted-foreground">Nobody assigned</span>
      )}

      {canAssign && <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" disabled={saving}>
            <UserPlus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Assign
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search the crew..." />
            <CommandList>
              <CommandEmpty>Nobody by that name.</CommandEmpty>
              <CommandGroup>
                {crew.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={displayName(member)}
                    disabled={assigned.has(member.id)}
                    onSelect={() => !assigned.has(member.id) && assign(member)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${assigned.has(member.id) ? 'opacity-100' : 'opacity-0'}`}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col">
                      <span>{displayName(member)}</span>
                      {member.role && (
                        <span className="text-xs text-muted-foreground">
                          {member.role.replace('_', ' ')}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>}
    </div>
  );
}

export default ScheduleTaskAssignees;
