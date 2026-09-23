/**
 * US-366: an RFI attachment is registered with category_id + tags, not the
 * nonexistent documents.document_type column.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

type Result = { data: unknown; error: { message: string } | null };
const { results, calls } = vi.hoisted(() => ({
  results: {} as Record<string, Result | Result[]>,
  calls: [] as { table: string; method: string; args: unknown[] }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'or', 'ilike', 'limit', 'eq', 'order', 'insert', 'single', 'in']) {
      b[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args });
        return b;
      };
    }
    b.then = (resolve: (r: Result) => unknown) => {
      const r = results[table];
      const next = Array.isArray(r) ? (r.length > 1 ? r.shift()! : r[0]) : r;
      return Promise.resolve(next ?? { data: [], error: null }).then(resolve);
    };
    return b;
  };
  return {
    supabase: {
      from: (t: string) => builder(t),
      storage: {
        from: () => ({
          upload: async () => ({ data: {}, error: null }),
          remove: async () => ({ data: {}, error: null }),
        }),
      },
    },
  };
});
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { ClientPortalRFIs } from '@/components/client/ClientPortalRFIs';

const submitWithFile = async () => {
  render(<ClientPortalRFIs projectId="p1" companyId="c1" userId="u1" />);
  fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Tile color' } });
  const file = new File(['x'], 'plan.pdf', { type: 'application/pdf' });
  fireEvent.change(document.getElementById('rfi-file')!, { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  await waitFor(() => expect(calls.some((c) => c.table === 'rfis' && c.method === 'insert')).toBe(true));
  const docInsert = calls.find((c) => c.table === 'documents' && c.method === 'insert');
  return (docInsert?.args[0] as Record<string, unknown>[])[0];
};

describe('ClientPortalRFIs attachment (US-366)', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
  });

  it('uses the RFI Attachments category_id when it exists', async () => {
    results.document_categories = { data: [{ id: 'cat-rfi' }], error: null };
    const row = await submitWithFile();
    expect(row).toMatchObject({ category_id: 'cat-rfi', tags: ['rfi-attachment'], company_id: 'c1', project_id: 'p1' });
    expect(row).not.toHaveProperty('document_type');
  });

  it('inserts with category_id null and the tag when RLS blocks creating the category', async () => {
    results.document_categories = [
      { data: [], error: null },
      { data: null, error: { message: 'new row violates row-level security policy' } },
    ];
    const row = await submitWithFile();
    expect(calls).toContainEqual(
      expect.objectContaining({ table: 'document_categories', method: 'insert' }),
    );
    expect(row).toMatchObject({ category_id: null, tags: ['rfi-attachment'] });
    expect(row).not.toHaveProperty('document_type');
  });
});
