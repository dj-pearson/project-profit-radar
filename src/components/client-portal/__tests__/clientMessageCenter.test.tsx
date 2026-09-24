/**
 * US-316: an enrolled client sees their project messages and can post one;
 * a client outside the conversation is told why instead of being handed a
 * composer that RLS will refuse. Plus the manager-facing participant panel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

// The participant panel reads through TanStack Query (US-266).
const render = (ui: ReactElement) =>
  rtlRender(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>,
  );
import userEvent from '@testing-library/user-event';

type Result = { data: unknown; error: unknown };

const { from, toast, state } = vi.hoisted(() => {
  const state = {
    messages: [] as unknown[],
    participant: null as unknown,
    participants: [] as unknown[],
    team: [] as unknown[],
    inserts: [] as { table: string; row: unknown }[],
    updates: [] as { table: string; row: unknown }[],
    deletes: [] as string[],
    insertError: null as unknown,
  };
  // A chainable stand-in for the PostgREST builder: every filter returns the
  // builder, and awaiting it resolves to the table's canned result.
  const from = vi.fn((table: string) => {
    const result = (): Result => {
      if (table === 'project_messages') return { data: state.messages, error: null };
      if (table === 'project_communication_participants') return { data: state.participants, error: null };
      if (table === 'user_profiles') return { data: state.team, error: null };
      return { data: [], error: null };
    };
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'order']) b[m] = vi.fn(() => b);
    b.maybeSingle = vi.fn(async () => ({ data: state.participant, error: null }));
    // Writes: awaited directly (ClientMessageCenter) or read back with
    // .select() after their filters (the participant panel, US-266). Either
    // way they resolve once, to the row they touched.
    const write = (settle: () => Result) => {
      const w: Record<string, unknown> = {};
      for (const m of ['eq', 'select']) w[m] = vi.fn(() => w);
      w.then = (resolve: (r: Result) => unknown) => Promise.resolve(settle()).then(resolve);
      return w;
    };
    b.insert = vi.fn((row: unknown) => {
      state.inserts.push({ table, row });
      return write(() => ({ data: state.insertError ? null : [{ id: 'new-1' }], error: state.insertError }));
    });
    b.update = vi.fn((row: unknown) => {
      state.updates.push({ table, row });
      return write(() => ({ data: [{ id: 'updated-1' }], error: null }));
    });
    b.delete = vi.fn(() => {
      const w = write(() => ({ data: [{ id: 'deleted-1' }], error: null }));
      const eq = w.eq as ReturnType<typeof vi.fn>;
      eq.mockImplementation((c: string, v: string) => { if (c === 'id') state.deletes.push(v); return w; });
      return w;
    });
    b.then = (resolve: (r: Result) => unknown) => resolve(result());
    return b;
  });
  return { from, toast: vi.fn(), state };
});

vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  return { supabase: { from, channel: vi.fn(() => channel), removeChannel: vi.fn() } };
});
vi.mock('@/hooks/use-toast', () => ({ toast, useToast: () => ({ toast }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'client-1' },
    userProfile: { id: 'pm-1', role: 'project_manager', company_id: 'co-1' },
  }),
}));
vi.mock('@/lib/storage/StorageImage', () => ({ StorageImage: () => null }));
vi.mock('@/lib/storage/signedUrl', () => ({ openStorageObject: vi.fn() }));

import { ClientMessageCenter } from '@/components/client-portal/ClientMessageCenter';
import { ProjectConversationParticipants } from '@/components/project/ProjectConversationParticipants';

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  Object.assign(state, {
    messages: [], participant: null, participants: [], team: [],
    inserts: [], updates: [], deletes: [], insertError: null,
  });
});

describe('ClientMessageCenter (US-316)', () => {
  it('shows the project messages, naming the contractor even when their profile is hidden', async () => {
    state.participant = { can_upload_files: true };
    state.messages = [{
      id: 'm1', project_id: 'p1', sender_id: 'pm-1', sender_type: 'contractor',
      message_text: 'Drywall starts Monday', message_type: 'text', attachments: null,
      is_read: false, created_at: new Date().toISOString(), sender: null,
    }];
    render(<ClientMessageCenter projectId="p1" />);

    expect(await screen.findByText('Drywall starts Monday')).toBeInTheDocument();
    expect(screen.getByText('Your contractor')).toBeInTheDocument();
  });

  it('lets an enrolled client post, as a client, with category and priority', async () => {
    state.participant = { can_upload_files: false };
    const user = userEvent.setup();
    render(<ClientMessageCenter projectId="p1" />);

    const box = await screen.findByPlaceholderText(/type your message/i);
    await waitFor(() => expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument());
    await user.type(box, 'Can we move the outlet?');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(state.inserts).toHaveLength(1));
    expect(state.inserts[0]).toEqual({
      table: 'project_messages',
      row: expect.objectContaining({
        project_id: 'p1', sender_id: 'client-1', sender_type: 'client',
        message_text: 'Can we move the outlet?', category: 'general', priority: 'normal',
      }),
    });
    // can_upload_files is false for this participant: no attach button.
    expect(screen.queryByRole('button', { name: /attach a file/i })).not.toBeInTheDocument();
  });

  it('explains, rather than offering a composer RLS will refuse, when the client is not in the conversation', async () => {
    state.participant = null;
    render(<ClientMessageCenter projectId="p1" />);

    expect(await screen.findByText(/not been added to this project's conversation/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/type your message/i)).not.toBeInTheDocument();
  });
});

describe('ProjectConversationParticipants (US-316)', () => {
  it('lists participants and lets a manager toggle uploads, remove, and add a team member', async () => {
    state.participants = [{
      id: 'pcp-1', user_id: 'client-1', participant_type: 'client', can_upload_files: true,
      user: { first_name: 'Dana', last_name: 'Whitfield', email: 'dana@example.com', role: 'client_portal' },
    }];
    state.team = [{ id: 'fs-1', first_name: 'Sam', last_name: 'Ortiz', email: 'sam@a.test', role: 'field_supervisor' }];
    const user = userEvent.setup();
    render(<ProjectConversationParticipants projectId="p1" />);

    expect(await screen.findByText('Dana Whitfield')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: /file uploads for dana whitfield/i }));
    await waitFor(() => expect(state.updates).toEqual([
      { table: 'project_communication_participants', row: { can_upload_files: false } },
    ]));

    await user.click(screen.getByRole('button', { name: /remove dana whitfield/i }));
    await waitFor(() => expect(state.deletes).toEqual(['pcp-1']));

    expect(screen.getByLabelText(/add a team member/i)).toBeInTheDocument();
  });
});
