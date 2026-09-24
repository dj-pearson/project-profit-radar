import { describe, it, expect, vi, beforeEach } from 'vitest';

const from = vi.fn();
const rpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => from(...a),
    rpc: (...a: unknown[]) => rpc(...a),
  },
}));

import { projectService } from '../projectService';
import {
  PROJECT_HAS_FINANCIAL_RECORDS,
  PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE,
  ProjectHasFinancialRecordsError,
} from '@/lib/projectDeleteErrors';

function deleteResolving(result: { error: unknown }) {
  // delete().eq('id').eq('company_id') -> awaitable
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn(() => chain);
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  from.mockReturnValue({ delete: vi.fn(() => chain) });
}

describe('projectService.deleteProject', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it('turns a 23503 into ProjectHasFinancialRecordsError', async () => {
    deleteResolving({
      error: {
        code: '23503',
        message: 'update or delete on table "projects" violates foreign key constraint "bills_project_id_fkey" on table "bills"',
      },
    });

    const err = await projectService.deleteProject('p1', 'c1').catch((e) => e);
    expect(err).toBeInstanceOf(ProjectHasFinancialRecordsError);
    expect(err.message).toBe(PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE);
    expect(err.code).toBe(PROJECT_HAS_FINANCIAL_RECORDS);
    expect(err.projectId).toBe('p1');
  });

  it('rethrows any other error unchanged', async () => {
    const other = { code: '42501', message: 'permission denied' };
    deleteResolving({ error: other });
    await expect(projectService.deleteProject('p1', 'c1')).rejects.toBe(other);
  });

  it('resolves when the delete succeeds', async () => {
    deleteResolving({ error: null });
    await expect(projectService.deleteProject('p1')).resolves.toBeUndefined();
  });
});

describe('projectService.archiveProject', () => {
  beforeEach(() => rpc.mockReset());

  it('closes the project through set_project_status', async () => {
    rpc.mockResolvedValue({ data: 'closed', error: null });
    await projectService.archiveProject('p1');
    expect(rpc).toHaveBeenCalledWith('set_project_status', {
      p_project_id: 'p1',
      p_status: 'closed',
      p_override_reason: null,
    });
  });

  it('throws the RPC refusal so the screen can show it', async () => {
    const refusal = { code: 'P0001', message: 'Cannot close: 1200.00 is still outstanding on this job' };
    rpc.mockResolvedValue({ data: null, error: refusal });
    await expect(projectService.archiveProject('p1')).rejects.toBe(refusal);
  });
});
