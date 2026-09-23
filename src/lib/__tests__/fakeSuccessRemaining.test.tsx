/**
 * US-309, last pass: the 14 files check-fake-success.mjs still carried.
 *
 * The three that now perform a real write are exercised here against a mocked
 * client - the footer newsletter form (capture-lead), the /communication
 * message pane (chat_messages via useAdvancedChat) and WorkflowAutomationService
 * (workflow_definitions). The rest were changed to say nothing was saved, and
 * are pinned by source.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';

const h = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  });
  return { toast, invoke: vi.fn(), from: vi.fn() };
});

vi.mock('sonner', () => ({ toast: h.toast }));
// The logo needs a TenantProvider; it has nothing to do with the signup form.
vi.mock('@/components/ui/smart-logo', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => h.invoke(...a) },
    from: (...a: unknown[]) => h.from(...a),
  },
}));

import Footer from '@/components/Footer';
import { AdvancedChatInterface, channelMessages } from '@/components/communication/AdvancedChatInterface';
import type { ChatChannel, ChatMessage } from '@/hooks/useAdvancedChat';
import { workflowAutomationService } from '@/services/WorkflowAutomationService';
import { integrationService } from '@/services/IntegrationService';

/** Comments stripped: each fixed file documents the claim it used to make. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .map((line) => line.replace(/\s\/\/ .*$/, ''))
    .join('\n');
}

beforeEach(() => {
  h.invoke.mockReset();
  h.from.mockReset();
  h.toast.mockReset();
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.toast.info.mockReset();
});

describe('Footer newsletter signup', () => {
  const submit = (email: string) => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
  };

  it('sends the address to capture-lead and thanks only on success', async () => {
    h.invoke.mockResolvedValue({ data: { success: true }, error: null });
    submit('crew@example.com');
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith('Thanks for subscribing!'));
    expect(h.invoke).toHaveBeenCalledWith(
      'capture-lead',
      expect.objectContaining({
        body: expect.objectContaining({ email: 'crew@example.com', interestType: 'newsletter' }),
      }),
    );
  });

  it('does not thank anyone when the function says it did not record the lead', async () => {
    h.invoke.mockResolvedValue({ data: { success: false, error: 'Verification failed' }, error: null });
    submit('crew@example.com');
    await waitFor(() => expect(h.toast.error).toHaveBeenCalled());
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('crew@example.com');
  });

  it('or when the invoke itself errors', async () => {
    h.invoke.mockResolvedValue({ data: null, error: new Error('network') });
    submit('crew@example.com');
    await waitFor(() => expect(h.toast.error).toHaveBeenCalled());
    expect(h.toast.success).not.toHaveBeenCalled();
  });
});

describe('/communication message pane', () => {
  const thread: ChatChannel = {
    id: 'c1',
    name: 'Site team',
    channel_type: 'group',
    is_private: false,
    created_at: '2026-09-01T00:00:00Z',
    created_by: 'u1',
    member_count: 0,
    unread_count: 0,
  };
  const msg = (id: string, channel_id = 'c1'): ChatMessage => ({
    id,
    content: `m${id}`,
    sender_id: 'u2',
    sender_name: 'User',
    timestamp: '2026-09-01T10:00:00Z',
    message_type: 'text',
    channel_id,
  });

  it('keeps the draft when the insert returned nothing', async () => {
    const onSend = vi.fn().mockResolvedValue(null);
    render(<AdvancedChatInterface thread={thread} messages={[]} currentUserId="u1" onSend={onSend} />);
    const box = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(box, { target: { value: 'Pour is at 7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('Pour is at 7', undefined));
    expect(box).toHaveValue('Pour is at 7');
  });

  it('clears it only once a row came back', async () => {
    const onSend = vi.fn().mockResolvedValue({ id: 'new' });
    render(<AdvancedChatInterface thread={thread} messages={[]} currentUserId="u1" onSend={onSend} />);
    const box = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(box, { target: { value: 'Pour is at 7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('shows only this channel, once per message', () => {
    // Realtime appends every channel's inserts, and a reload after send can
    // race it for the same row.
    const out = channelMessages([msg('1'), msg('2', 'other'), msg('1'), msg('3')], 'c1');
    expect(out.map((m) => m.id)).toEqual(['1', '3']);
  });

  it('no longer renders invented people or messages', () => {
    for (const f of [
      'src/components/communication/AdvancedChatInterface.tsx',
      'src/components/communication/ThreadManager.tsx',
    ]) {
      const src = code(f);
      expect(src).not.toMatch(/simulated(Messages|Threads)/);
      expect(src).not.toContain('has been delivered');
      expect(src).not.toContain("title: \"Thread updated\"");
    }
  });
});

describe('WorkflowAutomationService writes workflow_definitions', () => {
  /** A chain whose terminal await resolves to `result`. */
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['insert', 'update', 'delete', 'select', 'eq', 'order', 'limit', 'single']) {
      c[m] = vi.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
    return c as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<unknown>;
  };

  it('toggling updates is_active and reports success on a returned row', async () => {
    const c = chain({ data: [{ id: 'w1' }], error: null });
    h.from.mockReturnValue(c);
    await expect(workflowAutomationService.toggleWorkflowRule('w1', false)).resolves.toBe(true);
    expect(h.from).toHaveBeenCalledWith('workflow_definitions');
    expect(c.update).toHaveBeenCalledWith({ is_active: false });
    expect(c.eq).toHaveBeenCalledWith('id', 'w1');
    expect(h.toast.success).toHaveBeenCalled();
  });

  it('a delete RLS silently refused is a failure, not "deleted successfully"', async () => {
    h.from.mockReturnValue(chain({ data: [], error: null }));
    await expect(workflowAutomationService.deleteWorkflowRule('w1')).resolves.toBe(false);
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalled();
  });

  it('create inserts and returns the database id, not an invented one', async () => {
    const c = chain({ data: { id: 'db-id', created_at: '2026-09-23T00:00:00Z' }, error: null });
    h.from.mockReturnValue(c);
    const rule = await workflowAutomationService.createWorkflowRule('co1', {
      name: 'Notify on completion',
      description: '',
      isActive: true,
      trigger: { type: 'project_status_change', conditions: { to: 'completed' } },
      conditions: [],
      actions: [],
      priority: 1,
      createdBy: 'u1',
    });
    expect(rule.id).toBe('db-id');
    expect(c.insert).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 'co1', name: 'Notify on completion', trigger_type: 'project_status_change' }),
    );
  });

  it('a project status change no longer claims workflows ran', async () => {
    await workflowAutomationService.processProjectStatusChange('p1', 'active', 'completed');
    expect(h.toast.success).not.toHaveBeenCalled();
  });
});

