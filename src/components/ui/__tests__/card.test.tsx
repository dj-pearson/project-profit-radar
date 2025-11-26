import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

describe('Card', () => {
  describe('Card component', () => {
    it('renders with default styles', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'shadow-sm');
    });

    it('renders children correctly', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Card className="custom-class">Content</Card>);
      expect(screen.getByText('Content')).toHaveClass('custom-class');
    });

    it('forwards ref to div element', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<Card ref={ref}>Ref Card</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('supports data attributes', () => {
      render(<Card data-testid="test-card">Test</Card>);
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });
  });

  describe('CardHeader component', () => {
    it('renders with default styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('renders children correctly', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Header</CardHeader>);
      expect(screen.getByText('Header')).toHaveClass('custom-header');
    });

    it('forwards ref to div element', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardHeader ref={ref}>Ref Header</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle component', () => {
    it('renders as h3 element', () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole('heading', { level: 3, name: 'Title' })).toBeInTheDocument();
    });

    it('renders with default styles', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      expect(screen.getByText('Title')).toHaveClass('custom-title');
    });

    it('forwards ref', () => {
      const ref = { current: null as HTMLParagraphElement | null };
      render(<CardTitle ref={ref}>Ref Title</CardTitle>);
      expect(ref.current).not.toBeNull();
    });
  });

  describe('CardDescription component', () => {
    it('renders as p element', () => {
      render(<CardDescription>Description</CardDescription>);
      const description = screen.getByText('Description');
      expect(description.tagName).toBe('P');
    });

    it('renders with default styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>);
      expect(screen.getByText('Description')).toHaveClass('custom-desc');
    });

    it('forwards ref', () => {
      const ref = { current: null as HTMLParagraphElement | null };
      render(<CardDescription ref={ref}>Ref Desc</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent component', () => {
    it('renders with default styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('renders children correctly', () => {
      render(<CardContent>Card Content Here</CardContent>);
      expect(screen.getByText('Card Content Here')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<CardContent className="custom-content">Content</CardContent>);
      expect(screen.getByText('Content')).toHaveClass('custom-content');
    });

    it('forwards ref to div element', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardContent ref={ref}>Ref Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter component', () => {
    it('renders with default styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('renders children correctly', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer">Footer</CardFooter>);
      expect(screen.getByText('Footer')).toHaveClass('custom-footer');
    });

    it('forwards ref to div element', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardFooter ref={ref}>Ref Footer</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Card composition', () => {
    it('renders a complete card with all subcomponents', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>View and manage your project</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Budget: $100,000</p>
            <p>Status: Active</p>
          </CardContent>
          <CardFooter>
            <button>Save</button>
            <button>Cancel</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('full-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Project Details' })).toBeInTheDocument();
      expect(screen.getByText('View and manage your project')).toBeInTheDocument();
      expect(screen.getByText('Budget: $100,000')).toBeInTheDocument();
      expect(screen.getByText('Status: Active')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders nested content correctly', () => {
      render(
        <Card>
          <CardContent>
            <div data-testid="nested-div">
              <span>Nested content</span>
            </div>
          </CardContent>
        </Card>
      );

      expect(screen.getByTestId('nested-div')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('supports aria attributes on Card', () => {
      render(
        <Card role="article" aria-labelledby="card-title">
          <CardTitle id="card-title">Accessible Card</CardTitle>
        </Card>
      );
      expect(screen.getByRole('article')).toHaveAttribute('aria-labelledby', 'card-title');
    });

    it('supports aria attributes on CardTitle', () => {
      render(<CardTitle aria-describedby="desc">Title</CardTitle>);
      expect(screen.getByRole('heading')).toHaveAttribute('aria-describedby', 'desc');
    });
  });
});
