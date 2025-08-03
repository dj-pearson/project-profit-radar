import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Activity, Users, Video } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { ActivityFeed } from './ActivityFeed';
import { UserPresence } from './UserPresence';
import { CollaborationSessions } from './CollaborationSessions';

export const CollaborationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaboration Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-6 mb-4">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Team Chat
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Feed
              </TabsTrigger>
              <TabsTrigger value="presence" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Status
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Live Sessions
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 px-6 pb-6">
              <TabsContent value="chat" className="h-full m-0">
                <ChatInterface />
              </TabsContent>

              <TabsContent value="activity" className="h-full m-0">
                <ActivityFeed />
              </TabsContent>

              <TabsContent value="presence" className="h-full m-0">
                <UserPresence />
              </TabsContent>

              <TabsContent value="sessions" className="h-full m-0">
                <CollaborationSessions />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};