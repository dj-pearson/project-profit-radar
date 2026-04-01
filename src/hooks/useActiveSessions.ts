/**
 * Hook for managing and displaying active user sessions.
 * Uses the session management service to list and terminate sessions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  type SessionInfo,
} from '@/lib/security/sessionManagement';

export function useActiveSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['active-sessions', user?.id],
    queryFn: () => getActiveSessions(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
  });

  const terminateMutation = useMutation({
    mutationFn: (sessionId: string) => terminateSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
  });

  const terminateOthersMutation = useMutation({
    mutationFn: (currentSessionId: string) =>
      terminateAllOtherSessions(user!.id, currentSessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
  });

  return {
    sessions: sessionsQuery.data || [] as SessionInfo[],
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error,
    refetch: sessionsQuery.refetch,
    terminateSession: terminateMutation.mutate,
    terminateAllOthers: terminateOthersMutation.mutate,
    isTerminating: terminateMutation.isPending || terminateOthersMutation.isPending,
  };
}
