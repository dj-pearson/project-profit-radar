import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Image, 
  File, 
  Search,
  Filter,
  MoreVertical,
  Reply,
  Edit,
  Trash2,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatMessage {
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
}

interface ChatThread {
  id: string;
  name: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'away' | 'offline';
  }>;
  last_activity: string;
  unread_count: number;
  is_pinned: boolean;
  thread_type: 'direct' | 'group' | 'project' | 'announcement';
}

interface AdvancedChatInterfaceProps {
  thread: ChatThread;
  onBack?: () => void;
}

export const AdvancedChatInterface: React.FC<AdvancedChatInterfaceProps> = ({ 
  thread, 
  onBack 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadMessages();
  }, [thread.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    // Simulate loading messages from API
    const simulatedMessages: ChatMessage[] = [
      {
        id: '1',
        content: 'Hey team, the foundation work is looking great! Here are some progress photos.',
        sender_id: 'user-1',
        sender_name: 'John Smith',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        message_type: 'text'
      },
      {
        id: '2',
        content: 'foundation_progress_1.jpg',
        sender_id: 'user-1',
        sender_name: 'John Smith',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        message_type: 'image',
        file_url: '/placeholder.svg',
        file_name: 'foundation_progress_1.jpg',
        file_size: 2048000
      },
      {
        id: '3',
        content: 'Looks excellent! When do we expect to start the framing?',
        sender_id: 'user-2',
        sender_name: 'Sarah Johnson',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        message_type: 'text',
        reply_to: '1'
      },
      {
        id: '4',
        content: 'voice_message_01.wav',
        sender_id: 'user-1',
        sender_name: 'John Smith',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        message_type: 'voice',
        voice_duration: 45,
        file_url: '#'
      }
    ];
    setMessages(simulatedMessages);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender_id: 'current-user',
      sender_name: 'You',
      timestamp: new Date().toISOString(),
      message_type: 'text',
      reply_to: replyingTo?.id
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyingTo(null);

    toast({
      title: "Message sent",
      description: "Your message has been delivered."
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const message: ChatMessage = {
      id: Date.now().toString(),
      content: file.name,
      sender_id: 'current-user',
      sender_name: 'You',
      timestamp: new Date().toISOString(),
      message_type: isImage ? 'image' : 'file',
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size
    };

    setMessages(prev => [...prev, message]);
    
    toast({
      title: "File uploaded",
      description: `${file.name} has been shared with the team.`
    });
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    // In a real implementation, start recording audio here
    toast({
      title: "Recording started",
      description: "Tap the mic button again to stop and send."
    });
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    
    // Simulate voice message creation
    const message: ChatMessage = {
      id: Date.now().toString(),
      content: 'Voice message',
      sender_id: 'current-user',
      sender_name: 'You',
      timestamp: new Date().toISOString(),
      message_type: 'voice',
      voice_duration: Math.floor(Math.random() * 60) + 10,
      file_url: '#'
    };

    setMessages(prev => [...prev, message]);
    
    toast({
      title: "Voice message sent",
      description: "Your voice message has been shared."
    });
  };

  const toggleVoicePlayback = (messageId: string) => {
    if (playingVoiceId === messageId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(messageId);
      // In a real implementation, start audio playback
      setTimeout(() => setPlayingVoiceId(null), 3000); // Simulate playback
    }
  };

  const filteredMessages = messages.filter(message =>
    !searchQuery || 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.sender_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.sender_id === 'current-user';
    const replyMessage = message.reply_to ? messages.find(m => m.id === message.reply_to) : null;

    return (
      <div key={message.id} className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback>
            {message.sender_name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div className={`flex-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`rounded-lg p-3 ${
            isOwn 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'bg-muted'
          }`}>
            {replyMessage && (
              <div className="border-l-2 border-border pl-2 mb-2 opacity-70">
                <p className="text-xs font-medium">{replyMessage.sender_name}</p>
                <p className="text-xs truncate">{replyMessage.content}</p>
              </div>
            )}
            
            {message.message_type === 'text' && (
              <p className="text-sm">{message.content}</p>
            )}
            
            {message.message_type === 'image' && (
              <div className="space-y-2">
                <img 
                  src={message.file_url} 
                  alt={message.file_name}
                  className="max-w-full h-auto rounded"
                />
                <p className="text-xs opacity-75">{message.file_name}</p>
              </div>
            )}
            
            {message.message_type === 'file' && (
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{message.file_name}</p>
                  <p className="text-xs opacity-75">
                    {(message.file_size! / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {message.message_type === 'voice' && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleVoicePlayback(message.id)}
                >
                  {playingVoiceId === message.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="h-2 bg-background/20 rounded-full">
                    <div 
                      className="h-full bg-current rounded-full transition-all"
                      style={{ 
                        width: playingVoiceId === message.id ? '100%' : '0%',
                        transitionDuration: `${message.voice_duration}s`
                      }}
                    />
                  </div>
                  <p className="text-xs opacity-75 mt-1">{message.voice_duration}s</p>
                </div>
              </div>
            )}
            
            {message.edited_at && (
              <p className="text-xs opacity-50 mt-1">(edited)</p>
            )}
          </div>
          
          <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.timestamp), 'HH:mm')}
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => setReplyingTo(message)}
              >
                <Reply className="h-3 w-3" />
              </Button>
              {isOwn && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setEditingMessage(message.id)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{thread.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {thread.participants.length} members
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {showSearch && (
          <div className="mt-3">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {filteredMessages.map(renderMessage)}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
        
        {replyingTo && (
          <div className="border-t border-b p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="h-4 w-4" />
                <span className="text-sm">Replying to {replyingTo.sender_name}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setReplyingTo(null)}
              >
                ×
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {replyingTo.content}
            </p>
          </div>
        )}
        
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-4 w-4" />
            </Button>
            
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 min-h-[40px] max-h-32 resize-none"
              rows={1}
            />
            
            {newMessage.trim() ? (
              <Button onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant={isRecording ? "destructive" : "ghost"}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};