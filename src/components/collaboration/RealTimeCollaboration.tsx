import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, MessageCircle, Activity, Send, Eye, Edit3, Clock } from 'lucide-react';

interface ActiveUser {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  lastSeen: Date;
  currentPage?: string;
  isOnline: boolean;
}

interface LiveUpdate {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  projectId?: string;
}

interface RealTimeCollaborationProps {
  projectId?: string;
  showChat?: boolean;
  showActiveUsers?: boolean;
  showLiveUpdates?: boolean;
}

export const RealTimeCollaboration = ({
  projectId,
  showChat = true,
  showActiveUsers = true,
  showLiveUpdates = true
}: RealTimeCollaborationProps) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  // Initialize real-time connections
  useEffect(() => {
    if (!user || !userProfile?.company_id) return;

    initializeRealTimeFeatures();
    setupPresenceTracking();
    
    return () => {
      cleanupConnections();
    };
  }, [user, userProfile, projectId]);

  const initializeRealTimeFeatures = () => {
    // Set up real-time subscriptions
    setupActivityUpdates();
    setupChatSubscription();
    setupUserPresence();
    setIsConnected(true);
  };

  const setupPresenceTracking = () => {
    // Track user presence
    const updatePresence = () => {
      const presenceData = {
        user_id: user?.id,
        company_id: userProfile?.company_id,
        project_id: projectId,
        last_seen: new Date().toISOString(),
        current_page: window.location.pathname,
        is_online: true
      };

      // Store in localStorage for now
      const presence = JSON.parse(localStorage.getItem('user_presence') || '[]');
      const existingIndex = presence.findIndex((p: any) => p.user_id === user?.id);
      
      if (existingIndex >= 0) {
        presence[existingIndex] = presenceData;
      } else {
        presence.push(presenceData);
      }
      
      localStorage.setItem('user_presence', JSON.stringify(presence));
      loadActiveUsers();
    };

    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000); // Update every 30s

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      const presence = JSON.parse(localStorage.getItem('user_presence') || '[]');
      const updated = presence.map((p: any) => 
        p.user_id === user?.id ? { ...p, is_online: false } : p
      );
      localStorage.setItem('user_presence', JSON.stringify(updated));
    });

    return () => clearInterval(presenceInterval);
  };

  const setupActivityUpdates = () => {
    // Mock real-time activity updates
    const mockUpdates: LiveUpdate[] = [
      {
        id: '1',
        userId: user?.id || '',
        userName: userProfile?.first_name || 'User',
        action: 'updated',
        resource: 'task',
        resourceId: 'task-1',
        timestamp: new Date(Date.now() - 5 * 60000),
        metadata: { taskName: 'Foundation Pour' }
      },
      {
        id: '2',
        userId: 'other-user',
        userName: 'John Smith',
        action: 'completed',
        resource: 'inspection',
        resourceId: 'inspection-1',
        timestamp: new Date(Date.now() - 15 * 60000),
        metadata: { inspectionType: 'Safety Check' }
      }
    ];

    setLiveUpdates(mockUpdates);
  };

  const setupChatSubscription = () => {
    // Load existing chat messages
    const existingMessages = JSON.parse(localStorage.getItem(`chat_${projectId || 'general'}`) || '[]');
    setChatMessages(existingMessages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    })));
  };

  const setupUserPresence = () => {
    loadActiveUsers();
    
    // Update active users every 30 seconds
    const interval = setInterval(loadActiveUsers, 30000);
    return () => clearInterval(interval);
  };

  const loadActiveUsers = () => {
    const presence = JSON.parse(localStorage.getItem('user_presence') || '[]');
    const currentTime = new Date();
    
    const activeUsers: ActiveUser[] = presence
      .filter((p: any) => {
        const lastSeen = new Date(p.last_seen);
        const timeDiff = currentTime.getTime() - lastSeen.getTime();
        return timeDiff < 5 * 60000; // Consider active if seen within 5 minutes
      })
      .map((p: any) => ({
        id: p.user_id,
        name: p.user_id === user?.id ? 'You' : 'Team Member',
        role: 'Construction Worker',
        lastSeen: new Date(p.last_seen),
        currentPage: p.current_page,
        isOnline: p.is_online && (currentTime.getTime() - new Date(p.last_seen).getTime() < 2 * 60000)
      }));

    setActiveUsers(activeUsers);
  };

  const cleanupConnections = () => {
    setIsConnected(false);
    
    // Mark user as offline
    const presence = JSON.parse(localStorage.getItem('user_presence') || '[]');
    const updated = presence.map((p: any) => 
      p.user_id === user?.id ? { ...p, is_online: false } : p
    );
    localStorage.setItem('user_presence', JSON.stringify(updated));
  };

  const broadcastActivity = useCallback((action: string, resource: string, resourceId: string, metadata?: any) => {
    const update: LiveUpdate = {
      id: Date.now().toString(),
      userId: user?.id || '',
      userName: userProfile?.first_name || 'User',
      action,
      resource,
      resourceId,
      timestamp: new Date(),
      metadata
    };

    setLiveUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates

    // Store in localStorage
    const updates = JSON.parse(localStorage.getItem('live_updates') || '[]');
    updates.unshift(update);
    localStorage.setItem('live_updates', JSON.stringify(updates.slice(0, 100)));
  }, [user, userProfile]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      userName: userProfile?.first_name || 'User',
      userAvatar: undefined, // Avatar not available in current user profile
      message: newMessage.trim(),
      timestamp: new Date(),
      projectId
    };

    setChatMessages(prev => [...prev, message]);
    
    // Store in localStorage
    const messages = JSON.parse(localStorage.getItem(`chat_${projectId || 'general'}`) || '[]');
    messages.push(message);
    localStorage.setItem(`chat_${projectId || 'general'}`, JSON.stringify(messages));

    setNewMessage('');
    
    // Broadcast activity
    broadcastActivity('sent', 'message', message.id, { preview: newMessage.slice(0, 50) });
  };

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-500';
      case 'updated': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'deleted': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <Badge variant="outline">{activeUsers.length} online</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Users */}
        {showActiveUsers && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <CardTitle className="text-lg">Team Online</CardTitle>
              </div>
              <CardDescription>Currently active team members</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {activeUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                          user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getRelativeTime(user.lastSeen)}
                      </div>
                    </div>
                  ))}
                  {activeUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team members online
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Live Updates */}
        {showLiveUpdates && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <CardTitle className="text-lg">Live Activity</CardTitle>
              </div>
              <CardDescription>Real-time project updates</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {liveUpdates.map((update) => (
                    <div key={update.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getActionColor(update.action)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{update.userName}</span>
                          {' '}{update.action}{' '}
                          <span className="font-medium">{update.resource}</span>
                          {update.metadata?.taskName && (
                            <span className="text-muted-foreground"> "{update.metadata.taskName}"</span>
                          )}
                          {update.metadata?.inspectionType && (
                            <span className="text-muted-foreground"> "{update.metadata.inspectionType}"</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getRelativeTime(update.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {liveUpdates.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Team Chat */}
        {showChat && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <CardTitle className="text-lg">Team Chat</CardTitle>
              </div>
              <CardDescription>
                {projectId ? 'Project discussion' : 'General discussion'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={message.userAvatar} />
                        <AvatarFallback className="text-xs">
                          {message.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{message.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {getRelativeTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Separator />
              
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button size="sm" onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Collaboration Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => broadcastActivity('viewed', 'project', projectId || 'current')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Mark as Viewed
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => broadcastActivity('started', 'editing', 'document-1')}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Start Editing
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => broadcastActivity('clocked-in', 'time', 'current-shift')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Clock In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};