/**
 * SSO connections, sessions, MFA devices and 2FA status for /admin/sso (US-266).
 *
 * The page ignored a failed sessions or MFA read (the list just stayed empty),
 * read user_security with .single(), which errors when the user has no row,
 * and treated either as "two-factor off": on the authentication screen, a read
 * failure showed an unprotected account. When the sso-manage call returned an
 * error the connection list was left empty with no message, and a thrown call
 * fell back to reading sso_connections directly, without the filtering the
 * edge function applies.
 *
 * Every read throws now, user_security is read with maybeSingle (no row is
 * "not enabled"; a failed read is an error), and the connection list comes
 * only from sso-manage. Session revokes select the rows back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getEdgeFunctionUrl, supabaseAnonKey } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SSOConnection {
  id: string;
  tenant_id: string;
  provider: string;
  display_name: string;
  is_enabled: boolean;
  is_default: boolean;
  allowed_domains: string[];
  total_logins: number;
  last_used_at: string;
  created_at: string;
  config?: Record<string, unknown>;
}

export interface UserSession {
  id: string;
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  auth_method: string;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
}

export interface MFADevice {
  id: string;
  mfa_type: string;
  display_name: string;
  is_enabled: boolean;
  is_verified: boolean;
  last_used_at: string;
}

export interface UserSecurity {
  two_factor_enabled: boolean;
  backup_codes?: string[] | null;
}

export interface SSOManagementData {
  connections: SSOConnection[];
  sessions: UserSession[];
  mfaDevices: MFADevice[];
  security: UserSecurity | null;
}

export const ssoManagementKey = (companyId: string | undefined, userId: string | undefined) =>
  ['sso-management', companyId, userId] as const;

/** POST to an edge function with the caller's session; throws the function's error message. */
export async function callEdgeFunction<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: session, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = session?.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(getEdgeFunctionUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || `${name} failed (${response.status})`);
  return result as T;
}

export async function fetchSSOManagement(userId: string): Promise<SSOManagementData> {
  const [list, sessions, mfa, security] = await Promise.all([
    callEdgeFunction<{ data?: { connections?: SSOConnection[] } }>('sso-manage', { action: 'list' }),
    supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false }),
    supabase.from('mfa_devices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('user_security').select('two_factor_enabled, backup_codes').eq('user_id', userId).maybeSingle(),
  ]);
  const failed = [sessions, mfa, security].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    connections: list?.data?.connections ?? [],
    sessions: (sessions.data ?? []) as unknown as UserSession[],
    mfaDevices: (mfa.data ?? []) as unknown as MFADevice[],
    security: (security.data ?? null) as UserSecurity | null,
  };
}

export async function revokeUserSession(id: string): Promise<void> {
  const { data, error } = await supabase.from('user_sessions').update({ is_active: false }).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The session was not revoked. It may already have ended.');
}

/** Returns how many sessions were revoked. */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export function useSSOManagement() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = ssoManagementKey(companyId, userId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSSOManagement(userId as string),
    enabled: !!userId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const requireUser = () => {
    if (!userId) throw new Error('Not authenticated');
    return userId;
  };

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      callEdgeFunction('sso-manage', { action: 'update', id, is_enabled: enabled }),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => callEdgeFunction('sso-manage', { action: 'delete', id }),
    onSettled: invalidate,
  });
  const revoke = useMutation({ mutationFn: revokeUserSession, onSettled: invalidate });
  const revokeAll = useMutation({ mutationFn: () => revokeAllUserSessions(requireUser()), onSettled: invalidate });
  const disableMfa = useMutation({
    mutationFn: () => callEdgeFunction('disable-mfa', { user_id: requireUser() }),
    onSettled: invalidate,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    invalidate,
    setConnectionEnabled: (id: string, enabled: boolean) => toggle.mutateAsync({ id, enabled }),
    deleteConnection: (id: string) => remove.mutateAsync(id),
    revokeSession: (id: string) => revoke.mutateAsync(id),
    revokeAllSessions: () => revokeAll.mutateAsync(),
    disableMfa: () => disableMfa.mutateAsync(),
  };
}
