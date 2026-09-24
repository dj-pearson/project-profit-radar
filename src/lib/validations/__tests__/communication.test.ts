import { describe, expect, it } from 'vitest';
import {
  NO_MEMBER,
  buildMeetingEvent,
  buildRFIDraft,
  draftFromRFI,
  meetingDefaults,
  meetingFormSchema,
  rfiHubDefaults,
  rfiHubFormSchema,
  type RFIHubFormValues,
} from '../communication';
import type { RFI } from '@/hooks/useRFIsPage';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

const team = [
  { id: 'u1', first_name: 'Dana', last_name: 'Ruiz' },
  { id: 'u2', first_name: 'Sam', last_name: null },
];

const rfi = {
  id: 'r1',
  project_id: 'p1',
  rfi_number: 'RFI-00000001',
  subject: 'Beam size at grid C',
  title: 'Beam size at grid C',
  description: 'Drawings disagree',
  priority: 'high',
  status: 'in_progress',
  submitted_to: 'Dana Ruiz',
  due_date: '2026-10-01',
} as unknown as RFI;

const valid: RFIHubFormValues = {
  project_id: 'p1',
  title: 'Beam size',
  description: 'Which one?',
  priority: 'medium',
  status: 'submitted',
  assignee_member: NO_MEMBER,
  assignee_external: '',
  due_date: '',
};

describe('RFI hub form (US-313)', () => {
  it('requires a project, a subject and a question', () => {
    const r = rfiHubFormSchema.safeParse({ ...valid, project_id: '', title: '  ', description: '' });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['project_id', 'title', 'description']));
  });

  it('stores a picked team member by name, since rfis.submitted_to is free text', () => {
    expect(buildRFIDraft({ ...valid, assignee_member: 'u1' }, team).assigned_to).toBe('Dana Ruiz');
  });

  it('lets an outside party win over a team member', () => {
    const d = buildRFIDraft({ ...valid, assignee_member: 'u1', assignee_external: ' Acme Architects ' }, team);
    expect(d.assigned_to).toBe('Acme Architects');
  });

  it('leaves the RFI unassigned when nobody is picked', () => {
    expect(buildRFIDraft(valid, team).assigned_to).toBe('');
  });

  it('recognises an existing assignee as a team member when editing', () => {
    const d = rfiHubDefaults('', rfi, team);
    expect(d.assignee_member).toBe('u1');
    expect(d.assignee_external).toBe('');
    expect(d.status).toBe('in_progress');
  });

  it('keeps a non-member assignee in the outside-party field', () => {
    const d = rfiHubDefaults('', { ...rfi, submitted_to: 'Acme Architects' } as RFI, team);
    expect(d.assignee_member).toBe(NO_MEMBER);
    expect(d.assignee_external).toBe('Acme Architects');
  });

  it('closes an RFI without rewriting its other fields', () => {
    expect(draftFromRFI(rfi, 'closed')).toEqual({
      project_id: 'p1',
      title: 'Beam size at grid C',
      description: 'Drawings disagree',
      priority: 'high',
      assigned_to: 'Dana Ruiz',
      due_date: '2026-10-01',
      status: 'closed',
    });
  });
});

describe('meeting form (US-313)', () => {
  const base = { title: 'OAC', project_id: 'p1', date: '2026-10-02', start_time: '09:00', end_time: '10:30', location: '', agenda: '' };

  it('rejects an end time before the start', () => {
    const r = meetingFormSchema.safeParse({ ...base, end_time: '08:00' });
    expect(r.success).toBe(false);
    expect(r.success ? [] : r.error.issues.map((i) => i.path[0])).toContain('end_time');
  });

  it('requires a project and a date', () => {
    const r = meetingFormSchema.safeParse({ ...base, project_id: '', date: '' });
    expect(r.success).toBe(false);
  });

  it('builds a meeting-type calendar event in local time', () => {
    const e = buildMeetingEvent({ ...base, location: ' Trailer ', agenda: '' });
    expect(e.type).toBe('meeting');
    expect(e.projectId).toBe('p1');
    expect(e.start).toEqual(new Date(2026, 9, 2, 9, 0));
    expect(e.end).toEqual(new Date(2026, 9, 2, 10, 30));
    expect(e.location).toBe('Trailer');
    expect(e.description).toBeNull();
  });

  it('round-trips an existing meeting into the form', () => {
    const m = {
      id: 'e1',
      title: 'OAC',
      type: 'meeting',
      start: new Date(2026, 9, 2, 9, 0),
      end: new Date(2026, 9, 2, 10, 30),
      allDay: false,
      projectId: 'p1',
      description: 'Agenda',
      location: 'Trailer',
      editable: true,
    } as CalendarEvent;
    expect(meetingDefaults('', m)).toEqual({ ...base, location: 'Trailer', agenda: 'Agenda' });
  });
});
