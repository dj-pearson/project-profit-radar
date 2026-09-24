/**
 * Support tickets, their messages and AI suggestions for the two admin
 * support pages, SupportTickets and SupportTicketsEnhanced (US-266).
 *
 * Both pages kept their own copies of the same reads. A failed message or
 * suggestion read was logged and the dialog showed an empty conversation; the
 * enhanced page decided whether to auto-analyze from suggestions state read
 * before the load it had just awaited, so it re-ran the analysis on every
 * open. Status, assignment and replies reported success on a write RLS
 * filtered to zero rows.
 *
 * Reads throw, writes select the row back, and "has this ticket been analyzed"
 * is answered from a fresh read. These are platform tables (no company scope);
 * the key carries the company and user so one account's cache is never served
 * to another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'support' | 'system';
  sender_name: string;
  sender_email: string | null;
  content: string;
  created_at: string;
}

export interface AISuggestion {
  id: string;
  suggestion_type: string;
  confidence_score: number;
  suggested_category?: string | null;
  suggested_priority?: string | null;
  suggested_content?: string | null;
  kb_article_id?: string | null;
}

export const supportTicketsKey = (companyId: string | undefined, userId: string | undefined) =>
  ['support-tickets', companyId, userId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SupportTicket[];
}

export async function fetchTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SupportMessage[];
}

export async function fetchTicketSuggestions(ticketId: string): Promise<AISuggestion[]> {
  const { data, error } = await supabase
    .from('support_suggestions')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('confidence_score', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AISuggestion[];
}

export async function updateSupportTicket(
  id: string,
  patch: { status?: string; assigned_to?: string | null },
  now: Date = new Date()
): Promise<void> {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ ...patch, updated_at: now.toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The ticket was not updated. You may not have permission to edit support tickets.');
}

/** Posts a support reply and moves an open ticket to in_progress. */
export async function sendSupportResponse(ticket: Pick<SupportTicket, 'id' | 'status'>, content: string): Promise<void> {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticket.id, sender_type: 'support', sender_name: 'Support Team', content })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The reply was not sent. You may not have permission to reply to tickets.');
  if (ticket.status === 'open') await updateSupportTicket(ticket.id, { status: 'in_progress' });
}

export function useSupportTickets({ enabled = true, selectedTicketId = null, withSuggestions = false }: {
  enabled?: boolean;
  selectedTicketId?: string | null;
  withSuggestions?: boolean;
} = {}) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = supportTicketsKey(companyId, userId);
  const on = enabled && !!userId;
  const messagesKey = (ticketId: string | null) => [...key, 'messages', ticketId] as const;
  const suggestionsKey = (ticketId: string | null) => [...key, 'suggestions', ticketId] as const;

  const tickets = useQuery({ queryKey: key, queryFn: fetchSupportTickets, enabled: on });
  const messages = useQuery({
    queryKey: messagesKey(selectedTicketId),
    queryFn: () => fetchTicketMessages(selectedTicketId as string),
    enabled: on && !!selectedTicketId,
  });
  const suggestions = useQuery({
    queryKey: suggestionsKey(selectedTicketId),
    queryFn: () => fetchTicketSuggestions(selectedTicketId as string),
    enabled: on && withSuggestions && !!selectedTicketId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { status?: string; assigned_to?: string | null } }) =>
      updateSupportTicket(id, patch),
    onSettled: invalidate,
  });
  const reply = useMutation({
    mutationFn: ({ ticket, content }: { ticket: Pick<SupportTicket, 'id' | 'status'>; content: string }) =>
      sendSupportResponse(ticket, content),
    onSettled: invalidate,
  });
  const analyze = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.functions.invoke('analyze-support-ticket', { body: { ticketId } });
      if (error) throw error;
    },
    onSettled: (_d, _e, ticketId) => queryClient.invalidateQueries({ queryKey: suggestionsKey(ticketId) }),
  });

  return {
    tickets,
    messages,
    suggestions,
    setStatus: (id: string, status: string) => update.mutateAsync({ id, patch: { status } }),
    assign: (id: string, assignee: string | null) => update.mutateAsync({ id, patch: { assigned_to: assignee } }),
    reply: (ticket: Pick<SupportTicket, 'id' | 'status'>, content: string) => reply.mutateAsync({ ticket, content }),
    analyze: (ticketId: string) => analyze.mutateAsync(ticketId),
    /** A fresh read of a ticket's suggestions, for deciding whether to analyze it. */
    readSuggestions: (ticketId: string) =>
      queryClient.fetchQuery({ queryKey: suggestionsKey(ticketId), queryFn: () => fetchTicketSuggestions(ticketId), staleTime: 0 }),
  };
}
