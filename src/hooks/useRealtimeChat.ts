import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
  created_at: string;
  edited_at?: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ChatChannel {
  id: string;
  company_id: string;
  project_id?: string;
  name: string;
  description?: string;
  channel_type: 'project' | 'team' | 'direct';
  is_private: boolean;
  created_by: string;
  created_at: string;
  last_activity_at: string;
  unread_count?: number;
}

export const useRealtimeChat = (channelId?: string) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load channels for the company
  const loadChannels = useCallback(async () => {
    if (!userProfile?.company_id) return;

    try {
      // Get channels user is member of
      const { data: memberChannels, error: memberError } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', userProfile.id);

      if (memberError) throw memberError;

      const channelIds = memberChannels?.map(m => m.channel_id) || [];

      if (channelIds.length === 0) {
        setChannels([]);
        return;
      }

      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .eq('company_id', userProfile.company_id)
        .is('archived_at', null)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      setChannels((data as ChatChannel[]) || []);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast({
        title: "Error",
        description: "Failed to load chat channels",
        variant: "destructive"
      });
    }
  }, [userProfile, toast]);

  // Load messages for a specific channel
  const loadMessages = useCallback(async (channelId: string) => {
    if (!userProfile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user_profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data as any || []);

      // Mark messages as read
      await supabase
        .from('chat_channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', userProfile.id);

    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile, toast]);

  // Send a message
  const sendMessage = useCallback(async (content: string, replyTo?: string) => {
    if (!userProfile || !activeChannel || !content.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: activeChannel.id,
          user_id: userProfile.id,
          company_id: userProfile.company_id,
          message_type: 'text',
          content: content.trim(),
          reply_to: replyTo
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  }, [userProfile, activeChannel, toast]);

  // Send a file message
  const sendFile = useCallback(async (file: File) => {
    if (!userProfile || !activeChannel) return;

    try {
      setSending(true);

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `chat/${userProfile.company_id}/${activeChannel.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create message with file
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: activeChannel.id,
          user_id: userProfile.id,
          company_id: userProfile.company_id,
          message_type: file.type.startsWith('image/') ? 'image' : 'file',
          content: file.name,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending file:', error);
      toast({
        title: "Error",
        description: "Failed to send file",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  }, [userProfile, activeChannel, toast]);

  // Create a new channel
  const createChannel = useCallback(async (name: string, description?: string, projectId?: string, isPrivate = false) => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .insert({
          company_id: userProfile.company_id,
          project_id: projectId,
          name,
          description,
          channel_type: projectId ? 'project' : 'team',
          is_private: isPrivate,
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('chat_channel_members')
        .insert({
          channel_id: data.id,
          user_id: userProfile.id,
          company_id: userProfile.company_id,
          role: 'admin'
        });

      await loadChannels();
      return data;
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive"
      });
    }
  }, [userProfile, loadChannels, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userProfile) return;

    // Subscribe to new messages - filter by company_id
    const messageChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `company_id=eq.${userProfile.company_id}`
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          // Verify message belongs to our company
          if ((newMessage as any).company_id !== userProfile.company_id) return;

          // Get user profile for the message
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', newMessage.user_id)
            .single();

          const messageWithProfile = {
            ...newMessage,
            user_profiles: profile
          };

          setMessages(prev => {
            // Only add if it's for the active channel
            if (activeChannel?.id === newMessage.channel_id) {
              return [...prev, messageWithProfile];
            }
            return prev;
          });
        }
      )
      .subscribe();

    // Subscribe to channel updates
    const channelUpdateChannel = supabase
      .channel('chat-channels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels',
          filter: `company_id=eq.${userProfile.company_id}`
        },
        () => {
          loadChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(channelUpdateChannel);
    };
  }, [userProfile, activeChannel, loadChannels]);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Set active channel and load messages
  useEffect(() => {
    if (channelId && channels.length > 0) {
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        setActiveChannel(channel);
        loadMessages(channelId);
      }
    }
  }, [channelId, channels, loadMessages]);

  return {
    messages,
    channels,
    activeChannel,
    loading,
    sending,
    sendMessage,
    sendFile,
    createChannel,
    setActiveChannel: (channel: ChatChannel | null) => {
      setActiveChannel(channel);
      if (channel) {
        loadMessages(channel.id);
      }
    },
    loadChannels
  };
};