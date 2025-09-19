import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  MessageSquare, 
  Send, 
  Calendar as CalendarIcon, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Paperclip,
  Phone,
  Video,
  Settings
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { ThreadManager } from "./ThreadManager";
import { AdvancedChatInterface } from "./AdvancedChatInterface";
import { useAdvancedChat } from "@/hooks/useAdvancedChat";

interface Message {
  id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  timestamp: string;
  thread_id: string;
  attachments?: string[];
  message_type: 'text' | 'system' | 'update';
}

interface Thread {
  id: string;
  title: string;
  project_name: string;
  participants: string[];
  last_message: string;
  last_message_time: string;
  unread_count: number;
  thread_type: 'project' | 'rfi' | 'submittal' | 'general';
  status: 'active' | 'resolved' | 'closed';
}

interface RFI {
  id: string;
  number: string;
  title: string;
  description: string;
  project_name: string;
  requested_by: string;
  assigned_to: string;
  due_date: string;
  status: 'open' | 'in_review' | 'answered' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  response?: string;
  attachments: string[];
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  project_name: string;
  date: string;
  time: string;
  duration: number;
  attendees: string[];
  location: string;
  meeting_type: 'kickoff' | 'progress' | 'safety' | 'coordination' | 'client';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  action_items?: {item: string, assigned_to: string, due_date: string}[];
}

export const CommunicationHub: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('messages');
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { channels, activeChannel, selectChannel } = useAdvancedChat();

  useEffect(() => {
    // Load initial data if needed
  }, []);

  // Legacy function - now handled by useAdvancedChat hook
  const loadCommunicationData = async () => {
    // This function is no longer needed as data loading is handled by the hook
  };

  // Legacy function - now handled by AdvancedChatInterface
  const loadMessages = async (threadId: string) => {
    // This function is no longer needed
  };

  // Legacy function - now handled by AdvancedChatInterface
  const sendMessage = async () => {
    // This function is no longer needed
  };

  const createRFI = async (rfiData: Partial<RFI>) => {
    toast({
      title: "Not implemented",
      description: "Connect RFI tables to enable this action.",
      variant: "destructive",
    });
  };

  const scheduleMeeting = async (meetingData: Partial<Meeting>) => {
    toast({
      title: "Not implemented",
      description: "Connect meeting tables to enable scheduling.",
      variant: "destructive",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'answered': case 'resolved': return 'default';
      case 'in_progress': case 'in_review': case 'scheduled': return 'secondary';
      case 'urgent': case 'high': case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Communication Hub</h1>
          <p className="text-muted-foreground">Unified messaging, RFI management, and meeting coordination for all project stakeholders.</p>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Request for Information (RFI) Management
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create RFI
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New RFI</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input placeholder="RFI Title" />
                        <Textarea placeholder="Description and details..." rows={4} />
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="project1">Commercial Office Build</SelectItem>
                            <SelectItem value="project2">Residential Build - Smith House</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-4">
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Assign To" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="architect">David Brown (Architect)</SelectItem>
                              <SelectItem value="engineer">Alex Chen (Engineer)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full">Create RFI</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rfis.map((rfi) => (
                    <Card key={rfi.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{rfi.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {rfi.number} • {rfi.project_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(rfi.status)}>
                              {rfi.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant={getPriorityColor(rfi.priority)}>
                              {rfi.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm mb-3">{rfi.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Requested By</p>
                            <p className="text-sm font-medium">{rfi.requested_by}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Assigned To</p>
                            <p className="text-sm font-medium">{rfi.assigned_to}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Due Date</p>
                            <p className="text-sm font-medium">{format(new Date(rfi.due_date), 'MMM d, yyyy')}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm font-medium">{format(new Date(rfi.created_at), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        
                        {rfi.response && (
                          <div className="bg-muted p-3 rounded-lg mb-3">
                            <p className="text-sm font-medium mb-1">Response:</p>
                            <p className="text-sm">{rfi.response}</p>
                          </div>
                        )}
                        
                        {rfi.attachments.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-2">Attachments:</p>
                            <div className="flex flex-wrap gap-2">
                              {rfi.attachments.map((attachment, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Paperclip className="h-3 w-3 mr-1" />
                                  {attachment}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {rfi.status === 'open' && (
                            <Button size="sm">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Respond
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Discuss
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Meeting Scheduling & Notes
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Meeting
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Schedule New Meeting</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input placeholder="Meeting Title" />
                        <Textarea placeholder="Meeting description..." rows={3} />
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="project1">Commercial Office Build</SelectItem>
                            <SelectItem value="project2">Residential Build - Smith House</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="justify-start">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Input type="time" defaultValue="09:00" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input placeholder="Duration (minutes)" type="number" defaultValue="60" />
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Meeting Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kickoff">Kickoff</SelectItem>
                              <SelectItem value="progress">Progress</SelectItem>
                              <SelectItem value="safety">Safety</SelectItem>
                              <SelectItem value="coordination">Coordination</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Input placeholder="Location" />
                        <Textarea placeholder="Attendees (one per line)..." rows={3} />
                        <Button className="w-full">Schedule Meeting</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <Card key={meeting.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{meeting.title}</h3>
                            <p className="text-sm text-muted-foreground">{meeting.project_name}</p>
                          </div>
                          <Badge variant={getStatusColor(meeting.status)}>
                            {meeting.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <p className="text-sm mb-3">{meeting.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Date & Time</p>
                            <p className="text-sm font-medium">
                              {format(new Date(meeting.date), 'MMM d, yyyy')} at {meeting.time}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium">{meeting.duration} minutes</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-sm font-medium">{meeting.location}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Type</p>
                            <Badge variant="outline">{meeting.meeting_type}</Badge>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm font-medium mb-2">Attendees:</p>
                          <div className="flex flex-wrap gap-1">
                            {meeting.attendees.map((attendee, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {attendee}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {meeting.notes && (
                          <div className="bg-muted p-3 rounded-lg mb-3">
                            <p className="text-sm font-medium mb-1">Meeting Notes:</p>
                            <p className="text-sm">{meeting.notes}</p>
                          </div>
                        )}
                        
                        {meeting.action_items && meeting.action_items.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-2">Action Items:</p>
                            <div className="space-y-2">
                              {meeting.action_items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                  <span className="text-sm">{item.item}</span>
                                  <div className="text-xs text-muted-foreground">
                                    {item.assigned_to} • Due: {format(new Date(item.due_date), 'MMM d')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {meeting.status === 'scheduled' && (
                            <>
                              <Button size="sm">
                                <Video className="h-4 w-4 mr-2" />
                                Join Meeting
                              </Button>
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />
                                Add Notes
                              </Button>
                            </>
                          )}
                          {meeting.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              View Notes
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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