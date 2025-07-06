import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, Avatar as AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  Upload, 
  Image as ImageIcon, 
  File, 
  Download,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  sender_type: 'client' | 'contractor';
  message_text: string | null;
  attachments: string[] | null;
  message_type: 'text' | 'image' | 'file';
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

interface ProjectCommunicationProps {
  projectId: string;
  userType: 'client' | 'contractor';
}

export const ProjectCommunication: React.FC<ProjectCommunicationProps> = ({ 
  projectId, 
  userType 
}) => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
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
        sender_name: msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}`.trim() : 'Unknown'
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
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          sender_id: user.id,
          sender_type: userType,
          message_text: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
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

    // Check file size (max 10MB)
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-communications')
        .getPublicUrl(filePath);

      const messageType = file.type.startsWith('image/') ? 'image' : 'file';

      const { error: messageError } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          sender_id: user.id,
          sender_type: userType,
          message_text: file.name,
          attachments: [urlData.publicUrl],
          message_type: messageType
        });

      if (messageError) throw messageError;

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
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          {!isOwnMessage && (
            <div className="text-xs font-medium mb-1 opacity-70">
              {message.sender_name}
            </div>
          )}
          
          {message.message_type === 'text' && (
            <div className="text-sm">{message.message_text}</div>
          )}
          
          {message.message_type === 'image' && message.attachments && (
            <div className="space-y-2">
              <div className="text-sm">{message.message_text}</div>
              <img 
                src={message.attachments[0]} 
                alt="Shared image" 
                className="max-w-full h-auto rounded cursor-pointer"
                onClick={() => window.open(message.attachments?.[0], '_blank')}
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
                onClick={() => window.open(message.attachments?.[0], '_blank')}
                className="h-6 w-6 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div className={`text-xs mt-1 opacity-60 flex items-center justify-end space-x-1`}>
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
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Project Communication</CardTitle>
        <CardDescription>
          Communicate directly with your {userType === 'client' ? 'contractor' : 'client'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>

        <Separator />

        {/* Message Input */}
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept="image/*,application/pdf,.doc,.docx,.txt"
              className="hidden"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              size="sm"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            You can upload images, documents, and files up to 10MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
};