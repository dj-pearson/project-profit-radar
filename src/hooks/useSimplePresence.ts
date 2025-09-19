import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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

// Simple in-memory presence system for demonstration
export const useSimplePresence = (projectId?: string) => {
  const { userProfile } = useAuth();
  const [presenceData, setPresenceData] = useState<UserPresence[]>([]);
  const [myPresence, setMyPresence] = useState<UserPresence | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate team presence data
  const simulatePresenceData = useCallback(() => {
    if (!userProfile) return;

    const simulatedUsers: UserPresence[] = [
      {
        id: 'presence-1',
        user_id: userProfile.id,
        status: 'online',
        last_seen: new Date().toISOString(),
        location: 'Main Office',
        user_profile: {
          first_name: userProfile.first_name || 'You',
          last_name: userProfile.last_name || '',
          avatar_url: userProfile.avatar_url
        }
      },
      {
        id: 'presence-2',
        user_id: 'user-2',
        status: 'online',
        last_seen: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        location: 'Job Site Alpha',
        user_profile: {
          first_name: 'John',
          last_name: 'Smith',
          avatar_url: undefined
        }
      },
      {
        id: 'presence-3',
        user_id: 'user-3',
        status: 'away',
        last_seen: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        location: 'Job Site Beta',
        user_profile: {
          first_name: 'Sarah',
          last_name: 'Johnson',
          avatar_url: undefined
        }
      },
      {
        id: 'presence-4',
        user_id: 'user-4',
        status: 'busy',
        last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        location: 'Main Office',
        user_profile: {
          first_name: 'Mike',
          last_name: 'Davis',
          avatar_url: undefined
        }
      }
    ];

    setPresenceData(simulatedUsers);
    setMyPresence(simulatedUsers[0]);
  }, [userProfile]);

  // Update user's own presence
  const updatePresence = useCallback(async (
    status: UserPresence['status'],
    location?: string
  ) => {
    if (!userProfile) return;

    const updatedPresence: UserPresence = {
      id: 'presence-1',
      user_id: userProfile.id,
      status,
      last_seen: new Date().toISOString(),
      location,
      user_profile: {
        first_name: userProfile.first_name || 'You',
        last_name: userProfile.last_name || '',
        avatar_url: userProfile.avatar_url
      }
    };

    setMyPresence(updatedPresence);
    setPresenceData(prev => 
      prev.map(p => p.user_id === userProfile.id ? updatedPresence : p)
    );

    toast({
      title: "Status Updated",
      description: `Your status is now "${status}"${location ? ` at ${location}` : ''}`,
    });
  }, [userProfile]);

  // Load initial presence data
  const loadPresence = useCallback(async () => {
    setIsLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      simulatePresenceData();
      setIsLoading(false);
    }, 500);
  }, [simulatePresenceData]);

  // Initialize presence data
  useEffect(() => {
    if (userProfile) {
      loadPresence();
    }
  }, [userProfile, loadPresence]);

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