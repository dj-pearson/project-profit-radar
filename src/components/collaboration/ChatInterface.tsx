import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Paperclip, Hash, Users, Lock } from 'lucide-react';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  content?: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  file_url?: string;
  file_name?: string;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const MessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const userInitials = message.user_profiles 
    ? `${message.user_profiles.first_name?.charAt(0) || ''}${message.user_profiles.last_name?.charAt(0) || ''}`
    : '?';

  const userName = message.user_profiles 
    ? `${message.user_profiles.first_name} ${message.user_profiles.last_name}`
    : 'Unknown User';

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{userName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        {message.message_type === 'text' && (
          <p className="text-sm text-foreground">{message.content}</p>
        )}
        {message.message_type === 'file' && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded border">
            <Paperclip className="h-4 w-4" />
            <span className="text-sm">{message.file_name}</span>
            {message.file_url && (
              <a 
                href={message.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Download
              </a>
            )}
          </div>
        )}
        {message.message_type === 'image' && message.file_url && (
          <div className="mt-2">
            <img 
              src={message.file_url} 
              alt={message.file_name || 'Image'} 
              className="max-w-sm h-auto rounded border"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatInterface: React.FC = () => {
  const [messageInput, setMessageInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    channels,
    activeChannel,
    loading,
    sending,
    sendMessage,
    sendFile,
    setActiveChannel
  } = useRealtimeChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;

    await sendMessage(messageInput);
    setMessageInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await sendFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-select first channel if none selected
  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      setActiveChannel(channels[0]);
    }
  }, [activeChannel, channels, setActiveChannel]);

  return (
    <div className="h-full flex flex-col sm:flex-row">
      {/* Mobile Channel Dropdown / Desktop Sidebar */}
      <div className="sm:w-64 sm:border-r border-border">
        {/* Mobile Channel Selector */}
        <div className="sm:hidden mb-3">
          <select 
            value={activeChannel?.id || ''} 
            onChange={(e) => {
              const channel = channels.find(c => c.id === e.target.value);
              if (channel) setActiveChannel(channel);
            }}
            className="w-full p-2 border rounded-md text-sm bg-background"
          >
            <option value="">Select a channel</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.is_private ? '🔒' : '#'} {channel.name}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Channel Sidebar */}
        <div className="hidden sm:block">
          <div className="p-3 sm:p-4 border-b">
            <h3 className="font-medium text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
              Channels
            </h3>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2 space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-muted/50 transition-colors ${
                    activeChannel?.id === channel.id ? 'bg-muted' : ''
                  }`}
                >
                  {channel.is_private ? (
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  ) : (
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  )}
                  <span className="text-xs sm:text-sm truncate">{channel.name}</span>
                  {channel.channel_type === 'project' && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Project
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeChannel ? (
          <>
            {/* Channel Header - Mobile Optimized */}
            <div className="p-3 sm:p-4 border-b border-border">
              <div className="flex items-center gap-2">
                {activeChannel.is_private ? (
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                ) : (
                  <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                )}
                <h2 className="font-semibold text-sm sm:text-base truncate">{activeChannel.name}</h2>
                {activeChannel.description && (
                  <>
                    <Separator orientation="vertical" className="h-4 hidden sm:block" />
                    <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">
                      {activeChannel.description}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Messages - Mobile Optimized */}
            <ScrollArea className="flex-1 p-2 sm:p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-xs sm:text-sm text-muted-foreground">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                      No messages yet
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Start the conversation!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 sm:space-y-2">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-muted/50 rounded-lg">
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {message.user_profiles 
                            ? `${message.user_profiles.first_name?.charAt(0) || ''}${message.user_profiles.last_name?.charAt(0) || ''}`
                            : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs sm:text-sm truncate">
                            {message.user_profiles 
                              ? `${message.user_profiles.first_name} ${message.user_profiles.last_name}`
                              : 'Unknown User'}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {message.message_type === 'text' && (
                          <p className="text-xs sm:text-sm text-foreground break-words">{message.content}</p>
                        )}
                        {message.message_type === 'file' && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded border">
                            <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm truncate">{message.file_name}</span>
                            {message.file_url && (
                              <a 
                                href={message.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs sm:text-sm text-primary hover:underline"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        )}
                        {message.message_type === 'image' && message.file_url && (
                          <div className="mt-2">
                            <img 
                              src={message.file_url} 
                              alt={message.file_name || 'Image'} 
                              className="max-w-full sm:max-w-sm h-auto rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input - Mobile Optimized */}
            <div className="p-2 sm:p-4 border-t border-border">
              <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="h-9 w-9 p-0 flex-shrink-0"
                >
                  <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  disabled={sending}
                  className="flex-1 h-9 text-sm"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!messageInput.trim() || sending}
                  className="h-9 w-9 p-0 flex-shrink-0"
                >
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <Users className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">Welcome to Team Chat</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Select a channel to start collaborating with your team
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};