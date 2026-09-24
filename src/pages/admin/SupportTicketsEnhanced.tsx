/**
 * Enhanced Support Tickets
 * Includes AI categorization, user context, and response suggestions
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RoleGuard, ROLE_GROUPS } from "@/components/auth/RoleGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { useToast } from "@/hooks/use-toast";
import { useSupportTickets, type SupportTicket } from "@/hooks/useSupportTickets";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserContextPanel } from "@/components/admin/UserContextPanel";
import { MessageSquare, Clock, CheckCircle, AlertCircle, User, Sparkles, Send, Copy } from "lucide-react";
import { DataTablePageSkeleton } from '@/components/ui/skeletons';

const SupportTicketsEnhanced = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const support = useSupportTickets({
    enabled: userProfile?.role === "root_admin",
    selectedTicketId,
    withSuggestions: true,
  });
  const tickets = support.tickets.data ?? [];
  // From the list, so a status change shows in the open dialog.
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;
  const ticketMessages = support.messages.data ?? [];
  const ticketSuggestions = support.suggestions.data ?? [];
  const [responseMessage, setResponseMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [analyzingTicket, setAnalyzingTicket] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }

    if (!authLoading && userProfile && userProfile.role !== "root_admin") {
      navigate("/dashboard");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only root administrators can access this page.",
      });
      return;
    }
  }, [user, userProfile, authLoading, navigate]);

  const analyzeTicket = async (ticket: SupportTicket) => {
    setAnalyzingTicket(true);
    try {
      await support.analyze(ticket.id);

      toast({
        title: "Success",
        description: "Ticket analyzed successfully",
      });
    } catch (error: any) {
      console.error("Error analyzing ticket:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Could not analyze ticket",
      });
    } finally {
      setAnalyzingTicket(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await support.setStatus(ticketId, status);
      toast({
        title: "Success",
        description: "Ticket status updated successfully",
      });
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update ticket status",
      });
    }
  };

  const sendResponse = async (suggestedContent?: string) => {
    if (!selectedTicket) return;

    const contentToSend = suggestedContent || responseMessage;
    if (!contentToSend.trim()) return;

    try {
      await support.reply(selectedTicket, contentToSend);
      setResponseMessage("");

      toast({
        title: "Success",
        description: "Response sent successfully",
      });
    } catch (error) {
      console.error("Error sending response:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send response",
      });
    }
  };

  const applySuggestedResponse = (content: string) => {
    setResponseMessage(content);
    toast({
      title: "Suggestion Applied",
      description: "You can edit the response before sending",
    });
  };

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicketId(ticket.id);
    // Auto-analyze only a ticket with no suggestions yet. This used to test
    // suggestions state from before the load it had just awaited, so it
    // re-analyzed on every open.
    try {
      const existing = await support.readSuggestions(ticket.id);
      if (existing.length === 0) await analyzeTicket(ticket);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "destructive";
      case "in_progress":
        return "default";
      case "resolved":
        return "default";
      case "closed":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const statusMatch = statusFilter === "all" || ticket.status === statusFilter;
    const priorityMatch = priorityFilter === "all" || ticket.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const openTickets = tickets.filter((t) => t.status === "open").length;
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedTickets = tickets.filter((t) => t.status === "resolved").length;

  if (support.tickets.isLoading) {
    return (
      <AccessiblePageWrapper pageTitle="Support Tickets">
      <DashboardLayout hasAccessibleWrapper title="Support Tickets" showTrialBanner={false}>
        <DataTablePageSkeleton label="Loading support tickets" />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ROOT_ADMIN}>
      <AccessiblePageWrapper pageTitle="Support Tickets">
      <DashboardLayout hasAccessibleWrapper
        title="Support Tickets" showTrialBanner={false}
        description="AI-powered support with user context and response suggestions"
        headerActions={
          <Button onClick={() => { void support.tickets.refetch(); }}>Refresh</Button>
        }
      >
        <div className="space-y-6">
          {support.tickets.error && (
            <ErrorState
              inline
              title="Support tickets could not be loaded"
              error={support.tickets.error as Error}
              onRetry={() => { void support.tickets.refetch(); }}
            />
          )}
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{support.tickets.error ? '--' : openTickets}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{support.tickets.error ? '--' : inProgressTickets}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{support.tickets.error ? '--' : resolvedTickets}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
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
          </div>

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
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          {ticket.category && (
                            <Badge variant="outline">{ticket.category.replace("_", " ")}</Badge>
                          )}
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
                              onClick={() => handleViewTicket(ticket)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {selectedTicket?.ticket_number} - {selectedTicket?.subject}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedTicket && (
                              <div className="grid grid-cols-3 gap-6">
                                {/* Left column: Ticket details and messages */}
                                <div className="col-span-2 space-y-6">
                                  {/* Original request */}
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="font-medium mb-2">Original Request:</p>
                                    <p>{selectedTicket.description}</p>
                                  </div>

                                  {/* AI Suggestions */}
                                  {ticketSuggestions.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-sm flex items-center">
                                          <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                                          AI Suggestions
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        {ticketSuggestions
                                          .filter((s) => s.suggested_content)
                                          .map((suggestion) => (
                                            <div key={suggestion.id} className="p-3 border rounded">
                                              <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline">
                                                  {(suggestion.confidence_score * 100).toFixed(0)}% confident
                                                </Badge>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => applySuggestedResponse(suggestion.suggested_content!)}
                                                >
                                                  <Copy className="h-3 w-3 mr-1" />
                                                  Use This
                                                </Button>
                                              </div>
                                              <p className="text-sm whitespace-pre-wrap">
                                                {suggestion.suggested_content}
                                              </p>
                                            </div>
                                          ))}
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Messages */}
                                  <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {support.messages.error && (
                                      <ErrorState
                                        inline
                                        title="Messages could not be loaded"
                                        error={support.messages.error as Error}
                                        onRetry={() => { void support.messages.refetch(); }}
                                      />
                                    )}
                                    {ticketMessages.map((message) => (
                                      <div
                                        key={message.id}
                                        className={`p-3 rounded-lg ${
                                          message.sender_type === "support"
                                            ? "bg-primary text-primary-foreground ml-8"
                                            : "bg-muted mr-8"
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="font-medium">{message.sender_name}</span>
                                          <span className="text-xs opacity-70">
                                            {new Date(message.created_at).toLocaleString()}
                                          </span>
                                        </div>
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Response form */}
                                  <div className="space-y-4">
                                    <Textarea
                                      placeholder="Type your response..."
                                      value={responseMessage}
                                      onChange={(e) => setResponseMessage(e.target.value)}
                                      rows={6}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => sendResponse()}
                                        disabled={!responseMessage.trim()}
                                      >
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Response
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => analyzeTicket(selectedTicket)}
                                        disabled={analyzingTicket}
                                      >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {analyzingTicket ? "Analyzing..." : "Re-analyze"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* Right column: User context */}
                                <div className="col-span-1">
                                  <UserContextPanel
                                    ticketId={selectedTicket.id}
                                    customerEmail={selectedTicket.customer_email}
                                  />
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
        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    </RoleGuard>
  );
};

export default SupportTicketsEnhanced;
