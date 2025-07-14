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
import { MessageCircle, Send, Headphones, Clock, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'support' | 'system';
  sender_name: string;
  sender_email?: string;
  timestamp: string;
  is_read: boolean;
  attachments?: any[];
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  customer_name: string;
  customer_email: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  source: string;
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
    if (!userProfile?.id) return;

    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedTickets: SupportTicket[] = (ticketsData || []).map(ticket => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status as SupportTicket['status'],
        priority: ticket.priority as SupportTicket['priority'],
        category: ticket.category,
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        assigned_to: ticket.assigned_to,
        source: ticket.source
      }));
      
      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load support tickets"
      });
    }
  };

  const loadMessages = async () => {
    if (!currentTicket) return;

    try {
      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', currentTicket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const formattedMessages: Message[] = (messages || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_type: msg.sender_type as Message['sender_type'],
        sender_name: msg.sender_name,
        sender_email: msg.sender_email,
        timestamp: msg.created_at,
        is_read: msg.is_read,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : []
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages"
      });
    }
  };

  const createTicket = async () => {
    if (!newTicketSubject.trim() || !userProfile?.id) return;

    setLoading(true);
    try {
      const customerName = `${userProfile.first_name} ${userProfile.last_name}`.trim() || 'User';
      const customerEmail = userProfile.email || '';

      // Create the ticket in database
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          company_id: userProfile.company_id,
          user_id: userProfile.id,
          customer_email: customerEmail,
          customer_name: customerName,
          subject: newTicketSubject,
          description: `New support request from ${customerName}`,
          category: newTicketCategory,
          priority: 'medium',
          source: 'chat',
          ticket_number: '' // Will be auto-generated by trigger
        })
        .select()
        .single();

      if (ticketError) throw ticketError;
      
      const ticket: SupportTicket = {
        id: ticketData.id,
        ticket_number: ticketData.ticket_number,
        subject: ticketData.subject,
        description: ticketData.description,
        status: ticketData.status as SupportTicket['status'],
        priority: ticketData.priority as SupportTicket['priority'],
        category: ticketData.category,
        customer_name: ticketData.customer_name,
        customer_email: ticketData.customer_email,
        created_at: ticketData.created_at,
        updated_at: ticketData.updated_at,
        assigned_to: ticketData.assigned_to,
        source: ticketData.source
      };

      // Create initial message
      await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'user',
          sender_name: customerName,
          sender_email: customerEmail,
          content: `Hello, I need help with: ${newTicketSubject}`
        });

      // Send email notification
      try {
        await supabase.functions.invoke('send-support-notification', {
          body: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            customerName,
            customerEmail,
            subject: newTicketSubject,
            description: `New support request from ${customerName}`,
            priority: 'medium',
            category: newTicketCategory
          }
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
      }

      setTickets([ticket, ...tickets]);
      setCurrentTicket(ticket);
      setNewTicketSubject('');
      setNewTicketCategory('general');

      toast({
        title: "Support Ticket Created",
        description: `Your support ticket ${ticket.ticket_number} has been created. We'll get back to you soon!`
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
    if (!newMessage.trim() || !currentTicket || !userProfile) return;

    setLoading(true);
    try {
      const customerName = `${userProfile.first_name} ${userProfile.last_name}`.trim() || 'User';
      
      const { data: message, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: currentTicket.id,
          sender_type: 'user',
          sender_name: customerName,
          sender_email: userProfile.email,
          content: newMessage
        })
        .select()
        .single();

      if (error) throw error;

      const formattedMessage: Message = {
        id: message.id,
        content: message.content,
        sender_type: message.sender_type as Message['sender_type'],
        sender_name: message.sender_name,
        sender_email: message.sender_email,
        timestamp: message.created_at,
        is_read: message.is_read,
        attachments: Array.isArray(message.attachments) ? message.attachments : []
      };

      setMessages([...messages, formattedMessage]);
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button
          onClick={() => window.open('mailto:support@build-desk.com', '_blank')}
          className="rounded-full h-12 w-12 shadow-lg bg-secondary hover:bg-secondary/80"
          size="sm"
        >
          <Mail className="h-5 w-5" />
        </Button>
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
                        {ticket.ticket_number} • {new Date(ticket.created_at).toLocaleDateString()}
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
