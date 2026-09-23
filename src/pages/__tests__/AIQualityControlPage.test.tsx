/**
 * US-370: /ai-quality-control rendered hardcoded mockMetrics and
 * mockInspections (87% quality score, 24 inspections) with no query. It now
 * reads quality_inspections for the user's company.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Result = { data: unknown; error: { message: string } | null };
const calls: { table: string; method: string; args: unknown[] }[] = [];
let result: Result = { data: [], error: null };

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) {
    b[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return b;
    };
  }
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { company_id: 'co-1' } }),
}));
vi.mock('@/components/layouts/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import AIQualityControlPage from '../AIQualityControlPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AIQualityControlPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

const row = (over: Record<string, unknown>) => ({
  id: String(over.n),
  inspection_number: `QI-${over.n}`,
  inspection_type: 'Framing',
  inspection_date: '2026-09-01',
  status: 'completed',
  passed: true,
  reinspection_required: false,
  deficiencies: [],
  ...over,
});

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('AIQualityControlPage (US-370)', () => {
  beforeEach(() => {
    calls.length = 0;
    result = { data: [], error: null };
  });

  it('queries quality_inspections scoped to the company', async () => {
    renderPage();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls.every((c) => c.table === 'quality_inspections')).toBe(true);
    const select = calls.find((c) => c.method === 'select')!.args[0] as string;
    for (const col of ['inspection_type', 'inspection_date', 'status', 'passed', 'reinspection_required', 'deficiencies']) {
      expect(select).toContain(col);
    }
    expect(calls.find((c) => c.method === 'eq')!.args).toEqual(['company_id', 'co-1']);
  });

  it('computes the tiles from the rows returned', async () => {
    result = {
      data: [
        row({ n: 1, passed: true }),
        row({ n: 2, passed: true }),
        row({ n: 3, passed: false, reinspection_required: true, deficiencies: [{}, {}] }),
        row({ n: 4, passed: null, status: 'pending' }),
      ],
      error: null,
    };
    renderPage();
    expect(await screen.findByText('67%')).toBeInTheDocument(); // 2 of 3 decided
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1 pending or in progress')).toBeInTheDocument();
    expect(screen.getByText('2 deficiencies')).toBeInTheDocument();
  });

  it('shows an empty state, not a score, when there are no inspections', async () => {
    renderPage();
    expect(await screen.findByText(/No quality inspections recorded yet/)).toBeInTheDocument();
    expect(screen.queryByText('87%')).not.toBeInTheDocument();
    expect(screen.getByText(/Computer-vision defect detection isn't available yet/)).toBeInTheDocument();
  });

  it('shows the error instead of zeros when the query fails', async () => {
    result = { data: null, error: { message: 'permission denied for table quality_inspections' } };
    renderPage();
    expect(await screen.findByText(/Couldn't load inspections/)).toBeInTheDocument();
  });

  it('source has no mock data or Math.random', () => {
    const src = stripComments(readFileSync(resolve(__dirname, '../AIQualityControlPage.tsx'), 'utf8'));
    expect(src).not.toMatch(/Math\.random|mockMetrics|mockInspections/);
  });
});
