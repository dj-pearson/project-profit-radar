/**
 * Who is in a project's conversation, and the team members who could be added
 * (US-266, US-316).
 *
 * The panel set its list to `data || []` after a failed read, so on an error
 * it said "Nobody has been added yet" under the toast; the team read's error
 * was only logged, which hid the "Add a team member" picker. Both reads throw
 * now. The upload toggle and removal filtered by id alone and did not read
 * back, so a change RLS refused silently looked saved. Writes are scoped to
 * the project and throw on zero rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Roles worth adding by hand. Admins and project managers already read and
 * reply through their own policy branch; clients arrive through portal access.
 */
export const ADDABLE_ROLES = ['field_supervisor', 'office_staff', 'accounting'] as const;

export interface ConversationPerson {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
}

export interface ParticipantRow {
  id: string;
  user_id: string;
  participant_type: string;
  can_upload_files: boolean;
  user: ConversationPerson | null;
}

export interface TeamMember extends ConversationPerson {
  id: string;
}

export const conversationParticipantsKey = (companyId: string | undefined, projectId: string) =>
  ['conversation-participants', companyId, projectId] as const;
export const conversationTeamKey = (companyId: string | undefined) =>
  ['conversation-participants', companyId, 'team'] as const;

export async function fetchConversationParticipants(projectId: string): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from('project_communication_participants')
    .select(
      'id, user_id, participant_type, can_upload_files, ' +
      'user:user_profiles!project_communication_participants_user_id_fkey(first_name, last_name, email, role)',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as ParticipantRow[]) ?? [];
}

export async function fetchConversationTeam(companyId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, email, role')
    .eq('company_id', companyId)
    .in('role', [...ADDABLE_ROLES])
    .eq('is_active', true);
  if (error) throw error;
  return (data as TeamMember[]) ?? [];
}

const nothingChanged = () =>
  new Error('Nothing changed. They may already have been removed, or you may not have permission.');

export async function addConversationParticipant(projectId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('project_communication_participants')
    .insert({ project_id: projectId, user_id: userId, participant_type: 'contractor', can_upload_files: true })
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('They were not added.');
}

export async function setParticipantUploads(projectId: string, id: string, value: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('project_communication_participants')
    .update({ can_upload_files: value })
    .eq('id', id)
    .eq('project_id', projectId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw nothingChanged();
}

export async function removeConversationParticipant(projectId: string, id: string): Promise<void> {
  const { data, error } = await supabase
    .from('project_communication_participants')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw nothingChanged();
}

export function useConversationParticipants(projectId: string, enabled: boolean) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = conversationParticipantsKey(companyId, projectId);

  const participants = useQuery({
    queryKey: key,
    queryFn: () => fetchConversationParticipants(projectId),
    enabled: enabled && !!projectId,
  });
  const team = useQuery({
    queryKey: conversationTeamKey(companyId),
    queryFn: () => fetchConversationTeam(companyId as string),
    enabled: enabled && !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const add = useMutation({ mutationFn: (userId: string) => addConversationParticipant(projectId, userId), onSettled: invalidate });
  const setUploads = useMutation({
    mutationFn: (v: { id: string; value: boolean }) => setParticipantUploads(projectId, v.id, v.value),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => removeConversationParticipant(projectId, id), onSettled: invalidate });

  return { participants, team, add, setUploads, remove };
}
