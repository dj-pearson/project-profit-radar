/**
 * US-085: mobile-optimized dashboard home
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileDashboardHome } from '@/components/dashboard/MobileDashboardHome';
import type { ProjectHealth } from '@/hooks/useDashboardData';

const project: ProjectHealth = {
  id: 'p1',
  name: 'Riverside Apartments',
  overallHealth: 'good',
  budget: { spent: 0, total: 0, variance: 0 },
  schedule: { completion: 42, daysRemaining: 10, onTrack: true },
  safety: { incidents: 0, score: 100 },
};

const renderHome = (projects: ProjectHealth[] = [project]) =>
  render(
    <MemoryRouter>
      <MobileDashboardHome projects={projects} onRefresh={async () => {}} />
    </MemoryRouter>
  );

describe('MobileDashboardHome (US-085)', () => {
  it('renders a prominent Clock In/Out control', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /clock in or out/i })).toBeInTheDocument();
  });

  it('renders the three quick actions', () => {
    renderHome();
    expect(screen.getByRole('button', { name: 'New Daily Report' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take Photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Time' })).toBeInTheDocument();
  });

  it('renders a swipeable project card with name and progress', () => {
    renderHome();
    expect(
      screen.getByRole('button', { name: /open project Riverside Apartments/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/42% complete/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no projects', () => {
    renderHome([]);
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it('renders bottom navigation items', () => {
    renderHome();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });
});
