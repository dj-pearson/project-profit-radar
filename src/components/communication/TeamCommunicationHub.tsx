import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, Users, Phone, Video, Mail, Bell, 
  Search, Plus, Settings, Pin, Star, Clock, Paperclip
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'location' | 'voice';
  attachments?: Attachment[];
  isRead: boolean;
  reactions?: Reaction[];
  threadReplies?: number;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
}

interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'project' | 'team' | 'general' | 'alert';
  description: string;
  projectId?: string;
  members: string[];
  unreadCount: number;
  lastMessage?: Message;
  isPinned: boolean;
  isPrivate: boolean;
  createdBy: string;
  createdAt: Date;
}

interface DirectMessage {
  id: string;
  participants: string[];
  participantNames: string[];
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
}

interface Notification {
  id: string;
  type: 'message' | 'mention' | 'project_update' | 'system' | 'safety_alert';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const TeamCommunicationHub: React.FC = () => {
  const [channels] = useState<Channel[]>([
    {
      id: '1',
      name: 'Downtown Office Building',
      type: 'project',
      description: 'Discussion for the downtown office building project',
      projectId: 'proj-001',
      members: ['user-1', 'user-2', 'user-3', 'user-4'],
      unreadCount: 5,
      isPinned: true,
      isPrivate: false,
      createdBy: 'user-1',
      createdAt: new Date('2024-01-10'),
      lastMessage: {
        id: 'm1',
        senderId: 'user-2',
        senderName: 'Sarah Johnson',
        senderRole: 'Project Manager',
        content: 'Foundation inspection scheduled for tomorrow at 9 AM',
        timestamp: new Date('2024-01-29T14:30:00'),
        type: 'text',
        isRead: false
      }
    },
    {
      id: '2',
      name: 'Safety Team',
      type: 'team',
      description: 'Safety discussions and updates',
      members: ['user-1', 'user-5', 'user-6'],
      unreadCount: 2,
      isPinned: true,
      isPrivate: false,
      createdBy: 'user-5',
      createdAt: new Date('2024-01-05'),
      lastMessage: {
        id: 'm2',
        senderId: 'user-5',
        senderName: 'Mike Wilson',
        senderRole: 'Safety Officer',
        content: 'Monthly safety training completed - 98% attendance',
        timestamp: new Date('2024-01-29T11:15:00'),
        type: 'text',
        isRead: false
      }
    },
    {
      id: '3',
      name: 'General Discussion',
      type: 'general',
      description: 'General company-wide discussions',
      members: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
      unreadCount: 0,
      isPinned: false,
      isPrivate: false,
      createdBy: 'user-1',
      createdAt: new Date('2024-01-01'),
      lastMessage: {
        id: 'm3',
        senderId: 'user-3',
        senderName: 'Tom Chen',
        senderRole: 'Foreman',
        content: 'Great job everyone on meeting this month\'s targets!',
        timestamp: new Date('2024-01-28T16:45:00'),
        type: 'text',
        isRead: true
      }
    }
  ]);

  const [directMessages] = useState<DirectMessage[]>([
    {
      id: 'dm1',
      participants: ['user-1', 'user-2'],
      participantNames: ['Sarah Johnson'],
      unreadCount: 1,
      isOnline: true,
      lastMessage: {
        id: 'dm-m1',
        senderId: 'user-2',
        senderName: 'Sarah Johnson',
        senderRole: 'Project Manager',
        content: 'Can we schedule a quick call about the budget revisions?',
        timestamp: new Date('2024-01-29T15:20:00'),
        type: 'text',
        isRead: false
      }
    },
    {
      id: 'dm2',
      participants: ['user-1', 'user-5'],
      participantNames: ['Mike Wilson'],
      unreadCount: 0,
      isOnline: false,
      lastMessage: {
        id: 'dm-m2',
        senderId: 'user-1',
        senderName: 'Current User',
        senderRole: 'Admin',
        content: 'Thanks for the safety report update',
        timestamp: new Date('2024-01-29T09:30:00'),
        type: 'text',
        isRead: true
      }
    }
  ]);

  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'safety_alert',
      title: 'Safety Alert',
      message: 'Weather warning: High winds expected tomorrow. Review outdoor work schedules.',
      timestamp: new Date('2024-01-29T13:00:00'),
      isRead: false,
      priority: 'high'
    },
    {
      id: '2',
      type: 'project_update',
      title: 'Project Milestone',
      message: 'Downtown Office Building - Foundation phase completed ahead of schedule',
      timestamp: new Date('2024-01-29T10:30:00'),
      isRead: false,
      priority: 'medium'
    },
    {
      id: '3',
      type: 'mention',
      title: 'You were mentioned',
      message: 'Sarah Johnson mentioned you in Downtown Office Building channel',
      timestamp: new Date('2024-01-29T09:15:00'),
      isRead: true,
      priority: 'medium'
    }
  ]);

  const [selectedChannel, setSelectedChannel] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const [messages] = useState<Message[]>([
    {
      id: 'm1',
      senderId: 'user-2',
      senderName: 'Sarah Johnson',
      senderRole: 'Project Manager',
      content: 'Foundation inspection scheduled for tomorrow at 9 AM. Please ensure all safety equipment is ready.',
      timestamp: new Date('2024-01-29T14:30:00'),
      type: 'text',
      isRead: false,
      reactions: [
        { emoji: '👍', userId: 'user-3', userName: 'Tom Chen' },
        { emoji: '✅', userId: 'user-4', userName: 'Lisa Wang' }
      ]
    },
    {
      id: 'm2',
      senderId: 'user-3',
      senderName: 'Tom Chen',
      senderRole: 'Foreman',
      content: 'Copy that. Team is prepared and all equipment checked.',
      timestamp: new Date('2024-01-29T14:32:00'),
      type: 'text',
      isRead: false
    },
    {
      id: 'm3',
      senderId: 'user-4',
      senderName: 'Lisa Wang',
      senderRole: 'Quality Inspector',
      content: 'I\'ll be there at 8:30 AM to set up testing equipment',
      timestamp: new Date('2024-01-29T14:35:00'),
      type: 'text',
      isRead: false,
      attachments: [
        {
          id: 'att1',
          name: 'inspection_checklist.pdf',
          type: 'pdf',
          size: '245 KB',
          url: '/files/inspection_checklist.pdf'
        }
      ]
    }
  ]);

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getChannelIcon = (type: Channel['type']) => {
    switch (type) {
      case 'project': return <MessageSquare className="h-4 w-4" />;
      case 'team': return <Users className="h-4 w-4" />;
      case 'general': return <MessageSquare className="h-4 w-4" />;
      case 'alert': return <Bell className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const renderChannelItem = (channel: Channel) => {
    return (
      <div
        key={channel.id}
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
          selectedChannel === channel.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
        }`}
        onClick={() => setSelectedChannel(channel.id)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            {getChannelIcon(channel.type)}
            {channel.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{channel.name}</span>
              {channel.isPrivate && <Badge variant="outline" className="text-xs">Private</Badge>}
            </div>
            {channel.lastMessage && (
              <p className="text-sm text-muted-foreground truncate">
                {channel.lastMessage.senderName}: {channel.lastMessage.content}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {channel.unreadCount > 0 && (
            <Badge variant="default" className="rounded-full h-5 w-5 p-0 text-xs flex items-center justify-center">
              {channel.unreadCount}
            </Badge>
          )}
          {channel.lastMessage && (
            <span className="text-xs text-muted-foreground">
              {channel.lastMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderMessage = (message: Message) => {
    return (
      <div key={message.id} className="flex gap-3 p-4 hover:bg-muted/30">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium">
            {message.senderName.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{message.senderName}</span>
            <Badge variant="outline" className="text-xs">{message.senderRole}</Badge>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-sm mb-2">{message.content}</p>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map(attachment => (
                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-muted rounded border">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm">{attachment.name}</span>
                  <span className="text-xs text-muted-foreground">({attachment.size})</span>
                </div>
              ))}
            </div>
          )}
          
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-2 mb-2">
              {message.reactions.map((reaction, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-sm">
                  <span>{reaction.emoji}</span>
                  <span className="text-xs">{reaction.userName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNotification = (notification: Notification) => {
    return (
      <div key={notification.id} className={`p-4 border-l-4 ${
        notification.priority === 'urgent' ? 'border-red-500 bg-red-50' :
        notification.priority === 'high' ? 'border-orange-500 bg-orange-50' :
        notification.priority === 'medium' ? 'border-blue-500 bg-blue-50' :
        'border-gray-300 bg-gray-50'
      } ${!notification.isRead ? 'font-medium' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium">{notification.title}</h4>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(notification.priority)}>
              {notification.priority}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
      </div>
    );
  };

  const unreadNotifications = notifications.filter(n => !n.isRead).length;
  const totalUnreadMessages = channels.reduce((sum, channel) => sum + channel.unreadCount, 0) +
                              directMessages.reduce((sum, dm) => sum + dm.unreadCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Team Communication Hub</h2>
          <p className="text-muted-foreground">
            Stay connected with your team and manage project communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Video className="h-4 w-4 mr-2" />
            Video Call
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Channel
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Channels</p>
                <p className="text-2xl font-bold">{channels.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
                <p className="text-2xl font-bold text-blue-600">{totalUnreadMessages}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Members</p>
                <p className="text-2xl font-bold text-green-600">12</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className="text-2xl font-bold text-orange-500">{unreadNotifications}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search channels and messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Channels
                <Badge variant="outline">{channels.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-4">
                {channels.map(renderChannelItem)}
              </div>
            </CardContent>
          </Card>

          {/* Direct Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Direct Messages
                <Badge variant="outline">{directMessages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-4">
                {directMessages.map(dm => (
                  <div key={dm.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {dm.participantNames[0].split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        {dm.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <span className="font-medium">{dm.participantNames[0]}</span>
                    </div>
                    {dm.unreadCount > 0 && (
                      <Badge variant="default" className="rounded-full h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {dm.unreadCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="chat" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="notifications">
                Notifications
                {unreadNotifications > 0 && (
                  <Badge variant="destructive" className="ml-2 rounded-full h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {unreadNotifications}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getChannelIcon(channels.find(c => c.id === selectedChannel)?.type || 'general')}
                        {channels.find(c => c.id === selectedChannel)?.name || 'Select a channel'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {channels.find(c => c.id === selectedChannel)?.members.length || 0} members
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-0">
                  <div className="h-full">
                    {messages.map(renderMessage)}
                  </div>
                </CardContent>
                
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newMessage.trim()) {
                          // Handle sending message
                          setNewMessage('');
                        }
                      }}
                    />
                    <Button size="sm" variant="outline">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      disabled={!newMessage.trim()}
                      onClick={() => {
                        if (newMessage.trim()) {
                          // Handle sending message
                          setNewMessage('');
                        }
                      }}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Notifications</CardTitle>
                    <Button size="sm" variant="outline">
                      Mark All Read
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2">
                    {notifications.map(renderNotification)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};