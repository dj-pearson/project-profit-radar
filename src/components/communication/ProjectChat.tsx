import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Paperclip, Image, FileText, MoreVertical, AtSign, Reply, Edit, Trash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  channel_id: string;
  message_type: string;
  attachments?: any[];
  mentions?: string[];
  reply_to_message_id?: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  replies?: Message[];
}

interface ProjectChatProps {
  channel: any;
  userProfile: any;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ channel, userProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (channel?.id) {
      loadMessages();
    }
  }, [channel?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!channel?.id) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Safely map the messages with proper type handling
      const mappedMessages: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        user_id: m.user_id,
        channel_id: m.channel_id,
        message_type: m.message_type || 'text',
        attachments: [],
        mentions: [],
        reply_to_message_id: m.reply_to,
        user_profiles: m.user_profiles ? {
          first_name: m.user_profiles.first_name || 'Unknown',
          last_name: m.user_profiles.last_name || 'User',
          avatar_url: m.user_profiles.avatar_url || null
        } : {
          first_name: 'Unknown',
          last_name: 'User',
          avatar_url: null
        },
        replies: []
      }));

      setMessages(mappedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channel?.id || !userProfile?.id) return;

    setLoading(true);
    try {
      const messageData = {
        channel_id: channel.id,
        company_id: userProfile.company_id,
        user_id: userProfile.id,
        content: newMessage.trim(),
        message_type: 'text',
        reply_to: replyingTo?.id || null,
        metadata: { mentions: extractMentions(newMessage) }
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      const newMsg: Message = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        channel_id: data.channel_id,
        message_type: data.message_type || 'text',
        attachments: [],
        mentions: extractMentions(newMessage),
        reply_to_message_id: data.reply_to,
        user_profiles: {
          first_name: userProfile.first_name || 'Unknown',
          last_name: userProfile.last_name || 'User',
          avatar_url: userProfile.avatar_url || null
        },
        replies: []
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setReplyingTo(null);
      
      // Send notifications for mentions
      const mentions = extractMentions(newMessage);
      if (mentions && mentions.length > 0) {
        await sendMentionNotifications(mentions, newMessage);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const sendMentionNotifications = async (mentions: string[], content: string) => {
    // This would typically send notifications to mentioned users
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    try {
      const attachments = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `chat-attachments/${channel.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: publicUrl
        });
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channel.id,
          company_id: userProfile.company_id,
          user_id: userProfile.id,
          content: `Shared ${files.length} file(s)`,
          message_type: 'file',
          metadata: { attachments }
        })
        .select()
        .single();

      if (error) throw error;

      const newMsg: Message = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        channel_id: data.channel_id,
        message_type: data.message_type || 'file',
        attachments: attachments,
        mentions: [],
        reply_to_message_id: data.reply_to,
        user_profiles: {
          first_name: userProfile.first_name || 'Unknown',
          last_name: userProfile.last_name || 'User',
          avatar_url: userProfile.avatar_url || null
        },
        replies: []
      };

      setMessages(prev => [...prev, newMsg]);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: Message) => {
    const isOwn = message.user_id === userProfile?.id;
    const userName = `${message.user_profiles?.first_name || ''} ${message.user_profiles?.last_name || ''}`.trim();
    
    return (
      <div key={message.id} className={`flex gap-3 p-3 hover:bg-accent/50 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.user_profiles?.avatar_url} />
          <AvatarFallback>
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {message.reply_to_message_id && (
            <div className="bg-muted p-2 rounded mb-2 text-sm">
              <div className="flex items-center gap-1">
                <Reply className="h-3 w-3" />
                <span className="text-muted-foreground">Replying to...</span>
              </div>
            </div>
          )}
          
          <div className={`inline-block max-w-md p-3 rounded-lg ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}>
            {message.message_type === 'file' && message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2 mb-2">
                {message.attachments.map((file: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {message.mentions && message.mentions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.mentions.map((mention, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    @{mention}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(message)}
              className="h-6 px-2"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            
            {isOwn && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-destructive">
                    <Trash className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{channel.name}</h2>
            {channel.project_name && (
              <p className="text-sm text-muted-foreground">{channel.project_name}</p>
            )}
          </div>
          <Badge variant="secondary">
            {messages.length} messages
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-t p-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4" />
              <span className="text-sm">
                Replying to {replyingTo.user_profiles?.first_name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-1">
            {replyingTo.content}
          </p>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              placeholder={`Message #${channel.name}`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
            >
              <AtSign className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line. Use @username to mention someone.
        </p>
      </div>
    </div>
  );
};