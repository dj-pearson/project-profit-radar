/**
 * US-366: global search must return documents (it selected the nonexistent
 * documents.document_type and dropped the error) and must not ignore the error.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type Result = { data: unknown; error: { message: string } | null };
const { results, calls } = vi.hoisted(() => ({
  results: {} as Record<string, Result>,
  calls: [] as { table: string; method: string; args: unknown[] }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'or', 'ilike', 'limit', 'eq', 'order']) {
      b[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args });
        return b;
      };
    }
    b.then = (resolve: (r: Result) => unknown) =>
      Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve);
    return b;
  };
  return { supabase: { from: (t: string) => builder(t) } };
});

import { DashboardSearchTrigger } from '@/components/search/DashboardSearchTrigger';

const openAndType = (q: string) => {
  render(
    <MemoryRouter>
      <DashboardSearchTrigger />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Search (Ctrl+K)' }));
  fireEvent.change(screen.getByLabelText('Search input'), { target: { value: q } });
};

describe('DashboardSearchTrigger documents (US-366)', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
  });
  afterEach(() => vi.restoreAllMocks());

  it('includes a seeded document by title, without selecting document_type', async () => {
    results.documents = {
      data: [{ id: 'd1', name: 'Foundation Spec.pdf', category: { name: 'Templates' } }],
      error: null,
    };
    openAndType('Foundation');

    expect(await screen.findByText('Foundation Spec.pdf', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();

    const select = calls.find((c) => c.table === 'documents' && c.method === 'select');
    expect(String(select?.args[0])).not.toMatch(/document_type/);
    expect(calls).toContainEqual({ table: 'documents', method: 'ilike', args: ['name', '%Foundation%'] });
  });

  it('logs the documents query error instead of ignoring it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.documents = { data: null, error: { message: 'column documents.bogus does not exist' } };
    openAndType('Found');

    await waitFor(
      () =>
        expect(spy).toHaveBeenCalledWith(
          'Document search unavailable:',
          'column documents.bogus does not exist',
        ),
      { timeout: 2000 },
    );
  });
});
