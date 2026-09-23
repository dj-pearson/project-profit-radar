/**
 * US-370: the API playground answered every request with a canned
 * { status: 200, message: 'Success' } without calling anything, and the
 * "API Requests" tile summed documentation view_count. The playground now
 * says it doesn't send requests and the tile is labelled as doc views.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReactNode } from 'react';

const calls: { table: string; method: string; args: unknown[] }[] = [];

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'order']) {
    b[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return b;
    };
  }
  b.then = (res: (r: unknown) => unknown) =>
    Promise.resolve({
      data: [{ id: 'd1', endpoint_path: '/projects', http_method: 'GET', category: 'Projects', title: 'List projects', description: null, request_schema: null, response_schema: null, version: 'v1', view_count: 42 }],
      error: null,
    }).then(res);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table) },
}));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import DeveloperPortal from '../DeveloperPortal';

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('DeveloperPortal (US-370)', () => {
  it('labels api_documentation.view_count as doc views, not API requests', async () => {
    render(<DeveloperPortal />);
    await waitFor(() => expect(calls.some((c) => c.table === 'api_documentation')).toBe(true));
    expect(await screen.findByText('Doc Views')).toBeInTheDocument();
    expect(screen.queryByText('API Requests')).not.toBeInTheDocument();
  });

  it('has no canned playground response and no Send Request button', () => {
    const src = stripComments(readFileSync(resolve(__dirname, '../DeveloperPortal.tsx'), 'utf8'));
    expect(src).not.toMatch(/mockResponse|handleTestEndpoint|Send Request|Math\.random/);
    expect(src).toContain("The playground doesn't send requests yet.");
  });
});
