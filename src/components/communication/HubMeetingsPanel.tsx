import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarDays, Edit, ExternalLink, MapPin, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { ListSkeleton } from '@/components/ui/skeletons';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { ErrorState } from '@/components/common/ErrorState';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents';
import { formatDateTime } from '@/lib/format';
import {
  buildMeetingEvent,
  meetingDefaults,
  meetingFormSchema,
  type MeetingFormValues,
} from '@/lib/validations/communication';

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const TIME_ONLY: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

interface HubMeetingsPanelProps {
  /** '' means every project. */
  projectId: string;
  projects: { id: string; name: string }[];
}

/**
 * The Communication Hub's Meetings tab (US-313), folded into /calendar rather
 * than given a table of its own: a meeting is a project_calendar_events row
 * with event_type 'meeting', so it appears on the calendar and anything
 * scheduled there as a meeting appears here.
 */
export function HubMeetingsPanel({ projectId, projects }: HubMeetingsPanelProps) {
  const { events, loading, error, refetch, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const meetings = events
    .filter((e) => e.type === 'meeting' && e.editable && (!projectId || e.projectId === projectId))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const now = Date.now();
  const upcoming = meetings.filter((m) => (m.end ?? m.start).getTime() >= now);
  const past = meetings.filter((m) => (m.end ?? m.start).getTime() < now).reverse();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const renderMeeting = (m: CalendarEvent) => (
    <li key={m.id} className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{m.title}</p>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(m.start)}
          {m.end ? ` to ${formatDateTime(m.end, TIME_ONLY)}` : ''}
          {!projectId && m.projectId && projectName.get(m.projectId) ? ` - ${projectName.get(m.projectId)}` : ''}
        </p>
        {m.location && (
          <p className="text-sm flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {m.location}
          </p>
        )}
        {m.description && <p className="text-sm whitespace-pre-line">{m.description}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setEditing(m);
          setFormOpen(true);
        }}
      >
        <Edit className="h-3 w-3 mr-1" aria-hidden="true" />
        Edit
      </Button>
    </li>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Meetings</CardTitle>
          <CardDescription>
            Meetings live on the project calendar; scheduling one here puts it there too.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/calendar">
              <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
              Calendar
            </Link>
          </Button>
          <Button size="sm" onClick={openCreate} disabled={projects.length === 0}>
            <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Schedule meeting
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <ListSkeleton items={3} label="Loading meetings" />
        ) : error ? (
          <ErrorState inline title="Meetings could not be loaded" error={error} onRetry={() => { void refetch(); }} />
        ) : meetings.length === 0 ? (
          <div className="py-8 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-muted-foreground">
              {projectId ? 'No meetings on this project yet.' : 'No meetings scheduled yet.'}
            </p>
          </div>
        ) : (
          <>
            <section aria-labelledby="meetings-upcoming">
              <h3 id="meetings-upcoming" className="font-medium mb-2">Upcoming</h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled ahead.</p>
              ) : (
                <ul className="divide-y">{upcoming.map(renderMeeting)}</ul>
              )}
            </section>
            {past.length > 0 && (
              <section aria-labelledby="meetings-past">
                <h3 id="meetings-past" className="font-medium mb-2">Past</h3>
                <ul className="divide-y">{past.map(renderMeeting)}</ul>
              </section>
            )}
          </>
        )}
      </CardContent>

      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        meeting={editing}
        projectId={projectId}
        projects={projects}
        onSubmit={async (values) => {
          const event = buildMeetingEvent(values);
          if (editing) await updateEvent(editing.id, event);
          else await createEvent(event);
        }}
        onDelete={editing ? () => deleteEvent(editing.id) : undefined}
      />
    </Card>
  );
}

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: CalendarEvent | null;
  projectId: string;
  projects: { id: string; name: string }[];
  onSubmit: (values: MeetingFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function MeetingFormDialog({ open, onOpenChange, meeting, projectId, projects, onSubmit, onDelete }: MeetingFormDialogProps) {
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: meetingDefaults(projectId),
  });
  const { reset } = form;
  const wasOpen = useRef(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && !wasOpen.current) reset(meetingDefaults(projectId, meeting));
    wasOpen.current = open;
  }, [open, meeting, projectId, reset]);

  const submit = async (values: MeetingFormValues) => {
    try {
      await onSubmit(values);
      toast.success(meeting ? 'Meeting updated' : 'Meeting scheduled');
      onOpenChange(false);
    } catch (e) {
      toast.error(meeting ? 'Meeting not updated' : 'Meeting not scheduled', {
        description: errorText(e, 'Failed to save the meeting'),
      });
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      toast.success('Meeting deleted');
      onOpenChange(false);
    } catch (e) {
      toast.error('Meeting not deleted', { description: errorText(e, 'Failed to delete the meeting') });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{meeting ? 'Edit meeting' : 'Schedule a meeting'}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Saved to the project calendar. Use the agenda for who is expected and what to cover.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4 px-4 pb-4 sm:px-0 sm:pb-0" aria-label="Meeting form">
            <InputFormField control={form.control} name="title" label="Title" placeholder="OAC meeting" aria-required="true" />
            <SelectFormField
              control={form.control}
              name="project_id"
              label="Project"
              placeholder="Select project"
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputFormField control={form.control} name="date" label="Date" type="date" aria-required="true" />
              <InputFormField control={form.control} name="start_time" label="Starts" type="time" aria-required="true" />
              <InputFormField control={form.control} name="end_time" label="Ends" type="time" />
            </div>
            <InputFormField control={form.control} name="location" label="Location" placeholder="Site trailer or video link" />
            <TextareaFormField control={form.control} name="agenda" label="Agenda and attendees" rows={4} />
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                {onDelete && (
                  <Button type="button" variant="destructive" onClick={() => { void remove(); }} disabled={deleting}>
                    Delete meeting
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {meeting ? 'Save meeting' : 'Schedule meeting'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
