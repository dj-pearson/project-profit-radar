import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';
import type { RecentEntityType } from './useRecentItems';

export interface FavoriteItem {
  id: string;
  entity_type: RecentEntityType;
  entity_id: string;
  entity_label: string;
  entity_url: string;
  created_at: string;
}

const QUERY_KEY = ['user-favorites'];

// `user_favorites` is created by migration 20260517000000 and isn't in the
// hand-maintained Supabase types, so the table reference is cast. Until the
// migration is applied the query fails closed (empty list) rather than
// breaking navigation.
const table = () => supabase.from('user_favorites' as never);

export function useFavorites() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: favorites = [], isLoading } = useQuery<FavoriteItem[]>({
    queryKey: QUERY_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (table() as any)
        .select('id, entity_type, entity_id, entity_label, entity_url, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        // Table missing (pre-migration) or RLS denial — degrade gracefully.
        return [];
      }
      return (data ?? []) as FavoriteItem[];
    },
  });

  const isFavorite = useCallback(
    (entityType: RecentEntityType, entityId: string) =>
      favorites.some(
        (f) => f.entity_type === entityType && f.entity_id === entityId
      ),
    [favorites]
  );

  const toggleMutation = useMutation({
    mutationFn: async (input: {
      entityType: RecentEntityType;
      entityId: string;
      label: string;
      url: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const existing = favorites.find(
        (f) =>
          f.entity_type === input.entityType && f.entity_id === input.entityId
      );

      if (existing) {
        const { error } = await (table() as any).delete().eq('id', existing.id);
        if (error) throw error;
        return { pinned: false };
      }

      const { error } = await (table() as any).insert({
        user_id: user.id,
        company_id: userProfile?.company_id ?? null,
        entity_type: input.entityType,
        entity_id: input.entityId,
        entity_label: input.label,
        entity_url: input.url,
      });
      if (error) throw error;
      return { pinned: true };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: result.pinned ? 'Added to favorites' : 'Removed from favorites',
      });
    },
    onError: (err: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Could not update favorites',
        description: err instanceof Error ? err.message : 'Please try again',
      });
    },
  });

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}
