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
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Collaboration Hub</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Mobile-optimized tabs */}
            <div className="px-4 sm:px-6 mb-3 sm:mb-4">
              <div className="w-full overflow-x-auto">
                <TabsList className="grid w-max grid-cols-4 min-w-full h-11 sm:h-10">
                  <TabsTrigger value="chat" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Team Chat</span>
                    <span className="xs:hidden">Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Activity</span>
                    <span className="xs:hidden">Feed</span>
                  </TabsTrigger>
                  <TabsTrigger value="presence" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Team Status</span>
                    <span className="xs:hidden">Status</span>
                  </TabsTrigger>
                  <TabsTrigger value="sessions" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
                    <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Live Sessions</span>
                    <span className="xs:hidden">Live</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 px-3 sm:px-6 pb-4 sm:pb-6 min-h-0">
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