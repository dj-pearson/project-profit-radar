/**
 * API keys and their request logs for /admin/api-keys (US-266).
 *
 * The page read api_keys through field names the table does not have (name,
 * key_prefix, scopes, total_requests, total_errors, rate_limit_per_minute), so
 * every key rendered without a name, the request counts summed to NaN and the
 * success rate fell back to 100%. It minted keys in the browser from
 * Math.random() and stored btoa(key) as the "hash"; api-management validates
 * keys by SHA-256, so no key made here ever authenticated, and none carried a
 * company_id. The scopes it offered (read, write, projects...) are not the
 * permissions api-management grants.
 *
 * Keys are now created by the api-management create-key route, which generates
 * the key server side, stores its SHA-256, sets the company and writes the
 * audit log; the raw key comes back once. Rows are mapped from the real
 * columns. Request and error totals are counted from api_request_logs.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** What api-management's API_PERMISSIONS accepts; anything else is refused. */
export const API_KEY_PERMISSIONS = [
  { value: 'projects:read', label: 'Projects: read', description: 'List and view projects' },
  { value: 'projects:write', label: 'Projects: write', description: 'Create projects' },
  { value: 'estimates:read', label: 'Estimates: read', description: 'List and view estimates' },
  { value: 'invoices:read', label: 'Invoices: read', description: 'List and view invoices' },
] as const;

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
  expires_at: string | null;
  created_at: string;
}

export interface APIRequestLog {
  id: string;
  method: string;
  endpoint: string;
  status_code: number | null;
  response_time_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface APIKeyData {
  keys: APIKey[];
  logs: APIRequestLog[];
  totalRequests: number;
  totalErrors: number;
}

export const apiKeysKey = (companyId: string | undefined) => ['api-keys', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export function toAPIKey(row: Record<string, unknown>): APIKey {
  return {
    id: String(row.id),
    name: String(row.key_name ?? ''),
    key_prefix: String(row.api_key_prefix ?? ''),
    scopes: Array.isArray(row.permissions) ? row.permissions.map(String) : [],
    is_active: Boolean(row.is_active),
    last_used_at: (row.last_used_at as string | null) ?? null,
    usage_count: Number(row.usage_count) || 0,
    rate_limit_per_hour: Number(row.rate_limit_per_hour) || 0,
    expires_at: (row.expires_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export function toRequestLog(row: Record<string, unknown>): APIRequestLog {
  const status = row.response_status == null ? null : Number(row.response_status);
  return {
    id: String(row.id),
    method: String(row.method ?? ''),
    endpoint: String(row.endpoint ?? ''),
    status_code: status,
    response_time_ms: row.processing_time_ms == null ? null : Number(row.processing_time_ms),
    success: status != null && status < 400,
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function fetchAPIKeys(companyId: string): Promise<APIKeyData> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const keys = (data ?? []).map((r) => toAPIKey(r as Record<string, unknown>));
  if (keys.length === 0) return { keys, logs: [], totalRequests: 0, totalErrors: 0 };

  const ids = keys.map((k) => k.id);
  const [logs, total, errors] = await Promise.all([
    supabase.from('api_request_logs').select('*').in('api_key_id', ids).order('created_at', { ascending: false }).limit(50),
    supabase.from('api_request_logs').select('id', { count: 'exact', head: true }).in('api_key_id', ids),
    supabase.from('api_request_logs').select('id', { count: 'exact', head: true }).in('api_key_id', ids).gte('response_status', 400),
  ]);
  const failed = [logs, total, errors].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    keys,
    logs: (logs.data ?? []).map((r) => toRequestLog(r as Record<string, unknown>)),
    totalRequests: total.count ?? 0,
    totalErrors: errors.count ?? 0,
  };
}

/** Creates the key server side; resolves with the raw key, which is shown once. */
export async function createAPIKey(name: string, permissions: string[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke('api-management/create-key', {
    body: { key_name: name, permissions },
  });
  if (error) throw error;
  if (!data?.success || !data.api_key) throw new Error(data?.error || 'The API key was not created.');
  return String(data.api_key);
}

export async function setAPIKeyActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase.from('api_keys').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The API key was not changed. You may not have permission to edit it.');
}

export async function deleteAPIKey(id: string): Promise<void> {
  const { data, error } = await supabase.from('api_keys').delete().eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The API key was not deleted. You may not have permission to delete it.');
}

export function useAPIKeyManagement() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = apiKeysKey(companyId);

  const query = useQuery({ queryKey: key, queryFn: () => fetchAPIKeys(companyId as string), enabled: !!companyId });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: ({ name, permissions }: { name: string; permissions: string[] }) => createAPIKey(name, permissions),
    onSettled: invalidate,
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setAPIKeyActive(id, isActive),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteAPIKey, onSettled: invalidate });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    create: (name: string, permissions: string[]) => create.mutateAsync({ name, permissions }),
    setActive: (id: string, isActive: boolean) => setActive.mutateAsync({ id, isActive }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}
