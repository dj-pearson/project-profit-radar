import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Filter, 
  Plus, 
  Pin, 
  Archive,
  MoreVertical,
  Users,
  Hash,
  MessageSquare,
  Volume2,
  Star,
  Clock
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ThreadParticipant {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  role?: string;
}

interface ChatThread {
  id: string;
  name: string;
  description?: string;
  participants: ThreadParticipant[];
  last_message: {
    content: string;
    sender_name: string;
    timestamp: string;
  };
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  thread_type: 'direct' | 'group' | 'project' | 'announcement' | 'rfi';
  project_id?: string;
  created_at: string;
  last_activity: string;
}

interface ThreadManagerProps {
  onThreadSelect: (thread: ChatThread) => void;
  selectedThreadId?: string;
}

export const ThreadManager: React.FC<ThreadManagerProps> = ({ 
  onThreadSelect, 
  selectedThreadId 
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    setLoading(true);
    
    // Simulate loading threads from API
    const simulatedThreads: ChatThread[] = [
      {
        id: '1',
        name: 'Downtown Office Project',
        description: 'General discussion for downtown office building project',
        participants: [
          { id: '1', name: 'John Smith', status: 'online', role: 'Project Manager' },
          { id: '2', name: 'Sarah Johnson', status: 'away', role: 'Architect' },
          { id: '3', name: 'Mike Davis', status: 'offline', role: 'Foreman' }
        ],
        last_message: {
          content: 'Foundation work completed ahead of schedule!',
          sender_name: 'John Smith',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        },
        unread_count: 3,
        is_pinned: true,
        is_muted: false,
        is_archived: false,
        thread_type: 'project',
        project_id: 'proj-001',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        participants: [
          { id: '2', name: 'Sarah Johnson', status: 'away', role: 'Architect' }
        ],
        last_message: {
          content: 'Can you review the updated blueprints?',
          sender_name: 'Sarah Johnson',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        unread_count: 1,
        is_pinned: false,
        is_muted: false,
        is_archived: false,
        thread_type: 'direct',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        name: 'RFI-2024-001: Electrical Layout',
        description: 'Request for information regarding electrical panel placement',
        participants: [
          { id: '1', name: 'John Smith', status: 'online', role: 'Project Manager' },
          { id: '4', name: 'Alex Chen', status: 'online', role: 'Electrical Engineer' }
        ],
        last_message: {
          content: 'Updated layout has been approved',
          sender_name: 'Alex Chen',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        unread_count: 0,
        is_pinned: false,
        is_muted: false,
        is_archived: false,
        thread_type: 'rfi',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        name: 'Team Announcements',
        description: 'Important company-wide announcements',
        participants: [
          { id: '1', name: 'John Smith', status: 'online', role: 'Project Manager' },
          { id: '2', name: 'Sarah Johnson', status: 'away', role: 'Architect' },
          { id: '3', name: 'Mike Davis', status: 'offline', role: 'Foreman' },
          { id: '4', name: 'Alex Chen', status: 'online', role: 'Electrical Engineer' }
        ],
        last_message: {
          content: 'New safety protocols effective Monday',
          sender_name: 'Admin',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        unread_count: 0,
        is_pinned: true,
        is_muted: true,
        is_archived: false,
        thread_type: 'announcement',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    setThreads(simulatedThreads);
    setLoading(false);
  };

  const filteredThreads = threads.filter(thread => {
    // Apply search filter
    const matchesSearch = !searchQuery || 
      thread.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Apply type filter
    switch (filterType) {
      case 'unread':
        return thread.unread_count > 0;
      case 'pinned':
        return thread.is_pinned;
      case 'archived':
        return thread.is_archived;
      default:
        return !thread.is_archived;
    }
  });

  const sortedThreads = filteredThreads.sort((a, b) => {
    // Pinned threads first
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    
    // Then by last activity
    return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
  });

  const togglePin = (threadId: string) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, is_pinned: !thread.is_pinned }
        : thread
    ));
    
    toast({
      title: "Thread updated",
      description: "Thread pinned status changed."
    });
  };

  const toggleMute = (threadId: string) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, is_muted: !thread.is_muted }
        : thread
    ));
    
    toast({
      title: "Thread updated",
      description: "Thread mute status changed."
    });
  };

  const archiveThread = (threadId: string) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, is_archived: true }
        : thread
    ));
    
    toast({
      title: "Thread archived",
      description: "Thread has been moved to archive."
    });
  };

  const getThreadIcon = (type: ChatThread['thread_type']) => {
    switch (type) {
      case 'direct':
        return <MessageSquare className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      case 'project':
        return <Hash className="h-4 w-4" />;
      case 'announcement':
        return <Volume2 className="h-4 w-4" />;
      case 'rfi':
        return <Star className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const renderThread = (thread: ChatThread) => {
    const isSelected = selectedThreadId === thread.id;
    
    return (
      <div
        key={thread.id}
        className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
          isSelected ? 'bg-muted border-l-4 border-l-primary' : ''
        }`}
        onClick={() => onThreadSelect(thread)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {thread.thread_type === 'direct' ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={thread.participants[0]?.avatar} />
                <AvatarFallback>
                  {thread.participants[0]?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                {getThreadIcon(thread.thread_type)}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium text-sm truncate">{thread.name}</h3>
                {thread.is_pinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                {thread.is_muted && <Volume2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {thread.unread_count > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {thread.unread_count > 99 ? '99+' : thread.unread_count}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(thread.last_activity), 'MMM d')}
                </span>
              </div>
            </div>
            
            {thread.description && (
              <p className="text-xs text-muted-foreground mb-1 truncate">
                {thread.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate flex-1">
                <span className="font-medium">{thread.last_message.sender_name}:</span>{' '}
                {thread.last_message.content}
              </p>
              
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs">{thread.thread_type}</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(thread.id);
                  }}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {thread.participants.length > 1 && thread.thread_type !== 'direct' && (
              <div className="flex items-center gap-1 mt-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {thread.participants.length} participants
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conversations</CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={filterType === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button 
              variant={filterType === 'unread' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType('unread')}
            >
              Unread
            </Button>
            <Button 
              variant={filterType === 'pinned' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType('pinned')}
            >
              <Pin className="h-4 w-4 mr-1" />
              Pinned
            </Button>
            <Button 
              variant={filterType === 'archived' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType('archived')}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              Loading conversations...
            </div>
          ) : sortedThreads.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              No conversations found
            </div>
          ) : (
            <div className="space-y-0">
              {sortedThreads.map(renderThread)}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};