import { useMemo, useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCalendarEvents,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  type CalendarEvent,
  type CalendarEventType,
} from '@/hooks/useCalendarEvents';

type CalendarView = 'month' | 'week' | 'day';

const TYPE_OPTIONS: CalendarEventType[] = ['meeting', 'crew', 'milestone', 'deadline'];

interface EventFormState {
  id: string | null; // null = creating
  title: string;
  type: CalendarEventType;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  allDay: boolean;
  projectId: string;
  description: string;
}

const emptyForm = (date: Date): EventFormState => ({
  id: null,
  title: '',
  type: 'meeting',
  date: format(date, 'yyyy-MM-dd'),
  time: '09:00',
  allDay: false,
  projectId: '',
  description: '',
});

export default function ProjectCalendar() {
  const { userProfile } = useAuth();
  const { events, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(() => emptyForm(new Date()));
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const companyId = userProfile?.company_id;
    if (!companyId) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name')
      .then(({ data }) => setProjects(data ?? []));
  }, [userProfile?.company_id]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(e.start, 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    return map;
  }, [events]);

  const dayEvents = (day: Date) => eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];

  const goPrev = () =>
    setCursor((c) => (view === 'month' ? subMonths(c, 1) : view === 'week' ? subWeeks(c, 1) : subDays(c, 1)));
  const goNext = () =>
    setCursor((c) => (view === 'month' ? addMonths(c, 1) : view === 'week' ? addWeeks(c, 1) : addDays(c, 1)));
  const goToday = () => setCursor(new Date());

  const openCreate = (day: Date) => {
    setForm(emptyForm(day));
    setDialogOpen(true);
  };

  const openEvent = (event: CalendarEvent) => {
    if (!event.editable) {
      toast({ title: event.title, description: `${EVENT_TYPE_LABELS[event.type]} · ${format(event.start, 'PP')}` });
      return;
    }
    setForm({
      id: event.id,
      title: event.title,
      type: event.type,
      date: format(event.start, 'yyyy-MM-dd'),
      time: format(event.start, 'HH:mm'),
      allDay: event.allDay,
      projectId: event.projectId ?? '',
      description: event.description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const start = new Date(`${form.date}T${form.allDay ? '00:00' : form.time}`);
      const payload = {
        title: form.title.trim(),
        type: form.type,
        start,
        allDay: form.allDay,
        projectId: form.projectId || null,
        description: form.description || null,
      };
      if (form.id) {
        await updateEvent(form.id, payload);
        toast({ title: 'Event updated' });
      } else {
        await createEvent(payload);
        toast({ title: 'Event created' });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: 'Could not save event', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    setSaving(true);
    try {
      await deleteEvent(form.id);
      toast({ title: 'Event deleted' });
      setDialogOpen(false);
    } catch {
      toast({ title: 'Could not delete event', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const headerLabel =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(startOfWeek(cursor), 'MMM d')} – ${format(endOfWeek(cursor), 'MMM d, yyyy')}`
        : format(cursor, 'EEEE, MMMM d, yyyy');

  return (
    <AccessiblePageWrapper pageTitle="Calendar">
      <DashboardLayout title="Calendar" hasAccessibleWrapper>
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goNext} aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToday}>
                Today
              </Button>
              <h2 className="ml-2 text-lg font-semibold">{headerLabel}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-0.5">
                {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={view === v ? 'default' : 'ghost'}
                    onClick={() => setView(v)}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
              <Button onClick={() => openCreate(cursor)}>
                <Plus className="mr-1 h-4 w-4" /> New Event
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {TYPE_OPTIONS.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', EVENT_TYPE_COLORS[t])} />
                {EVENT_TYPE_LABELS[t]}
              </span>
            ))}
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">Loading calendar…</CardContent>
            </Card>
          ) : view === 'month' ? (
            <MonthGrid cursor={cursor} dayEvents={dayEvents} onDayClick={openCreate} onEventClick={openEvent} />
          ) : view === 'week' ? (
            <WeekView cursor={cursor} dayEvents={dayEvents} onDayClick={openCreate} onEventClick={openEvent} />
          ) : (
            <DayView cursor={cursor} events={dayEvents(cursor)} onAdd={() => openCreate(cursor)} onEventClick={openEvent} />
          )}
        </div>

        {/* Create / edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Event' : 'New Event'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="evt-title">Title *</Label>
                <Input
                  id="evt-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Site walkthrough"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="evt-type">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as CalendarEventType }))}>
                    <SelectTrigger id="evt-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {EVENT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="evt-project">Project</Label>
                  <Select
                    value={form.projectId || 'none'}
                    onValueChange={(v) => setForm((f) => ({ ...f, projectId: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger id="evt-project">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="evt-date">Date</Label>
                  <Input
                    id="evt-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="evt-time">Time</Label>
                  <Input
                    id="evt-time"
                    type="time"
                    value={form.time}
                    disabled={form.allDay}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="evt-allday"
                  checked={form.allDay}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, allDay: c === true }))}
                />
                <Label htmlFor="evt-allday">All day</Label>
              </div>
              <div>
                <Label htmlFor="evt-desc">Description</Label>
                <Textarea
                  id="evt-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              {form.id ? (
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : form.id ? 'Save' : 'Create'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AccessiblePageWrapper>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: (e: CalendarEvent) => void }) {
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        onClick(event);
      }}
      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-xs hover:bg-muted"
      title={event.title}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', EVENT_TYPE_COLORS[event.type])} />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

function MonthGrid({
  cursor,
  dayEvents,
  onDayClick,
  onEventClick,
}: {
  cursor: Date;
  dayEvents: (d: Date) => CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const evs = dayEvents(day);
            const inMonth = isSameMonth(day, cursor);
            return (
              <button
                type="button"
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                aria-label={`Add event on ${format(day, 'PPP')}`}
                className={cn(
                  'min-h-[96px] border-b border-r p-1 text-left align-top transition-colors hover:bg-muted/50',
                  !inMonth && 'bg-muted/30 text-muted-foreground'
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      isToday(day) && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <EventChip key={e.id} event={e} onClick={onEventClick} />
                  ))}
                  {evs.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">+{evs.length - 3} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function WeekView({
  cursor,
  dayEvents,
  onDayClick,
  onEventClick,
}: {
  cursor: Date;
  dayEvents: (d: Date) => CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => (
        <Card key={day.toISOString()} className={cn(isToday(day) && 'border-primary')}>
          <CardContent className="p-2">
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className="mb-2 w-full text-left text-sm font-medium hover:underline"
            >
              {format(day, 'EEE d')}
            </button>
            <div className="space-y-1">
              {dayEvents(day).map((e) => (
                <EventChip key={e.id} event={e} onClick={onEventClick} />
              ))}
              {dayEvents(day).length === 0 && <p className="text-xs text-muted-foreground">—</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DayView({
  cursor,
  events,
  onAdd,
  onEventClick,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onAdd: () => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        {events.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No events on {format(cursor, 'PPP')}.</p>
            <Button variant="outline" className="mt-3" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" /> Add event
            </Button>
          </div>
        ) : (
          events.map((e) => (
            <button
              type="button"
              key={e.id}
              onClick={() => onEventClick(e)}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"
            >
              <span className={cn('h-3 w-3 shrink-0 rounded-full', EVENT_TYPE_COLORS[e.type])} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">
                  {e.allDay ? 'All day' : format(e.start, 'p')} · {EVENT_TYPE_LABELS[e.type]}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {e.type}
              </Badge>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
