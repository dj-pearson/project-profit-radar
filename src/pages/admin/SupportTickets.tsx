import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Clock, CheckCircle, AlertCircle, User } from "lucide-react";
import { DataTablePageSkeleton, LoadingRegion } from '@/components/ui/skeletons';

const SupportTickets = () => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const support = useSupportTickets({ selectedTicketId });
  const tickets = support.tickets.data ?? [];
  // From the list, so a status change shows in the open dialog.
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;
  const [responseMessage, setResponseMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const { toast } = useToast();

  const failed = (description: string, error: unknown) => {
    console.error(description, error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error && error.message ? error.message : description,
    });
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await support.setStatus(ticketId, status);
      toast({
        title: "Success",
        description: "Ticket status updated successfully"
      });
    } catch (error) {
      failed("Failed to update ticket status", error);
    }
  };

  const sendResponse = async () => {
    if (!selectedTicket || !responseMessage.trim()) return;

    try {
      await support.reply(selectedTicket, responseMessage);
      setResponseMessage("");
      toast({
        title: "Success",
        description: "Response sent successfully"
      });
    } catch (error) {
      failed("Failed to send response", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;

  if (support.tickets.isLoading) {
    return (
      <LoadingRegion label="Loading support tickets" className="container mx-auto p-6">
        <DataTablePageSkeleton />
      </LoadingRegion>
    );
  }

  return (
    <main className="container mx-auto p-6 space-y-6" role="main" aria-label="Support Tickets Management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
        <Button onClick={() => { void support.tickets.refetch(); }}>Refresh</Button>
      </div>

      {support.tickets.error && (
        <ErrorState
          inline
          title="Support tickets could not be loaded"
          error={support.tickets.error as Error}
          onRetry={() => { void support.tickets.refetch(); }}
        />
      )}

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Ticket statistics">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{support.tickets.error ? '--' : openTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{support.tickets.error ? '--' : inProgressTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{support.tickets.error ? '--' : resolvedTickets}</div>
          </CardContent>
        </Card>
      </section>

      {/* Filters */}
      <section className="flex gap-4" aria-label="Ticket filters">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {/* Tickets List */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No support tickets found
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {ticket.ticket_number}
                      </span>
                      <Badge variant={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant={getStatusColor(ticket.status)}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {ticket.customer_name} ({ticket.customer_email})
                      </span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {selectedTicket?.ticket_number} - {selectedTicket?.subject}
                          </DialogTitle>
                        </DialogHeader>
                        {selectedTicket && (
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="font-medium">Original Request:</p>
                              <p className="mt-2">{selectedTicket.description}</p>
                            </div>

                            {/* Messages */}
                            <div className="space-y-4 max-h-64 overflow-y-auto">
                              {support.messages.error && (
                                <ErrorState
                                  inline
                                  title="Messages could not be loaded"
                                  error={support.messages.error as Error}
                                  onRetry={() => { void support.messages.refetch(); }}
                                />
                              )}
                              {(support.messages.data ?? []).map((message) => (
                                <div
                                  key={message.id}
                                  className={`p-3 rounded-lg ${
                                    message.sender_type === 'support'
                                      ? 'bg-primary text-primary-foreground ml-8'
                                      : 'bg-muted mr-8'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium">{message.sender_name}</span>
                                    <span className="text-xs opacity-70">
                                      {new Date(message.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p>{message.content}</p>
                                </div>
                              ))}
                            </div>

                            {/* Response Form */}
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Type your response..."
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                rows={4}
                              />
                              <Button onClick={sendResponse} disabled={!responseMessage.trim()}>
                                Send Response
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
};

export default SupportTickets;