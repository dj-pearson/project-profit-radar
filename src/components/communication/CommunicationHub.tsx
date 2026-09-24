import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar as CalendarIcon, FileText, Settings } from 'lucide-react';
import { ThreadManager } from "./ThreadManager";
import { AdvancedChatInterface } from "./AdvancedChatInterface";
import { useAdvancedChat, type ChatChannel } from "@/hooks/useAdvancedChat";
import { useAuth } from "@/contexts/AuthContext";
import { useRFIsPage } from "@/hooks/useRFIsPage";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HubRFIPanel } from "./HubRFIPanel";
import { HubMeetingsPanel } from "./HubMeetingsPanel";

const ALL_PROJECTS = 'all';

/** The project both the RFIs and Meetings tabs narrow to. */
function ProjectFilter({
  value,
  onChange,
  projects,
  id,
}: {
  value: string;
  onChange: (id: string) => void;
  projects: { id: string; name: string }[];
  id: string;
}) {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor={id}>Project</Label>
      <Select value={value || ALL_PROJECTS} onValueChange={(v) => onChange(v === ALL_PROJECTS ? '' : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}



export const CommunicationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('messages');
  const [selectedThread, setSelectedThread] = useState<ChatChannel | null>(null);
  // One hook instance for the whole tab, so the list and the message pane read
  // the same state. Both children used to render invented data (US-309).
  const chat = useAdvancedChat();
  const { userProfile } = useAuth();
  const { loadChannels } = chat;
  // Projects come from the same query the RFI tab reads, so the picker and
  // the list agree on what exists.
  const rfiData = useRFIsPage();
  const projects = rfiData.query.data?.projects ?? [];
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  return (
    // The page title and description come from DashboardLayout in
    // pages/CommunicationPage (US-282), which owns the one <h1>.
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="messages" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages
        </TabsTrigger>
        <TabsTrigger value="rfis" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          RFIs
        </TabsTrigger>
        <TabsTrigger value="meetings" className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Meetings
        </TabsTrigger>
        <TabsTrigger value="updates" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Auto Updates
        </TabsTrigger>
      </TabsList>

      <TabsContent value="messages" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Enhanced Thread Manager */}
          <div className="lg:col-span-1">
            <ThreadManager
              channels={chat.channels}
              loading={chat.isLoading}
              onThreadSelect={(channel) => {
                setSelectedThread(channel);
                chat.selectChannel(channel);
              }}
              onCreateChannel={async (name) => {
                const row = await chat.createChannel(name);
                if (!row) return null;
                return {
                  id: row.id,
                  name: row.name,
                  description: row.description ?? undefined,
                  channel_type: row.channel_type as ChatChannel['channel_type'],
                  project_id: row.project_id ?? undefined,
                  is_private: row.is_private,
                  created_at: row.created_at,
                  created_by: row.created_by,
                  last_activity_at: row.last_activity_at ?? undefined,
                  member_count: 0,
                  unread_count: 0,
                };
              }}
              selectedThreadId={selectedThread?.id}
            />
          </div>

          {/* Enhanced Chat Interface */}
          <div className="lg:col-span-2">
            {selectedThread ? (
              <AdvancedChatInterface
                thread={selectedThread}
                messages={chat.messages}
                currentUserId={userProfile?.id}
                onSend={async (content, replyTo) => {
                  const saved = await chat.sendMessage(selectedThread.id, content, 'text', undefined, replyTo);
                  // Re-read rather than trust realtime to deliver our own row.
                  if (saved) await chat.loadMessages(selectedThread.id);
                  return saved;
                }}
                onBack={() => setSelectedThread(null)}
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="rfis" className="space-y-6">
        {/* The rfis table /rfis and the project hub already use (US-313). This
            tab was a mock form with no onClick over a list that could never
            fill (US-296). */}
        <ProjectFilter value={projectId} onChange={setProjectId} projects={projects} id="hub-project-rfis" />
        <HubRFIPanel projectId={projectId} />
      </TabsContent>

      <TabsContent value="meetings" className="space-y-6">
        {/* Folded into /calendar: meetings are project_calendar_events rows
            with event_type 'meeting', not a second store (US-313). */}
        <ProjectFilter value={projectId} onChange={setProjectId} projects={projects} id="hub-project-meetings" />
        <HubMeetingsPanel projectId={projectId} projects={projects} />
      </TabsContent>

      <TabsContent value="updates" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Automated Progress Updates</CardTitle>
            <CardDescription>Configure automated notifications and progress updates for clients and stakeholders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Daily Progress Photos</h3>
                  <p className="text-sm text-muted-foreground">Send daily photo updates to clients automatically</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Milestone Notifications</h3>
                  <p className="text-sm text-muted-foreground">Notify stakeholders when project milestones are reached</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Budget Updates</h3>
                  <p className="text-sm text-muted-foreground">Send weekly budget and cost reports to authorized personnel</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Schedule Changes</h3>
                  <p className="text-sm text-muted-foreground">Automatically notify affected parties of schedule modifications</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default CommunicationHub;