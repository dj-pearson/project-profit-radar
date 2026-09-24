/**
 * RFIs for /rfis (US-266).
 *
 * The page read its responses with the error unread, so a failed read showed
 * every RFI as unanswered, and it labelled every requester and responder
 * "User" because it never looked anyone up. Names now come from
 * user_profiles (shown as '--' when the person cannot be found), every read
 * throws, and the writes are scoped to the company and read back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// rfi_responses is not in the generated Database types yet.
const untypedFrom = (table: string) => (supabase as unknown as SupabaseClient).from(table);

export interface RFIProject {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

export interface PersonName {
  first_name: string;
  last_name: string;
}

export interface RFIResponse {
  id: string;
  rfi_id: string;
  response_text: string;
  responded_by: string;
  response_date: string;
  is_final_response: boolean;
  responder: PersonName;
}

export interface RFI {
  id: string;
  project_id: string;
  rfi_number: string;
  subject: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  submitted_to?: string;
  requested_by: string;
  assigned_to: string;
  due_date: string | null;
  response_date?: string | null;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  projects: { name: string; client_name: string };
  requester: PersonName;
  assignee: PersonName;
  responses: RFIResponse[];
}

interface RawRFIRow {
  id: string;
  project_id: string;
  rfi_number: string | null;
  subject: string | null;
  description: string;
  priority: string;
  status: string;
  submitted_to: string | null;
  created_by: string | null;
  due_date: string | null;
  response_date: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  projects: { name: string; client_name: string };
}

interface RawRFIResponseRow {
  id: string;
  rfi_id: string;
  response_text: string;
  responded_by: string;
  response_date: string;
  is_final_response: boolean;
}

export const rfisPageKey = (companyId: string | undefined) => ['rfis-page', companyId] as const;

const UNKNOWN: PersonName = { first_name: '--', last_name: '' };

export async function fetchRFIsPage(companyId: string): Promise<{ projects: RFIProject[]; rfis: RFI[] }> {
  const [projectsRes, rfisRes] = await Promise.all([
    supabase.from('projects').select('id, name, client_name, status').eq('company_id', companyId).order('name'),
    supabase
      .from('rfis')
      .select('*, projects:project_id ( name, client_name )')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
  ]);
  const failed = [projectsRes, rfisRes].find((r) => r.error)?.error;
  if (failed) throw failed;
  const rows = (rfisRes.data ?? []) as unknown as RawRFIRow[];

  const responsesByRfi: Record<string, RawRFIResponseRow[]> = {};
  if (rows.length > 0) {
    const { data, error } = await untypedFrom('rfi_responses')
      .select('*')
      .in('rfi_id', rows.map((r) => r.id))
      .order('response_date', { ascending: true });
    if (error) throw error;
    for (const resp of (data ?? []) as RawRFIResponseRow[]) {
      (responsesByRfi[resp.rfi_id] ??= []).push(resp);
    }
  }

  const personIds = new Set<string>();
  for (const r of rows) if (r.created_by) personIds.add(r.created_by);
  for (const list of Object.values(responsesByRfi)) for (const resp of list) personIds.add(resp.responded_by);
  const names = new Map<string, PersonName>();
  if (personIds.size > 0) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', [...personIds]);
    if (error) throw error;
    for (const p of data ?? []) {
      names.set(p.id, { first_name: p.first_name ?? '', last_name: p.last_name ?? '' });
    }
  }
  const nameOf = (id: string | null | undefined) => (id && names.get(id)) || UNKNOWN;

  const rfis: RFI[] = rows.map((rfi) => ({
    ...rfi,
    rfi_number: rfi.rfi_number || `RFI-${rfi.id?.slice(-8)}`,
    subject: rfi.subject || '',
    title: rfi.subject || '',
    submitted_to: rfi.submitted_to ?? undefined,
    requested_by: rfi.created_by || '',
    created_by: rfi.created_by || '',
    assigned_to: rfi.submitted_to || '',
    closed_at: null,
    requester: nameOf(rfi.created_by),
    // submitted_to is free text (a name or a firm), not a user id.
    assignee: { first_name: rfi.submitted_to || 'Unassigned', last_name: '' },
    responses: (responsesByRfi[rfi.id] ?? []).map((resp) => ({ ...resp, responder: nameOf(resp.responded_by) })),
  }));
  return { projects: (projectsRes.data ?? []) as RFIProject[], rfis };
}

export interface RFIDraft {
  project_id: string;
  title: string;
  description: string;
  priority: string;
  assigned_to: string;
  due_date: string;
}

const noRow = () => new Error('The RFI was not changed. It may have been removed, or you may not have permission.');

export async function createRFI(companyId: string, userId: string | undefined, v: RFIDraft, now: Date = new Date()): Promise<void> {
  // Default SLA: 7 days if not provided.
  const defaultDue = new Date(now);
  defaultDue.setDate(defaultDue.getDate() + 7);
  const { data, error } = await supabase
    .from('rfis')
    .insert({
      project_id: v.project_id,
      subject: v.title,
      description: v.description,
      priority: v.priority,
      submitted_to: v.assigned_to || null,
      due_date: v.due_date || defaultDue.toISOString().split('T')[0],
      status: 'submitted',
      company_id: companyId,
      created_by: userId,
      rfi_number: `RFI-${now.getTime().toString().slice(-8)}`,
    })
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The RFI was not created.');
}

export async function updateRFI(companyId: string, id: string, v: RFIDraft & { status: string }): Promise<void> {
  const { data, error } = await supabase
    .from('rfis')
    .update({
      project_id: v.project_id,
      subject: v.title,
      description: v.description,
      priority: v.priority,
      submitted_to: v.assigned_to || null,
      due_date: v.due_date || null,
      status: v.status,
    })
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw noRow();
}

/** Add a response; a final one closes the RFI, and a failed close is reported. */
export async function addRFIResponse(
  companyId: string,
  userId: string,
  v: { rfiId: string; text: string; isFinal: boolean },
  now: Date = new Date(),
): Promise<void> {
  const { data, error: insertErr } = await untypedFrom('rfi_responses')
    .insert({
      rfi_id: v.rfiId,
      response_text: v.text,
      responded_by: userId,
      is_final_response: v.isFinal,
      company_id: companyId,
    })
    .select('id');
  if (insertErr) throw insertErr;
  if (!data || data.length === 0) throw new Error('The response was not saved.');

  // The close error used to be dropped, so "Response added successfully"
  // appeared whether or not the RFI closed, and it stayed open (US-300).
  if (v.isFinal) {
    const { data: closed, error: closeError } = await supabase
      .from('rfis')
      .update({ status: 'closed', response_date: now.toISOString() })
      .eq('id', v.rfiId)
      .eq('company_id', companyId)
      .select('id');
    if (closeError || !closed || closed.length === 0) {
      throw new Error(
        `The response was saved but the RFI could not be closed: ${closeError?.message ?? 'no RFI was updated'}`,
      );
    }
  }
}

export function useRFIsPage(enabled = true) {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: rfisPageKey(companyId),
    queryFn: () => fetchRFIsPage(companyId as string),
    enabled: enabled && !!companyId,
  });
  const need = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: rfisPageKey(companyId) });

  const create = useMutation({ mutationFn: (v: RFIDraft) => createRFI(need(), userId, v), onSettled: invalidate });
  const update = useMutation({
    mutationFn: (v: { id: string; draft: RFIDraft & { status: string } }) => updateRFI(need(), v.id, v.draft),
    onSettled: invalidate,
  });
  const respond = useMutation({
    mutationFn: (v: { rfiId: string; text: string; isFinal: boolean }) => {
      if (!userId) throw new Error('You are not signed in.');
      return addRFIResponse(need(), userId, v);
    },
    onSettled: invalidate,
  });

  return { companyId, query, create, update, respond };
}
