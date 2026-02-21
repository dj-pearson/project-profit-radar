import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── Badge ──────────────────────────────────────────────────────────────────

import { Badge } from '../ui/badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-primary');
  });

  it('applies destructive variant classes', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('applies outline variant classes', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    expect(container.firstChild).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<Badge className="mt-4">Custom</Badge>);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});

// ─── Alert ──────────────────────────────────────────────────────────────────

import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

describe('Alert', () => {
  it('renders with role="alert"', () => {
    render(<Alert>Content</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders default variant', () => {
    render(<Alert>Default alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-background');
  });

  it('renders destructive variant', () => {
    render(<Alert variant="destructive">Error</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-destructive/50');
  });

  it('renders title and description', () => {
    render(
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Something happened</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Alert className="mb-4">Alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('mb-4');
  });
});

// ─── LoadingSpinner ─────────────────────────────────────────────────────────

import { LoadingSpinner, LoadingState } from '../ui/loading-spinner';

describe('LoadingSpinner', () => {
  it('renders with default md size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders sm size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('renders lg size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('applies animate-spin class', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toHaveClass('animate-spin');
  });

  it('merges custom className', () => {
    const { container } = render(<LoadingSpinner className="text-blue-500" />);
    expect(container.firstChild).toHaveClass('text-blue-500');
  });
});

describe('LoadingState', () => {
  it('renders default loading message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingState message="Saving changes..." />);
    expect(screen.getByText('Saving changes...')).toBeInTheDocument();
  });
});

// ─── ProgressIndicator ──────────────────────────────────────────────────────

import { ProgressStep, ProgressIndicator, FileUploadProgress } from '../ui/progress-indicator';

describe('ProgressStep', () => {
  it('renders label text', () => {
    render(<ProgressStep label="Step 1" status="pending" />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ProgressStep label="Step 1" status="pending" description="Waiting..." />);
    expect(screen.getByText('Waiting...')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<ProgressStep label="Step 1" status="pending" />);
    const descriptions = container.querySelectorAll('.text-xs');
    expect(descriptions).toHaveLength(0);
  });

  it('applies green color for completed status', () => {
    render(<ProgressStep label="Done" status="completed" />);
    expect(screen.getByText('Done')).toHaveClass('text-green-600');
  });

  it('applies red color for error status', () => {
    render(<ProgressStep label="Failed" status="error" />);
    expect(screen.getByText('Failed')).toHaveClass('text-red-600');
  });

  it('applies muted color for pending status', () => {
    render(<ProgressStep label="Waiting" status="pending" />);
    expect(screen.getByText('Waiting')).toHaveClass('text-muted-foreground');
  });
});

describe('ProgressIndicator', () => {
  it('renders all steps', () => {
    const steps = [
      { label: 'Step 1', status: 'completed' as const },
      { label: 'Step 2', status: 'loading' as const },
      { label: 'Step 3', status: 'pending' as const },
    ];
    render(<ProgressIndicator steps={steps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('renders empty when no steps', () => {
    const { container } = render(<ProgressIndicator steps={[]} />);
    expect(container.querySelector('.space-y-2')?.children).toHaveLength(0);
  });
});

describe('FileUploadProgress', () => {
  it('renders file name and progress', () => {
    render(<FileUploadProgress fileName="document.pdf" progress={50} status="uploading" />);
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows error message on error status', () => {
    render(<FileUploadProgress fileName="doc.pdf" progress={30} status="error" />);
    expect(screen.getByText('Upload failed. Please try again.')).toBeInTheDocument();
  });

  it('does not show error message on uploading status', () => {
    render(<FileUploadProgress fileName="doc.pdf" progress={30} status="uploading" />);
    expect(screen.queryByText('Upload failed. Please try again.')).not.toBeInTheDocument();
  });

  it('does not show error message on completed status', () => {
    render(<FileUploadProgress fileName="doc.pdf" progress={100} status="completed" />);
    expect(screen.queryByText('Upload failed. Please try again.')).not.toBeInTheDocument();
  });
});

// ─── EmptyState ─────────────────────────────────────────────────────────────

import { EmptyState } from '../ui/EmptyStates';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Nothing here yet" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        description="Create one"
        action={{ label: 'Create', onClick }}
      />
    );
    const btn = screen.getByText('Create');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        description="Try something"
        secondaryAction={{ label: 'Import', onClick }}
      />
    );
    const btn = screen.getByText('Import');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action when not provided', () => {
    render(<EmptyState title="Empty" description="Nothing" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <EmptyState title="Empty" description="Nothing" icon={<span data-testid="icon">!</span>} />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
