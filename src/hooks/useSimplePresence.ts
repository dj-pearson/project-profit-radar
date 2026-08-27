import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface UserPresence {
  id: string;
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  location?: string;
  user_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

/**
 * Presence backed by the real `user_presence` table.
 *
 * This hook used to return four hardcoded people: the signed-in user, plus
 * "John Smith - online - Job Site Alpha", "Sarah Johnson - away - Job Site
 * Beta" and "Mike Davis - busy - Main Office". TeamPresencePanel and
 * UserPresenceIndicator render that straight to the screen, so a project
 * manager looking at who was on site was shown three colleagues who do not
 * exist, at locations nobody was at. On a construction platform "who is on site
 * right now" is an operational question, and inventing an answer is worse than
 * having none (US-309).
 *
 * `user_presence` has existed since migration 20250803232624 and
 * collaboration/UserPresence.tsx already reads it. The live columns are
 * company_id, status, last_seen_at, current_channel_id and metadata - there is
 * no `location` column, so location rides in metadata, which is what keeps this
 * hook's published shape unchanged for its two consumers.
 */
export const useSimplePresence = (projectId?: string) => {
  const { userProfile } = useAuth();
  const [presenceData, setPresenceData] = useState<UserPresence[]>([]);
  const [myPresence, setMyPresence] = useState<UserPresence | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadPresence = useCallback(async () => {
    if (!userProfile?.company_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select(`
          id,
          user_id,
          status,
          last_seen_at,
          metadata,
          user_profiles:user_id (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('company_id', userProfile.company_id)
        .order('last_seen_at', { ascending: false });

      if (error) throw error;

      const rows: UserPresence[] = ((data ?? []) as any[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        status: (row.status ?? 'offline') as UserPresence['status'],
        last_seen: row.last_seen_at,
        location: row.metadata?.location ?? undefined,
        user_profile: row.user_profiles
          ? {
              first_name: row.user_profiles.first_name ?? '',
              last_name: row.user_profiles.last_name ?? '',
              avatar_url: row.user_profiles.avatar_url ?? undefined,
            }
          : undefined,
      }));

      setPresenceData(rows);
      setMyPresence(rows.find((r) => r.user_id === userProfile.id) ?? null);
    } catch (error) {
      console.error('Failed to load presence:', error);
      // Empty is the honest answer when presence cannot be read. It is not a
      // reason to invent teammates.
      setPresenceData([]);
      setMyPresence(null);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.company_id, userProfile?.id]);

  // Update user's own presence. This used to set local state and toast "Status
  // Updated" without writing anything, so nobody else ever saw the change.
  const updatePresence = useCallback(async (
    status: UserPresence['status'],
    location?: string
  ) => {
    if (!userProfile?.company_id) return;

    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: userProfile.id,
        company_id: userProfile.company_id,
        status,
        last_seen_at: new Date().toISOString(),
        metadata: location ? { location } : {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Status not updated',
        description: error.message,
      });
      return;
    }

    toast({
      title: "Status Updated",
      description: `Your status is now "${status}"${location ? ` at ${location}` : ''}`,
    });

    await loadPresence();
  }, [userProfile?.company_id, userProfile?.id, loadPresence]);

  // Initialize presence data
  useEffect(() => {
    if (userProfile?.company_id) {
      loadPresence();
    }
  }, [userProfile?.company_id, loadPresence]);

  // Get users by status
  const getOnlineUsers = useCallback(() => {
    return presenceData.filter(p => p.status === 'online');
  }, [presenceData]);

  const getAwayUsers = useCallback(() => {
    return presenceData.filter(p => p.status === 'away');
  }, [presenceData]);

  const getBusyUsers = useCallback(() => {
    return presenceData.filter(p => p.status === 'busy');
  }, [presenceData]);

  // Get users in specific location
  const getUsersAtLocation = useCallback((location: string) => {
    return presenceData.filter(p => p.location === location);
  }, [presenceData]);

  // Get presence for specific user
  const getUserPresence = useCallback((userId: string) => {
    return presenceData.find(p => p.user_id === userId);
  }, [presenceData]);

  return {
    presenceData,
    myPresence,
    isLoading,
    updatePresence,
    loadPresence,
    getOnlineUsers,
    getAwayUsers,
    getBusyUsers,
    getUsersAtLocation,
    getUserPresence
  };
};