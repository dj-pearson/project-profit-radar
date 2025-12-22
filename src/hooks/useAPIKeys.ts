/**
 * API Key Management Hook
 * Provides secure client-side integration with API key management
 * Supports creation, rotation, validation, and rate limit monitoring
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface APIKey {
  id: string;
  company_id: string;
  site_id: string;
  key_name: string;
  api_key_prefix: string;
  hash_preview?: string;
  hash_algorithm: string;
  key_version: number;
  permissions: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recoverable: boolean;
  security_metadata: Record<string, unknown>;
}

export interface CreateAPIKeyRequest {
  key_name: string;
  permissions?: string[];
  expires_at?: string | null;
  rate_limit_per_hour?: number;
}

export interface CreateAPIKeyResponse {
  api_key_id: string;
  full_key: string;
  key_prefix: string;
  message: string;
}

export interface RotateKeyResponse {
  new_full_key: string;
  new_key_prefix: string;
  message: string;
}

export interface RateLimitStatus {
  api_key_id: string;
  current_usage: number;
  rate_limit: number;
  remaining: number;
  reset_at: string;
  is_limited: boolean;
}

/**
 * Hook to fetch API keys for the current company
 */
export function useAPIKeys(options?: { enabled?: boolean }) {
  const {  user } = useAuth();

  return useQuery({
    queryKey: ['api-keys', siteId],
    queryFn: async (): Promise<APIKey[]> => {
      if (!siteId) throw new Error('No site_id available');

      // Use the secure view which masks sensitive data
      const { data, error } = await supabase
        .from('api_keys')
        .select(`
          id,
          company_id,
          site_id,
          key_name,
          api_key_prefix,
          hash_algorithm,
          key_version,
          permissions,
          is_active,
          expires_at,
          last_used_at,
          usage_count,
          rate_limit_per_hour,
          created_by,
          created_at,
          updated_at,
          security_metadata
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(key => ({
        ...key,
        permissions: key.permissions || [],
        is_recoverable: false, // Can't determine from basic query
        security_metadata: key.security_metadata || {},
      })) as APIKey[];
    },
    enabled: !!siteId && !!user && (options?.enabled !== false),
  });
}

/**
 * Hook to create a new API key
 */
export function useCreateAPIKey() {
  const {  user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> => {
      if (!siteId) throw new Error('No site_id available');
      if (!user) throw new Error('Not authenticated');

      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Could not determine company');
      }

      // Call the create_api_key function
      const { data, error } = await supabase.rpc('create_api_key', {
        p_company_id: profile.company_id,
        p_
        p_key_name: request.key_name,
        p_permissions: request.permissions || ['read'],
        p_expires_at: request.expires_at || null,
        p_rate_limit: request.rate_limit_per_hour || 1000,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Failed to create API key');
      }

      return data[0] as CreateAPIKeyResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to rotate an API key
 */
export function useRotateAPIKey() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string): Promise<RotateKeyResponse> => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase.rpc('rotate_api_key', {
        p_api_key_id: keyId,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Failed to rotate API key');
      }

      return data[0] as RotateKeyResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to toggle API key active status
 */
export function useToggleAPIKey() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ keyId, isActive }: { keyId: string; isActive: boolean }): Promise<void> => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('api_keys')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .eq('site_id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to delete an API key
 */
export function useDeleteAPIKey() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string): Promise<void> => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('site_id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to update API key settings
 */
export function useUpdateAPIKey() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      keyId,
      updates,
    }: {
      keyId: string;
      updates: Partial<Pick<APIKey, 'key_name' | 'permissions' | 'rate_limit_per_hour' | 'expires_at'>>;
    }): Promise<void> => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('api_keys')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .eq('site_id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to get rate limit status for an API key
 */
export function useAPIKeyRateLimit(keyId: string | undefined, options?: { enabled?: boolean }) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['api-key-rate-limit', keyId],
    queryFn: async (): Promise<RateLimitStatus> => {
      if (!siteId || !keyId) throw new Error('Missing required parameters');

      // Get the API key with rate limit
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('rate_limit_per_hour')
        .eq('id', keyId)
        .single();

      if (keyError) throw keyError;

      // Get current hour's usage
      const windowStart = new Date();
      windowStart.setMinutes(0, 0, 0);

      const { data: usageData } = await supabase
        .from('api_key_rate_limits')
        .select('request_count')
        .eq('api_key_id', keyId)
        .gte('window_start', windowStart.toISOString())
        .single();

      const currentUsage = usageData?.request_count || 0;
      const rateLimit = keyData.rate_limit_per_hour;

      // Calculate reset time (next hour)
      const resetAt = new Date(windowStart);
      resetAt.setHours(resetAt.getHours() + 1);

      return {
        api_key_id: keyId,
        current_usage: currentUsage,
        rate_limit: rateLimit,
        remaining: Math.max(0, rateLimit - currentUsage),
        reset_at: resetAt.toISOString(),
        is_limited: currentUsage >= rateLimit,
      };
    },
    enabled: !!siteId && !!keyId && (options?.enabled !== false),
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to get API key usage statistics
 */
export function useAPIKeyStats(keyId?: string, options?: { enabled?: boolean }) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['api-key-stats', siteId, keyId],
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id available');

      let query = supabase
        .from('api_keys')
        .select('id, key_name, usage_count, last_used_at, is_active');

      if (keyId) {
        query = query.eq('id', keyId);
      }

      query = query.eq('site_id', siteId);

      const { data, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const totalKeys = data?.length || 0;
      const activeKeys = data?.filter(k => k.is_active).length || 0;
      const totalUsage = data?.reduce((sum, k) => sum + (k.usage_count || 0), 0) || 0;
      const recentlyUsed = data?.filter(k => {
        if (!k.last_used_at) return false;
        const lastUsed = new Date(k.last_used_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastUsed > hourAgo;
      }).length || 0;

      return {
        total_keys: totalKeys,
        active_keys: activeKeys,
        inactive_keys: totalKeys - activeKeys,
        total_usage: totalUsage,
        recently_used: recentlyUsed,
        keys: data || [],
      };
    },
    enabled: !!siteId && (options?.enabled !== false),
  });
}

/**
 * Hook to retrieve a recoverable API key (root admin only)
 */
export function useRetrieveAPIKey() {
  const {  user } = useAuth();

  return useMutation({
    mutationFn: async (keyId: string): Promise<string> => {
      if (!siteId) throw new Error('No site_id available');
      if (!user) throw new Error('Not authenticated');

      // Check if user is root admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'root_admin') {
        throw new Error('Only root administrators can retrieve API keys');
      }

      const { data, error } = await supabase.rpc('retrieve_api_key', {
        p_api_key_id: keyId,
      });

      if (error) throw error;
      return data as string;
    },
  });
}

/**
 * Hook to get sensitive data access log
 */
export function useSensitiveDataAccessLog(options?: { limit?: number; enabled?: boolean }) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['sensitive-data-access-log', siteId, options?.limit],
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('sensitive_data_access_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && (options?.enabled !== false),
  });
}

/**
 * Utility: Available API key permissions
 */
export const API_KEY_PERMISSIONS = [
  { value: 'read', label: 'Read', description: 'View data only' },
  { value: 'write', label: 'Write', description: 'Create and modify data' },
  { value: 'delete', label: 'Delete', description: 'Remove data' },
  { value: 'projects:read', label: 'Projects (Read)', description: 'View projects' },
  { value: 'projects:write', label: 'Projects (Write)', description: 'Manage projects' },
  { value: 'time:read', label: 'Time Tracking (Read)', description: 'View time entries' },
  { value: 'time:write', label: 'Time Tracking (Write)', description: 'Manage time entries' },
  { value: 'financial:read', label: 'Financial (Read)', description: 'View financial data' },
  { value: 'financial:write', label: 'Financial (Write)', description: 'Manage financial data' },
  { value: 'documents:read', label: 'Documents (Read)', description: 'View documents' },
  { value: 'documents:write', label: 'Documents (Write)', description: 'Upload/manage documents' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
] as const;

/**
 * Utility: Format API key for display
 */
export function formatAPIKeyPrefix(prefix: string): string {
  if (!prefix) return '****';
  return prefix.substring(0, 8) + '...' + prefix.substring(prefix.length - 4);
}

/**
 * Utility: Check if API key is expired
 */
export function isAPIKeyExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Utility: Get time until expiration
 */
export function getTimeUntilExpiration(expiresAt: string | null): string {
  if (!expiresAt) return 'Never';

  const expires = new Date(expiresAt);
  const now = new Date();

  if (expires < now) return 'Expired';

  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
}
