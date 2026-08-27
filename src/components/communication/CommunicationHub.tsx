import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar as CalendarIcon, FileText, Settings } from 'lucide-react';
import { ThreadManager } from "./ThreadManager";
import { AdvancedChatInterface } from "./AdvancedChatInterface";
import { useAdvancedChat } from "@/hooks/useAdvancedChat";



export const CommunicationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('messages');
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const { selectChannel } = useAdvancedChat();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Communication Hub</h1>
          <p className="text-muted-foreground">
            Project messaging and automated updates. RFI tracking and meeting scheduling are not
            built yet; those tabs say so rather than showing an empty list (US-296).
          </p>
        </div>

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
                  onThreadSelect={(thread) => {
                    setSelectedThread(thread);
                    selectChannel(thread as any);
                  }}
                  selectedThreadId={selectedThread?.id}
                />
              </div>

              {/* Enhanced Chat Interface */}
              <div className="lg:col-span-2">
                {selectedThread ? (
                  <AdvancedChatInterface 
                    thread={selectedThread}
                    onBack={() => setSelectedThread(null)}
                  />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select a conversation to start messaging</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Advanced features: File sharing, voice messages, search & more
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rfis" className="space-y-6">
            {/*
              This tab used to render a Create RFI dialog whose submit button had
              no onClick, over a list backed by `useState<RFI[]>([])` with no
              setter - permanently empty. The project and assignee options were
              hardcoded names ("Commercial Office Build", "David Brown
              (Architect)"). Someone could fill the form in, press Create RFI,
              and have nothing at all happen, on a screen that otherwise looked
              finished (US-296).

              No RFI table exists in supabase/migrations, so there is nothing to
              wire the form to. Saying so is the honest state until the feature
              is built.
            */}
            <Card>
              <CardHeader>
                <CardTitle>Request for Information (RFI) Management</CardTitle>
                <CardDescription>Not available yet.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  RFI tracking is not built. There is no RFI storage behind this tab, so nothing
                  entered here could be saved or sent.
                </p>
                <p>
                  Use the Messages tab to raise a question with the project team in the meantime.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            {/* Same as the RFI tab: a Schedule Meeting dialog with no onClick over
                a permanently empty list. No meeting storage exists (US-296). */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Coordination</CardTitle>
                <CardDescription>Not available yet.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Meeting scheduling is not built. There is no meeting storage behind this tab, so
                  nothing scheduled here would reach anyone.
                </p>
                <p>
                  The project calendar at <span className="font-medium">/calendar</span> is the
                  working surface for dates.
                </p>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
};

export default CommunicationHub;