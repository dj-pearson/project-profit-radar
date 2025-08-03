import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Video, Users, Play, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface CollaborationSession {
  id: string;
  title: string;
  description?: string;
  session_type: 'document' | 'whiteboard' | 'video_call';
  participants: any[];
  status: 'active' | 'ended';
  started_at: string;
  created_by: string;
}

export const CollaborationSessions: React.FC = () => {
  const { userProfile } = useAuth();
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('collaboration_sessions')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSessions(data as any || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [userProfile]);

  const createSession = async (title: string, type: 'video_call' | 'whiteboard' | 'document') => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('collaboration_sessions')
        .insert({
          company_id: userProfile.company_id,
          title,
          session_type: type,
          created_by: userProfile.id,
          participants: [userProfile.id]
        });

      if (error) throw error;
      loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Live Sessions</h3>
        <div className="flex gap-2">
          <Button onClick={() => createSession('Video Call', 'video_call')} size="sm">
            <Video className="h-4 w-4 mr-2" />
            Start Video Call
          </Button>
          <Button onClick={() => createSession('Whiteboard', 'whiteboard')} variant="outline" size="sm">
            Start Whiteboard
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-sm text-muted-foreground">Loading sessions...</div>
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No active sessions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a video call or whiteboard session to collaborate with your team
            </p>
            <Button onClick={() => createSession('Team Meeting', 'video_call')}>
              <Video className="h-4 w-4 mr-2" />
              Start First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    {session.title}
                  </CardTitle>
                  <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                    {session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {session.participants?.length || 0} participants
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Started {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {session.status === 'active' ? (
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Join
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <Square className="h-4 w-4 mr-2" />
                        Ended
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};