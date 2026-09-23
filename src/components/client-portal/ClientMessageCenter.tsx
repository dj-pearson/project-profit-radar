import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Upload, File, Download, Clock, Check, CheckCheck, HelpCircle, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StorageImage } from '@/lib/storage/StorageImage';
import { Skeleton } from '@/components/ui/skeleton';
import { openStorageObject } from '@/lib/storage/signedUrl';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ListSkeleton } from '@/components/ui/skeletons';

interface Message {
  id: string;
  sender_id: string;
  sender_type: 'client' | 'contractor';
  message_text: string | null;
  attachments: string[] | null;
  message_type: 'text' | 'image' | 'file';
  category?: 'question' | 'update' | 'approval' | 'concern' | 'general';
  priority?: 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

interface ClientMessageCenterProps {
  projectId: string;
}

/**
 * The embed returns no profile when RLS hides it; say who the other side is
 * rather than printing "Unknown".
 */
function senderLabel(
  sender: { first_name: string | null; last_name: string | null } | null | undefined,
  senderType: string,
): string {
  const name = [sender?.first_name, sender?.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  return senderType === 'contractor' ? 'Your contractor' : 'Client';
}

/**
 * Whether the signed-in client is in this project's conversation (US-316).
 * project_messages admits a client only through project_communication_participants,
 * which portal enrolment keeps in step. 'none' means the composer would be
 * refused by RLS, so the page says why instead of offering it.
 */
type Membership = { state: 'loading' } | { state: 'none' } | { state: 'member'; canUpload: boolean };

export const ClientMessageCenter: React.FC<ClientMessageCenterProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageCategory, setMessageCategory] = useState<Message['category']>('general');
  const [messagePriority, setMessagePriority] = useState<Message['priority']>('normal');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<Membership>({ state: 'loading' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadMessages();
    // Returning the cleanup matters: without it every project switch left a
    // live channel behind, each appending to this list.
    return setupRealtimeSubscription();
  }, [projectId]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setMembership({ state: 'loading' });
    void (async () => {
      const { data, error } = await supabase
        .from('project_communication_participants')
        .select('can_upload_files')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('Error checking conversation membership:', error);
        setMembership({ state: 'none' });
        return;
      }
      setMembership(data ? { state: 'member', canUpload: data.can_upload_files } : { state: 'none' });
    })();
    return () => { cancelled = true; };
  }, [projectId, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const { data, error } = await supabase
        .from('project_messages')
        .select(`
          *,
          sender:user_profiles!project_messages_sender_id_fkey(first_name, last_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        ...msg,
        sender_type: msg.sender_type as 'client' | 'contractor',
        message_type: msg.message_type as 'text' | 'image' | 'file',
        category: msg.category as Message['category'],
        priority: msg.priority as Message['priority'],
        sender_name: senderLabel(msg.sender, msg.sender_type)
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`project_messages_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          const incoming = payload.new as Message;
          // The sender's own insert also reloads the list, so the same row can
          // arrive twice.
          setMessages(prev => prev.some(m => m.id === incoming.id)
            ? prev
            : [...prev, { ...incoming, sender_name: incoming.sender_name ?? senderLabel(null, incoming.sender_type) }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || membership.state !== 'member') return;

    try {
      const { error } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          sender_id: user.id,
          sender_type: 'client',
          message_text: newMessage.trim(),
          message_type: 'text',
          category: messageCategory,
          priority: messagePriority
        });

      if (error) throw error;

      setNewMessage('');
      setMessageCategory('general');
      setMessagePriority('normal');
      // Do not rely on realtime alone to show the sender their own message.
      void loadMessages(false);

      toast({
        title: "Message sent",
        description: "Your message has been delivered to your contractor"
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select a file smaller than 10MB"
      });
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${projectId}/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-communications')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Persist the storage path, not a permanent public URL (US-289).
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';

      const { error: messageError } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          sender_id: user.id,
          sender_type: 'client',
          message_text: file.name,
          attachments: [filePath],
          message_type: messageType,
          category: messageCategory,
          priority: messagePriority
        });

      if (messageError) throw messageError;
      void loadMessages(false);

      toast({
        title: "File uploaded",
        description: "Your file has been shared successfully"
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload file. Please try again."
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getCategoryIcon = (category?: Message['category']) => {
    switch (category) {
      case 'question':
        return <HelpCircle className="h-4 w-4" />;
      case 'concern':
        return <AlertCircle className="h-4 w-4" />;
      case 'approval':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'update':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCategoryBadge = (category?: Message['category'], priority?: Message['priority']) => {
    if (!category || category === 'general') return null;

    const categoryConfig: Record<string, { label: string; className: string }> = {
      question: { label: 'Question', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      concern: { label: 'Concern', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
      approval: { label: 'Approval', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      update: { label: 'Update', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
    };

    const config = categoryConfig[category];
    if (!config) return null;

    return (
      <Badge variant="outline" className={cn("text-xs", config.className)}>
        {getCategoryIcon(category)}
        <span className="ml-1">{config.label}</span>
        {priority === 'high' || priority === 'urgent' ? ' - High Priority' : ''}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.sender_id === user?.id;

    return (
      <div
        key={message.id}
        className={cn(
          "flex mb-4",
          isOwnMessage ? 'justify-end' : 'justify-start'
        )}
      >
        <div className={cn(
          "max-w-xs lg:max-w-md px-4 py-3 rounded-lg",
          isOwnMessage
            ? 'bg-blue-600 text-white'
            : 'bg-muted'
        )}>
          {!isOwnMessage && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-70">
                {message.sender_name}
              </span>
              {getCategoryBadge(message.category, message.priority)}
            </div>
          )}

          {isOwnMessage && message.category && message.category !== 'general' && (
            <div className="mb-2">
              {getCategoryBadge(message.category, message.priority)}
            </div>
          )}

          {message.message_type === 'text' && (
            <div className="text-sm whitespace-pre-wrap">{message.message_text}</div>
          )}

          {message.message_type === 'image' && message.attachments && (
            <div className="space-y-2">
              <div className="text-sm">{message.message_text}</div>
              <StorageImage
                bucket="project-communications"
                stored={message.attachments[0]}
                alt="Shared image"
                className="max-w-full h-auto rounded"
                fallback={<Skeleton className="h-40 w-full rounded" />}
              />
            </div>
          )}

          {message.message_type === 'file' && message.attachments && (
            <div className="flex items-center space-x-2">
              <File className="h-4 w-4" />
              <div className="flex-1 text-sm">{message.message_text}</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { void openStorageObject('project-communications', message.attachments?.[0]); }}
                className="h-6 w-6 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className={cn(
            "text-xs mt-2 opacity-60 flex items-center justify-end space-x-1"
          )}>
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(message.created_at)}</span>
            {isOwnMessage && (
              message.is_read ?
                <CheckCheck className="h-3 w-3" /> :
                <Check className="h-3 w-3" />
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <ListSkeleton label="Loading messages" />
        </CardContent>
      </Card>
    );
  }

  const questionMessages = messages.filter(m => m.category === 'question');
  const concernMessages = messages.filter(m => m.category === 'concern');
  const approvalMessages = messages.filter(m => m.category === 'approval');
  const allMessages = messages;

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle>Message Center</CardTitle>
        <CardDescription>
          Communicate directly with your project team
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({allMessages.length})
            </TabsTrigger>
            <TabsTrigger value="questions">
              Questions ({questionMessages.length})
            </TabsTrigger>
            <TabsTrigger value="concerns">
              Concerns ({concernMessages.length})
            </TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals ({approvalMessages.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 flex flex-col overflow-hidden mt-0">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {allMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {allMessages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="questions" className="flex-1 flex flex-col overflow-hidden mt-0">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {questionMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No questions yet</p>
                </div>
              ) : (
                <>
                  {questionMessages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="concerns" className="flex-1 flex flex-col overflow-hidden mt-0">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {concernMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No concerns raised</p>
                </div>
              ) : (
                <>
                  {concernMessages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="approvals" className="flex-1 flex flex-col overflow-hidden mt-0">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {approvalMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No approvals needed</p>
                </div>
              ) : (
                <>
                  {approvalMessages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>

      {/* Message Input */}
      {membership.state === 'none' ? (
        <CardContent className="border-t p-4">
          <p className="text-sm text-muted-foreground" role="status">
            You have not been added to this project's conversation yet. Ask your contractor
            to check your portal access for this project.
          </p>
        </CardContent>
      ) : (
      <CardContent className="border-t p-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={messageCategory} onValueChange={(v) => setMessageCategory(v as Message['category'])}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Message</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="concern">Concern</SelectItem>
                <SelectItem value="approval">Needs Approval</SelectItem>
                <SelectItem value="update">Update Request</SelectItem>
              </SelectContent>
            </Select>

            <Select value={messagePriority} onValueChange={(v) => setMessagePriority(v as Message['priority'])}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end space-x-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              className="flex-1 min-h-[60px] max-h-[120px]"
            />

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept="image/*,application/pdf,.doc,.docx,.txt"
              className="hidden"
            />

            {membership.state === 'member' && membership.canUpload && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shrink-0"
                aria-label="Attach a file"
              >
                {uploading ? (
                  <LoadingSpinner size="sm" tone="current" label={null} />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || membership.state !== 'member'}
              size="icon"
              className="shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line.
            {membership.state === 'member' && membership.canUpload ? ' Files up to 10MB.' : ''}
          </p>
        </div>
      </CardContent>
      )}
    </Card>
  );
};
