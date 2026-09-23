/**
 * US-366: templates are identified by category_id (+ 'template' tag fallback),
 * not the nonexistent documents.document_type column.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

type Result = { data: unknown; error: { message: string } | null };
const { results, calls } = vi.hoisted(() => ({
  results: {} as Record<string, Result>,
  calls: [] as { table: string; method: string; args: unknown[] }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'or', 'ilike', 'limit', 'eq', 'order', 'insert', 'single', 'contains']) {
      b[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args });
        return b;
      };
    }
    b.then = (resolve: (r: Result) => unknown) =>
      Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve);
    return b;
  };
  return { supabase: { from: (t: string) => builder(t), storage: { from: () => ({}) } } };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, userProfile: { company_id: 'c1' } }),
}));
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import DocumentTemplates from '@/pages/DocumentTemplates';

describe('DocumentTemplates query (US-366)', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
  });

  it('filters templates by the Templates category_id or the template tag', async () => {
    results.document_categories = { data: [{ id: 'cat-tpl' }], error: null };
    results.documents = {
      data: [{ id: 'd1', name: 'Standard Contract', description: null, file_path: 'c1/t/a.pdf', file_type: 'application/pdf', file_size: 10 }],
      error: null,
    };
    render(<DocumentTemplates />);

    expect(await screen.findByText('Standard Contract')).toBeInTheDocument();
    const docCalls = calls.filter((c) => c.table === 'documents');
    expect(docCalls).toContainEqual({ table: 'documents', method: 'or', args: ['category_id.eq.cat-tpl,tags.cs.{template}'] });
    expect(docCalls).toContainEqual({ table: 'documents', method: 'eq', args: ['company_id', 'c1'] });
    for (const c of docCalls) expect(JSON.stringify(c.args)).not.toMatch(/document_type/);
    expect(calls).toContainEqual({ table: 'document_categories', method: 'eq', args: ['company_id', 'c1'] });
    expect(calls).toContainEqual({ table: 'document_categories', method: 'ilike', args: ['name', 'Templates'] });
  });

  it('falls back to the tag alone when the company has no Templates category', async () => {
    results.document_categories = { data: [], error: null };
    render(<DocumentTemplates />);
    await waitFor(() =>
      expect(calls).toContainEqual({ table: 'documents', method: 'or', args: ['tags.cs.{template}'] }),
    );
  });
});
