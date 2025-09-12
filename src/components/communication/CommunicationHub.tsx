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
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCommunicationData();
  }, []);

  const loadCommunicationData = async () => {
    setLoading(true);
    try {
      const { data: channels, error } = await supabase
        .from('chat_channels' as any)
        .select('id, name, project_id, last_activity_at, channel_type, description, created_at')
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      const mappedThreads: Thread[] = (channels || []).map((ch: any) => ({
        id: ch.id,
        title: ch.name || 'Channel',
        project_name: ch.project_id || 'Unassigned',
        participants: [],
        last_message: '',
        last_message_time: ch.last_activity_at || ch.created_at || new Date(0).toISOString(),
        unread_count: 0,
        thread_type: (ch.channel_type as any) || 'general',
        status: 'active'
      }));

      setThreads(mappedThreads);
      setRfis([]);
      setMeetings([]);
    } catch (error) {
      console.error('Failed to load communication data:', error);
      setThreads([]);
      setRfis([]);
      setMeetings([]);
      toast({
        title: "Error",
        description: "Failed to load communication data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .select('id, content, created_at, user_id')
        .eq('channel_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        sender_name: m.user_id || 'User',
        sender_role: 'user',
        content: m.content,
        timestamp: m.created_at,
        thread_id: threadId,
        message_type: 'text'
      }));

      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !userProfile?.id) return;

    try {
      const payload: any = {
        channel_id: selectedThread.id,
        content: newMessage.trim(),
        user_id: userProfile.id
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([payload])
        .select('id, content, created_at, user_id')
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error('No data returned from message insert');
      }

      // Cast to any to handle type issues
      const result = data as any;

      const message: Message = {
        id: result.id || '',
        sender_name: result.user_id || 'User',
        sender_role: 'user',
        content: result.content || '',
        timestamp: result.created_at || new Date().toISOString(),
        thread_id: selectedThread.id,
        message_type: 'text'
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Thread List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Conversations
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {threads.map((thread) => (
                      <div
                        key={thread.id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedThread?.id === thread.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => {
                          setSelectedThread(thread);
                          loadMessages(thread.id);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-sm">{thread.title}</h3>
                          {thread.unread_count > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                              {thread.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{thread.project_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">{thread.thread_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(thread.last_message_time), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Message View */}
              <Card className="lg:col-span-2">
                {selectedThread ? (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {selectedThread.title}
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        {selectedThread.project_name} • {selectedThread.participants.join(', ')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                        {messages.map((message) => (
                          <div key={message.id} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {message.sender_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{message.sender_name}</span>
                                <Badge variant="outline" className="text-xs">{message.sender_role}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(message.timestamp), 'MMM d, HH:mm')}
                                </span>
                              </div>
                              <p className={`text-sm ${
                                message.message_type === 'system' ? 'italic text-muted-foreground' : ''
                              }`}>
                                {message.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          className="flex-1"
                        />
                        <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select a conversation to start messaging</p>
                    </div>
                  </CardContent>
                )}
              </Card>
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