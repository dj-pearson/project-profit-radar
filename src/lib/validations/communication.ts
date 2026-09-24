import { z } from 'zod';
import { requiredDateField, requiredText } from './common';
import type { RFI, RFIDraft } from '@/hooks/useRFIsPage';
import type { CalendarEvent, NewCalendarEvent } from '@/hooks/useCalendarEvents';

/**
 * Forms behind the Communication Hub's RFIs and Meetings tabs (US-313).
 *
 * RFIs are rows in `rfis`, the same table /rfis and the project hub's RFIs tab
 * read. Meetings are `project_calendar_events` rows with event_type 'meeting',
 * the table /calendar already writes, so a meeting scheduled here shows on the
 * calendar and the other way round.
 */

export const RFI_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
/** The statuses /rfis offers in its edit dialog. */
export const RFI_STATUSES = ['submitted', 'in_progress', 'responded', 'closed', 'cancelled'] as const;

/** Select has no empty item, so "nobody on the team" needs a value of its own. */
export const NO_MEMBER = '__none__';

export interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const memberName = (m: TeamMember): string =>
  [m.first_name, m.last_name].filter(Boolean).join(' ').trim();

export const rfiHubFormSchema = z.object({
  project_id: z.string().min(1, 'Select a project'),
  title: requiredText('Subject is required', 200),
  description: requiredText('Describe what you need answered', 5000),
  priority: z.enum(RFI_PRIORITIES),
  status: z.enum(RFI_STATUSES),
  /** A team member's user id, or NO_MEMBER. */
  assignee_member: z.string(),
  /** An architect, engineer or firm outside the company. Wins over the member. */
  assignee_external: z.string().max(200, 'Must be 200 characters or fewer'),
  due_date: z.string().refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Enter a valid date'),
});
export type RFIHubFormValues = z.infer<typeof rfiHubFormSchema>;

export function rfiHubDefaults(projectId: string, rfi?: RFI | null, team: TeamMember[] = []): RFIHubFormValues {
  if (!rfi) {
    return {
      project_id: projectId,
      title: '',
      description: '',
      priority: 'medium',
      status: 'submitted',
      assignee_member: NO_MEMBER,
      assignee_external: '',
      due_date: '',
    };
  }
  // submitted_to is free text on the rfis table (a person or a firm), so a
  // member is recognised by name; anything else is an external party.
  const assigned = (rfi.submitted_to ?? '').trim();
  const member = assigned ? team.find((m) => memberName(m) === assigned) : undefined;
  const priority = (RFI_PRIORITIES as readonly string[]).includes(rfi.priority) ? rfi.priority : 'medium';
  const status = (RFI_STATUSES as readonly string[]).includes(rfi.status) ? rfi.status : 'submitted';
  return {
    project_id: rfi.project_id ?? projectId,
    title: rfi.subject || rfi.title || '',
    description: rfi.description ?? '',
    priority: priority as RFIHubFormValues['priority'],
    status: status as RFIHubFormValues['status'],
    assignee_member: member ? member.id : NO_MEMBER,
    assignee_external: member ? '' : assigned,
    due_date: rfi.due_date ? rfi.due_date.slice(0, 10) : '',
  };
}

/** The draft useRFIsPage's create and update mutations take. */
export function buildRFIDraft(v: RFIHubFormValues, team: TeamMember[]): RFIDraft & { status: string } {
  const member = team.find((m) => m.id === v.assignee_member);
  return {
    project_id: v.project_id,
    title: v.title.trim(),
    description: v.description.trim(),
    priority: v.priority,
    assigned_to: v.assignee_external.trim() || (member ? memberName(member) : ''),
    due_date: v.due_date,
    status: v.status,
  };
}

/** The same RFI with only its status changed, for the Close action. */
export function draftFromRFI(rfi: RFI, status: string): RFIDraft & { status: string } {
  return {
    project_id: rfi.project_id,
    title: rfi.subject || rfi.title || '',
    description: rfi.description ?? '',
    priority: rfi.priority || 'medium',
    assigned_to: rfi.submitted_to ?? '',
    due_date: rfi.due_date ? rfi.due_date.slice(0, 10) : '',
    status,
  };
}

export const rfiAnswerFormSchema = z.object({
  text: requiredText('Enter the answer', 5000),
  is_final: z.boolean(),
});
export type RFIAnswerFormValues = z.infer<typeof rfiAnswerFormSchema>;

const timeField = z.string().regex(/^\d{2}:\d{2}$/, 'Enter a time');

export const meetingFormSchema = z
  .object({
    title: requiredText('Meeting title is required', 200),
    project_id: z.string().min(1, 'Select a project'),
    date: requiredDateField('Pick a date'),
    start_time: timeField,
    end_time: z.string().refine((v) => v === '' || /^\d{2}:\d{2}$/.test(v), 'Enter a time'),
    location: z.string().max(300, 'Must be 300 characters or fewer'),
    agenda: z.string().max(5000, 'Must be 5000 characters or fewer'),
  })
  .refine((v) => v.end_time === '' || v.end_time > v.start_time, {
    message: 'End time must be after the start time',
    path: ['end_time'],
  });
export type MeetingFormValues = z.infer<typeof meetingFormSchema>;

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function meetingDefaults(projectId: string, meeting?: CalendarEvent | null): MeetingFormValues {
  if (!meeting) {
    return { title: '', project_id: projectId, date: '', start_time: '09:00', end_time: '10:00', location: '', agenda: '' };
  }
  return {
    title: meeting.title,
    project_id: meeting.projectId ?? projectId,
    date: localDate(meeting.start),
    start_time: localTime(meeting.start),
    end_time: meeting.end ? localTime(meeting.end) : '',
    location: meeting.location ?? '',
    agenda: meeting.description ?? '',
  };
}

/** Date and time inputs are local wall-clock; the row stores timestamptz. */
export function buildMeetingEvent(v: MeetingFormValues): NewCalendarEvent {
  const [y, mo, d] = v.date.split('-').map(Number);
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(y, mo - 1, d, h, m);
  };
  return {
    title: v.title.trim(),
    type: 'meeting',
    start: at(v.start_time),
    end: v.end_time ? at(v.end_time) : null,
    allDay: false,
    projectId: v.project_id,
    description: v.agenda.trim() || null,
    location: v.location.trim() || null,
  };
}
