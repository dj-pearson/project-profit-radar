import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'pm@example.com' }, userProfile: null, signOut: vi.fn() }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useImpersonation', () => ({ useImpersonation: () => ({ isImpersonating: false }) }));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button type="button">menu</button>,
}));
vi.mock('@/components/navigation/SimplifiedSidebar', () => ({ SimplifiedSidebar: () => null }));
vi.mock('@/components/ui/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/mobile/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('@/components/TrialStatusBanner', () => ({ default: () => null }));
vi.mock('@/components/admin/ImpersonationBanner', () => ({ ImpersonationBanner: () => null }));
vi.mock('@/components/realtime/RealtimeNotificationCenter', () => ({ RealtimeNotificationCenter: () => null }));
vi.mock('@/components/search/DashboardSearchTrigger', () => ({ DashboardSearchTrigger: () => null }));

import { DashboardLayout } from '../DashboardLayout';

const renderLayout = (ui: React.ReactElement) =>
  render(<MemoryRouter initialEntries={['/projects-hub/materials']}>{ui}</MemoryRouter>);

describe('DashboardLayout page header (US-377)', () => {
  it('renders the title prop as the one h1 through PageHeader', () => {
    renderLayout(
      <DashboardLayout
        title="Materials"
        description="Track inventory, orders, and material costs"
        headerActions={<button type="button">Add Material</button>}
      >
        <p>body</p>
      </DashboardLayout>,
    );
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Materials');
    expect(headings[0]).toHaveAttribute('id', 'page-title');
    expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'page-title');
    expect(screen.getByText('Track inventory, orders, and material costs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Material' })).toBeInTheDocument();
  });

  it('keeps a single h1 when no title is passed', () => {
    renderLayout(
      <DashboardLayout>
        <p>body</p>
      </DashboardLayout>,
    );
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Brikly');
  });
});
