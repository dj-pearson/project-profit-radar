import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  Circle,
  Clock,
  AlertCircle,
  Power,
  MessageSquare,
  Video,
  Phone
} from 'lucide-react';

interface UserPresenceData {
  id: string;
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  current_channel_id?: string;
  last_seen_at: string;
  updated_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  chat_channels?: {
    name: string;
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'online':
      return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
    case 'away':
      return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'busy':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    case 'offline':
      return <Power className="h-3 w-3 text-gray-400" />;
    default:
      return <Circle className="h-3 w-3 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    case 'offline':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};

export const UserPresence: React.FC = () => {
  const { userProfile } = useAuth();
  const [userPresences, setUserPresences] = useState<UserPresenceData[]>([]);
  const [myStatus, setMyStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');
  const [loading, setLoading] = useState(true);

  const loadUserPresences = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select(`
          *,
          user_profiles:user_id (
            first_name,
            last_name,
            email,
            role
          ),
          chat_channels:current_channel_id (
            name
          )
        `)
        .eq('company_id', userProfile.company_id)
        .order('status', { ascending: true })
        .order('last_seen_at', { ascending: false });

      if (error) throw error;
      setUserPresences(data as any || []);

      // Find current user's status
      const currentUser = data?.find(p => p.user_id === userProfile.id);
      if (currentUser) {
        setMyStatus(currentUser.status as any);
      }
    } catch (error) {
      console.error('Error loading user presences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMyStatus = async (newStatus: 'online' | 'away' | 'busy' | 'offline') => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userProfile.id,
          company_id: userProfile.company_id,
          status: newStatus,
          last_seen_at: new Date().toISOString()
        });

      if (error) throw error;
      setMyStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  useEffect(() => {
    loadUserPresences();
  }, [userProfile]);

  // Set up real-time presence tracking
  useEffect(() => {
    if (!userProfile?.company_id) return;

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `company_id=eq.${userProfile.company_id}`
        },
        () => {
          loadUserPresences();
        }
      )
      .subscribe();

    // Update own presence to online
    updateMyStatus('online');

    // Update presence periodically
    const presenceInterval = setInterval(() => {
      if (myStatus !== 'offline') {
        supabase
          .from('user_presence')
          .upsert({
            user_id: userProfile.id,
            company_id: userProfile.company_id,
            status: myStatus,
            last_seen_at: new Date().toISOString()
          });
      }
    }, 30000); // Update every 30 seconds

    // Set offline when user leaves
    const handleBeforeUnload = () => {
      supabase
        .from('user_presence')
        .upsert({
          user_id: userProfile.id,
          company_id: userProfile.company_id,
          status: 'offline',
          last_seen_at: new Date().toISOString()
        });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      supabase.removeChannel(presenceChannel);
      clearInterval(presenceInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userProfile, myStatus]);

  const onlineUsers = userPresences.filter(p => p.status === 'online');
  const awayUsers = userPresences.filter(p => p.status === 'away');
  const busyUsers = userPresences.filter(p => p.status === 'busy');
  const offlineUsers = userPresences.filter(p => p.status === 'offline');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-muted-foreground">Loading team status...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {getStatusIcon(myStatus)}
            My Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              variant={myStatus === 'online' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateMyStatus('online')}
              className="flex items-center gap-2"
            >
              <Circle className="h-3 w-3 fill-green-500 text-green-500" />
              Online
            </Button>
            <Button
              variant={myStatus === 'away' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateMyStatus('away')}
              className="flex items-center gap-2"
            >
              <Clock className="h-3 w-3 text-yellow-500" />
              Away
            </Button>
            <Button
              variant={myStatus === 'busy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateMyStatus('busy')}
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-3 w-3 text-red-500" />
              Busy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Status */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4">
          {/* Online Users */}
          {onlineUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                Online ({onlineUsers.length})
              </h3>
              <div className="space-y-2">
                {onlineUsers.map((presence) => {
                  const userInitials = presence.user_profiles 
                    ? `${presence.user_profiles.first_name?.charAt(0) || ''}${presence.user_profiles.last_name?.charAt(0) || ''}`
                    : '?';

                  const userName = presence.user_profiles 
                    ? `${presence.user_profiles.first_name} ${presence.user_profiles.last_name}`
                    : 'Unknown User';

                  return (
                    <Card key={presence.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(presence.status)}`} />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{userName}</div>
                            {presence.user_profiles?.role && (
                              <Badge variant="secondary" className="text-xs">
                                {presence.user_profiles.role}
                              </Badge>
                            )}
                            {presence.chat_channels?.name && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MessageSquare className="h-3 w-3" />
                                {presence.chat_channels.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Away Users */}
          {awayUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3 text-yellow-500" />
                Away ({awayUsers.length})
              </h3>
              <div className="space-y-2">
                {awayUsers.map((presence) => {
                  const userInitials = presence.user_profiles 
                    ? `${presence.user_profiles.first_name?.charAt(0) || ''}${presence.user_profiles.last_name?.charAt(0) || ''}`
                    : '?';

                  const userName = presence.user_profiles 
                    ? `${presence.user_profiles.first_name} ${presence.user_profiles.last_name}`
                    : 'Unknown User';

                  return (
                    <Card key={presence.id} className="p-3 opacity-75">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(presence.status)}`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{userName}</div>
                          <div className="text-xs text-muted-foreground">
                            Last seen {formatDistanceToNow(new Date(presence.last_seen_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Busy Users */}
          {busyUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-red-500" />
                Busy ({busyUsers.length})
              </h3>
              <div className="space-y-2">
                {busyUsers.map((presence) => {
                  const userInitials = presence.user_profiles 
                    ? `${presence.user_profiles.first_name?.charAt(0) || ''}${presence.user_profiles.last_name?.charAt(0) || ''}`
                    : '?';

                  const userName = presence.user_profiles 
                    ? `${presence.user_profiles.first_name} ${presence.user_profiles.last_name}`
                    : 'Unknown User';

                  return (
                    <Card key={presence.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(presence.status)}`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{userName}</div>
                          <Badge variant="destructive" className="text-xs">
                            Do not disturb
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};