import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Send, Headphones, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'support';
  sender_name: string;
  timestamp: string;
  is_read: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  category: string;
}

const CustomerSupportChat = () => {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const categories = [
    'general', 'technical', 'billing', 'feature_request', 'bug_report'
  ];

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentTicket) {
      loadMessages();
    }
  }, [currentTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTickets = async () => {
    if (!userProfile?.company_id) return;

    try {
      // For now, use mock data until we create the support_tickets table
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          subject: 'Cannot access project dashboard',
          status: 'open',
          priority: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: 'technical'
        }
      ];
      setTickets(mockTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const loadMessages = async () => {
    if (!currentTicket) return;

    try {
      // Mock messages until we create the support_messages table
      const mockMessages: Message[] = [
        {
          id: '1',
          content: 'Hello, I am having trouble accessing my project dashboard. It shows a loading screen but never loads.',
          sender_type: 'user',
          sender_name: userProfile?.first_name + ' ' + userProfile?.last_name || 'User',
          timestamp: new Date().toISOString(),
          is_read: true
        },
        {
          id: '2',
          content: 'Thank you for contacting support. I can help you with that. Can you please tell me which browser you are using?',
          sender_type: 'support',
          sender_name: 'Sarah (Support)',
          timestamp: new Date().toISOString(),
          is_read: true
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createTicket = async () => {
    if (!newTicketSubject.trim() || !userProfile?.company_id) return;

    setLoading(true);
    try {
      // Create new ticket (mock for now)
      const newTicket: SupportTicket = {
        id: Date.now().toString(),
        subject: newTicketSubject,
        status: 'open',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: newTicketCategory
      };

      setTickets([newTicket, ...tickets]);
      setCurrentTicket(newTicket);
      setNewTicketSubject('');
      setNewTicketCategory('general');

      toast({
        title: "Support Ticket Created",
        description: "Your support ticket has been created. We'll get back to you soon!"
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create support ticket"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentTicket) return;

    setLoading(true);
    try {
      const message: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender_type: 'user',
        sender_name: userProfile?.first_name + ' ' + userProfile?.last_name || 'User',
        timestamp: new Date().toISOString(),
        is_read: true
      };

      setMessages([...messages, message]);
      setNewMessage('');

      toast({
        title: "Message Sent",
        description: "Your message has been sent to our support team"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'destructive',
      in_progress: 'default',
      resolved: 'secondary',
      closed: 'outline'
    } as const;

    const icons = {
      open: AlertCircle,
      in_progress: Clock,
      resolved: CheckCircle2,
      closed: CheckCircle2
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-card border rounded-lg shadow-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Headphones className="h-5 w-5" />
            <span>Support</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            ×
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 h-[520px] flex flex-col">
        {!currentTicket ? (
          <div className="flex-1 p-4 space-y-4">
            {/* Create New Ticket */}
            <div className="space-y-3">
              <h3 className="font-medium">Start a new conversation</h3>
              <Input
                placeholder="Subject"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
              />
              <select
                className="w-full p-2 border rounded-md"
                value={newTicketCategory}
                onChange={(e) => setNewTicketCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
              <Button 
                onClick={createTicket} 
                disabled={!newTicketSubject.trim() || loading}
                className="w-full"
              >
                Start Conversation
              </Button>
            </div>

            {/* Existing Tickets */}
            {tickets.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Recent Conversations</h3>
                <ScrollArea className="h-48">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => setCurrentTicket(ticket)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {getStatusBadge(ticket.status)}
                        <span className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Ticket Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentTicket(null)}
                >
                  ← Back
                </Button>
                {getStatusBadge(currentTicket.status)}
              </div>
              <h3 className="font-medium truncate">{currentTicket.subject}</h3>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[80%] ${
                      message.sender_type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {message.sender_type === 'user' ? 'U' : 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className={`p-3 rounded-lg ${
                          message.sender_type === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {message.sender_name} • {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || loading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
};

export default CustomerSupportChat;
