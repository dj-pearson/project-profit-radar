import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Badge>Badge</Badge>);
      expect(screen.getByText('Badge')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <Badge>
          <span data-testid="icon">★</span>
          Featured
        </Badge>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('applies default styles', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'border', 'px-2.5', 'py-0.5', 'text-xs', 'font-semibold');
    });

    it('applies custom className', () => {
      render(<Badge className="custom-badge">Badge</Badge>);
      expect(screen.getByText('Badge')).toHaveClass('custom-badge');
    });
  });

  describe('variants', () => {
    it('applies default variant styles', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('applies secondary variant styles', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary', 'text-foreground');
    });

    it('applies destructive variant styles', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });

    it('applies success variant styles', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('applies warning variant styles', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('applies outline variant styles', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('text-foreground');
    });
  });

  describe('use cases', () => {
    it('renders status badge', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders count badge', () => {
      render(<Badge>5</Badge>);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders notification badge', () => {
      render(<Badge variant="destructive">New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders project status badge', () => {
      const status = 'In Progress';
      render(<Badge variant="secondary">{status}</Badge>);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('renders multiple badges', () => {
      render(
        <div>
          <Badge variant="success">Active</Badge>
          <Badge variant="destructive">Urgent</Badge>
          <Badge variant="secondary">Pending</Badge>
        </div>
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('supports aria-label', () => {
      render(<Badge aria-label="5 unread notifications">5</Badge>);
      expect(screen.getByLabelText('5 unread notifications')).toBeInTheDocument();
    });

    it('supports role attribute', () => {
      render(<Badge role="status">Online</Badge>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('is visible to screen readers', () => {
      render(<Badge>Important</Badge>);
      const badge = screen.getByText('Important');
      expect(badge).toBeVisible();
    });
  });

  describe('HTML attributes', () => {
    it('supports data attributes', () => {
      render(<Badge data-testid="custom-badge">Badge</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });

    it('supports id attribute', () => {
      render(<Badge id="badge-1">Badge</Badge>);
      expect(screen.getByText('Badge')).toHaveAttribute('id', 'badge-1');
    });

    it('supports onClick handler', async () => {
      const handleClick = vi.fn();
      render(<Badge onClick={handleClick}>Clickable</Badge>);

      await screen.getByText('Clickable').click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling combinations', () => {
    it('combines variant and custom className', () => {
      render(
        <Badge variant="destructive" className="uppercase">
          Error
        </Badge>
      );
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-destructive', 'uppercase');
    });

    it('maintains base styles with variant', () => {
      render(<Badge variant="secondary">Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full');
      expect(badge).toHaveClass('bg-secondary');
    });
  });

  describe('content types', () => {
    it('renders with icon', () => {
      render(
        <Badge>
          <svg data-testid="icon" />
          Label
        </Badge>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Label')).toBeInTheDocument();
    });

    it('renders with only icon', () => {
      render(
        <Badge aria-label="Settings">
          <svg data-testid="icon" />
        </Badge>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders long text', () => {
      const longText = 'This is a very long badge text';
      render(<Badge>{longText}</Badge>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});
