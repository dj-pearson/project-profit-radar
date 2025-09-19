import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  timestamp: string;
  message_type: 'text' | 'file' | 'image' | 'voice' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  voice_duration?: number;
  reply_to?: string;
  edited_at?: string;
  mentions?: string[];
  reactions?: { [emoji: string]: string[] };
  channel_id: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  channel_type: 'direct' | 'group' | 'project' | 'announcement';
  project_id?: string;
  is_private: boolean;
  created_at: string;
  created_by: string;
  last_activity_at?: string;
  member_count: number;
  unread_count: number;
}

export const useAdvancedChat = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Load channels
  const loadChannels = useCallback(async () => {
    if (!userProfile?.company_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select(`
          id,
          name,
          description,
          channel_type,
          project_id,
          is_private,
          created_at,
          created_by,
          last_activity_at
        `)
        .eq('company_id', userProfile.company_id)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

  // Fix type compatibility for channel_type
  const channelsWithCounts: ChatChannel[] = (data || []).map(channel => ({
    ...channel,
    channel_type: (channel.channel_type as 'direct' | 'group' | 'project' | 'announcement') || 'group',
    member_count: 0, // TODO: Get actual member count
    unread_count: 0  // TODO: Get actual unread count
  }));

      setChannels(channelsWithCounts);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast({
        title: "Error",
        description: "Failed to load chat channels",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.company_id, toast]);

  // Load messages for a channel
  const loadMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          user_id,
          created_at,
          message_type,
          file_url,
          file_name,
          file_size,
          reply_to,
          edited_at,
          channel_id
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Transform to ChatMessage format
      const transformedMessages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content || '',
        sender_id: msg.user_id,
        sender_name: 'User', // TODO: Get actual user name
        timestamp: msg.created_at,
        message_type: (msg.message_type as any) || 'text',
        file_url: msg.file_url,
        file_name: msg.file_name,
        file_size: msg.file_size,
        reply_to: msg.reply_to,
        edited_at: msg.edited_at,
        channel_id: msg.channel_id
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Send message
  const sendMessage = useCallback(async (
    channelId: string,
    content: string,
    messageType: ChatMessage['message_type'] = 'text',
    fileData?: {
      url: string;
      name: string;
      size: number;
    },
    replyTo?: string
  ) => {
    if (!userProfile?.id || !content.trim()) return null;

    try {
      const messageData = {
        channel_id: channelId,
        company_id: userProfile.company_id, // Add required company_id
        user_id: userProfile.id,
        content: content.trim(),
        message_type: messageType,
        file_url: fileData?.url,
        file_name: fileData?.name,
        file_size: fileData?.size,
        reply_to: replyTo
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;

      // Update channel last activity
      await supabase
        .from('chat_channels')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', channelId);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return null;
    }
  }, [userProfile?.id, toast]);

  // Upload file
  const uploadFile = useCallback(async (file: File, channelId: string) => {
    if (!userProfile?.company_id) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.company_id}/${channelId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        name: file.name,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      return null;
    }
  }, [userProfile?.company_id, toast]);

  // Create channel
  const createChannel = useCallback(async (
    name: string,
    description?: string,
    channelType: ChatChannel['channel_type'] = 'group',
    projectId?: string,
    isPrivate: boolean = false
  ) => {
    if (!userProfile?.company_id || !userProfile?.id) return null;

    try {
      const channelData = {
        name,
        description,
        channel_type: channelType,
        project_id: projectId,
        is_private: isPrivate,
        company_id: userProfile.company_id,
        created_by: userProfile.id
      };

      const { data, error } = await supabase
        .from('chat_channels')
        .insert([channelData])
        .select()
        .single();

      if (error) throw error;

      // Add creator as member
      await supabase
        .from('chat_channel_members')
        .insert([{
          channel_id: data.id,
          company_id: userProfile.company_id, // Add required company_id
          user_id: userProfile.id,
          role: 'admin',
          joined_at: new Date().toISOString()
        }]);

      await loadChannels();
      return data;
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
      return null;
    }
  }, [userProfile, loadChannels, toast]);

  // Search messages
  const searchMessages = useCallback(async (query: string, channelId?: string) => {
    if (!query.trim()) return [];

    try {
      let queryBuilder = supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          user_id,
          created_at,
          channel_id
        `)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (channelId) {
        queryBuilder = queryBuilder.eq('channel_id', channelId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, []);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!userProfile?.company_id) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          const chatMessage: ChatMessage = {
            id: newMessage.id,
            content: newMessage.content || '',
            sender_id: newMessage.user_id,
            sender_name: 'User', // TODO: Get actual user name
            timestamp: newMessage.created_at,
            message_type: newMessage.message_type || 'text',
            file_url: newMessage.file_url,
            file_name: newMessage.file_name,
            file_size: newMessage.file_size,
            reply_to: newMessage.reply_to,
            edited_at: newMessage.edited_at,
            channel_id: newMessage.channel_id
          };

          setMessages(prev => [...prev, chatMessage]);
        }
      )
      .subscribe();

    // Subscribe to channel updates
    const channelsChannel = supabase
      .channel('chat_channels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels'
        },
        () => {
          loadChannels();
        }
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
      channelsChannel.unsubscribe();
    };
  }, [userProfile?.company_id, loadChannels]);

  // Set active channel
  const selectChannel = useCallback((channel: ChatChannel) => {
    setActiveChannel(channel);
    loadMessages(channel.id);
  }, [loadMessages]);

  return {
    channels,
    messages,
    activeChannel,
    isLoading,
    isTyping,
    onlineUsers,
    loadChannels,
    loadMessages,
    sendMessage,
    uploadFile,
    createChannel,
    searchMessages,
    selectChannel
  };
};