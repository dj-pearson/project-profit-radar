/**
 * Webhook endpoints, deliveries and events for /admin/webhooks (US-266).
 *
 * The page read three tables in sequence inside one try, so the first failure
 * left the rest on whatever it had, and reloaded everything by hand after each
 * write. Toggle and delete reported success when RLS filtered the write to
 * zero rows.
 *
 * Reads throw, writes select the row back, and the list is re-read after each
 * write. Endpoints are the signed-in user's own (user_id), as before.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  subscribed_events: string[];
  is_active: boolean;
  is_verified: boolean;
  last_delivery_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_endpoint_id: string;
  url: string;
  status: string;
  success: boolean;
  response_status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  attempt_number: number;
  max_attempts: number;
  delivered_at: string | null;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  action: string;
  pending_deliveries: number;
  completed_deliveries: number;
  failed_deliveries: number;
  created_at: string;
}

export interface NewWebhookEndpoint {
  url: string;
  description: string;
  subscribed_events: string[];
  /** From secureSecret(); never Math.random (US-296). */
  secret: string;
}

export const webhookManagementKey = (companyId: string | undefined, userId: string | undefined) =>
  ['webhooks', companyId, userId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchWebhookManagement(
  userId: string
): Promise<{ endpoints: WebhookEndpoint[]; deliveries: WebhookDelivery[]; events: WebhookEvent[] }> {
  const [endpointsRes, eventsRes] = await Promise.all([
    supabase.from('webhook_endpoints').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('webhook_events').select('*').order('created_at', { ascending: false }).limit(50),
  ]);
  if (endpointsRes.error) throw endpointsRes.error;
  if (eventsRes.error) throw eventsRes.error;
  const endpoints = (endpointsRes.data ?? []) as unknown as WebhookEndpoint[];

  let deliveries: WebhookDelivery[] = [];
  if (endpoints.length > 0) {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .in('webhook_endpoint_id', endpoints.map((e) => e.id))
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    deliveries = (data ?? []) as unknown as WebhookDelivery[];
  }

  return { endpoints, deliveries, events: (eventsRes.data ?? []) as unknown as WebhookEvent[] };
}

export async function createWebhookEndpoint(userId: string, endpoint: NewWebhookEndpoint): Promise<void> {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({ ...endpoint, user_id: userId, is_active: true, is_verified: false })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The webhook was not created. You may not have permission to add webhooks.');
}

export async function setWebhookEndpointActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase.from('webhook_endpoints').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The webhook was not changed. You may not have permission to edit it.');
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  const { data, error } = await supabase.from('webhook_endpoints').delete().eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The webhook was not deleted. You may not have permission to delete it.');
}

export function useWebhookManagement() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = webhookManagementKey(companyId, userId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchWebhookManagement(userId as string),
    enabled: !!userId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (endpoint: NewWebhookEndpoint) => {
      if (!userId) throw new Error('Not authenticated');
      return createWebhookEndpoint(userId, endpoint);
    },
    onSettled: invalidate,
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setWebhookEndpointActive(id, isActive),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteWebhookEndpoint, onSettled: invalidate });

  return {
    endpoints: query.data?.endpoints ?? [],
    deliveries: query.data?.deliveries ?? [],
    events: query.data?.events ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    create: (endpoint: NewWebhookEndpoint) => create.mutateAsync(endpoint),
    setActive: (id: string, isActive: boolean) => setActive.mutateAsync({ id, isActive }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}
