import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LoadingRegion,
  ListSkeleton,
  TableSkeleton,
  CardGridSkeleton,
  DashboardSkeleton,
  DataTablePageSkeleton,
} from '../skeletons';

describe('skeleton compositions (US-285)', () => {
  it('LoadingRegion is a busy status region with an sr-only label', () => {
    render(
      <LoadingRegion label="Loading permits">
        <div data-testid="shape" />
      </LoadingRegion>,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Loading permits');
    expect(screen.getByText('Loading permits')).toHaveClass('sr-only');
    expect(screen.getByTestId('shape')).toBeInTheDocument();
  });

  it.each([
    ['ListSkeleton', <ListSkeleton key="l" label="Loading tasks" />],
    ['TableSkeleton', <TableSkeleton key="t" label="Loading tasks" />],
    ['DashboardSkeleton', <DashboardSkeleton key="d" label="Loading tasks" />],
    ['DataTablePageSkeleton', <DataTablePageSkeleton key="p" label="Loading tasks" />],
    ['CardGridSkeleton', <CardGridSkeleton key="c" label="Loading tasks" />],
  ])('%s announces its label when given one', (_name, node) => {
    render(node);
    expect(screen.getByRole('status')).toHaveTextContent('Loading tasks');
  });

  it('ListSkeleton and TableSkeleton add no status region without a label', () => {
    render(
      <>
        <ListSkeleton />
        <TableSkeleton />
      </>,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders no literal "Loading..." text', () => {
    const { container } = render(<ListSkeleton label="Loading tasks" items={2} />);
    expect(container.textContent).not.toMatch(/\.\.\./);
  });
});