describe('IntegrationService methods reachable from ContextualActions', () => {
  it('creating a project from an opportunity reports failure instead of an invented id', async () => {
    const r = await integrationService.createProjectFromOpportunity({
      opportunityId: 'o1',
      projectName: 'x',
      estimatedBudget: 1,
      startDate: '2026-01-01',
      projectType: 'residential',
    });
    expect(r).toEqual({ success: false });
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it('and so does creating an invoice from a project', async () => {
    await expect(integrationService.createInvoiceFromProject('p1')).resolves.toEqual({ success: false });
    expect(h.toast.success).not.toHaveBeenCalled();
  });
});

describe('screens with nothing behind them now say so', () => {
  const cases: Array<[string, RegExp]> = [
    ['src/components/portal/WhiteLabelPortal.tsx', /Portal Settings Saved/],
    ['src/components/financial/EnhancedJobCosting.tsx', /Material pricing updated successfully/],
    ['src/components/communication/AutomatedUpdates.tsx', /Test update sent successfully/],
    ['src/components/crm/WorkflowVersionControl.tsx', /John Doe|Jane Smith|New version saved/],
    ['src/components/equipment/EquipmentMaintenanceTracking.tsx', /Downtown Office Complex|successfully scheduled|successfully logged/],
    ['src/components/mobile/MobileMaterialTracker.tsx', /ABC Supply Co|Photo captured successfully/],
    ['src/services/IntegrationEcosystemService.ts', /Math\.random\(\)/],
  ];
  it.each(cases)('%s', (file, fake) => {
    expect(code(file)).not.toMatch(fake);
  });

  it('SubcontractorDisclosureForm claims success only after an awaited onSave', () => {
    const src = code('src/components/procurement/SubcontractorDisclosureForm.tsx');
    expect(src).toMatch(/if \(!onSave\) \{[\s\S]*?title: "Not saved"/);
    expect(src).toMatch(/await onSave\(formData\);\s*toast\(\{\s*title: "Subcontractor Disclosure Saved"/);
  });
});
