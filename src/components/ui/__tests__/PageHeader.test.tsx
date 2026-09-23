import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders the title as the only h1, with the default page-title id', () => {
    render(<PageHeader title="Materials" />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Materials');
    expect(headings[0]).toHaveAttribute('id', 'page-title');
  });

  it('accepts a custom title id', () => {
    render(<PageHeader title="Materials" titleId="materials-heading" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'materials-heading');
  });

  it('renders description, breadcrumb and actions when given', () => {
    render(
      <PageHeader
        title="Change Orders"
        description="Client approval workflows"
        breadcrumb={<nav aria-label="Breadcrumb">Projects</nav>}
        actions={<button type="button">Create change order</button>}
      />,
    );
    expect(screen.getByText('Client approval workflows')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create change order' })).toBeInTheDocument();
  });

  it('puts the breadcrumb before the heading in document order', () => {
    const { container } = render(
      <PageHeader title="Tasks" breadcrumb={<nav aria-label="Breadcrumb">Home</nav>} />,
    );
    const nav = container.querySelector('nav');
    const h1 = container.querySelector('h1');
    expect(nav && h1 && nav.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('omits the description and actions wrappers when not given', () => {
    const { container } = render(<PageHeader title="Tasks" />);
    expect(container.querySelector('h1 + div')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('allows rich description content without invalid <p> nesting', () => {
    const { container } = render(
      <PageHeader title="Riverside" description={<div data-testid="meta">Client: Acme</div>} />,
    );
    expect(screen.getByTestId('meta').closest('p')).toBeNull();
    expect(container.querySelector('[data-slot="page-header"]')).not.toBeNull();
  });
});
