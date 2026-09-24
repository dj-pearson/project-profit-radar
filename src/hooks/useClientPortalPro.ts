/**
 * Client access rows and client messages for the Client Portal Pro admin page (US-266).
 *
 * The page looked up tenant_id twice with unchecked reads and caught every
 * error into console.error, so a failed read showed "No client access
 * configured" and zero unread messages. The unread count was taken from the
 * 20 newest messages only. Toggling access and marking read reported nothing
 * when RLS filtered the update to zero rows.
 *
 * Reads throw; unread is a head count over every client message; writes select
 * the row back. These tables are keyed by tenant_id; the cache key carries the
 * company and user so one account's cache is never served to another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId } from './tenantScope';

export interface ClientAccess {
  id: string;
  client_name: string;
  client_email: string;
  is_active: boolean;
  can_view_financials: boolean;
  last_login_at: string | null;
  login_count: number | null;
  projects: { name: string } | null;
}

export interface ClientMessage {
  id: string;
  subject: string;
  message: string;
  sent_by_client: boolean;
  is_read: boolean;
  created_at: string;
}

export interface ClientPortalProData {
  tenantId: string | null;
  clients: ClientAccess[];
  messages: ClientMessage[];
  unreadCount: number;
}

export const clientPortalProKey = (companyId: string | undefined, userId: string | undefined) =>
  ['client-portal-pro', companyId, userId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchClientPortalPro(userId: string): Promise<ClientPortalProData> {
  const tenantId = await fetchTenantId(userId);
  if (!tenantId) return { tenantId: null, clients: [], messages: [], unreadCount: 0 };

  const [clients, messages, unread] = await Promise.all([
    supabase
      .from('client_portal_access')
      .select('*, projects (name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('client_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('client_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_read', false)
      .eq('sent_by_client', true),
  ]);
  const failed = [clients, messages, unread].find((r) => r.error)?.error;
  if (failed) throw failed;

  return {
    tenantId,
    clients: (clients.data ?? []) as unknown as ClientAccess[],
    messages: (messages.data ?? []) as unknown as ClientMessage[],
    unreadCount: unread.count ?? 0,
  };
}

export async function setClientAccessActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('client_portal_access')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'Client access was not changed. You may not have permission to edit it.');
}

export async function markClientMessageRead(id: string, now: Date = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('client_messages')
    .update({ is_read: true, read_at: now.toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The message was not marked read. You may not have permission to edit it.');
}

export function useClientPortalPro() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = clientPortalProKey(companyId, userId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchClientPortalPro(userId as string),
    enabled: !!userId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setClientAccessActive(id, isActive),
    onSettled: invalidate,
  });
  const markRead = useMutation({ mutationFn: (id: string) => markClientMessageRead(id), onSettled: invalidate });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    setActive: (id: string, isActive: boolean) => toggle.mutateAsync({ id, isActive }),
    markRead: (id: string) => markRead.mutateAsync(id),
  };
}
